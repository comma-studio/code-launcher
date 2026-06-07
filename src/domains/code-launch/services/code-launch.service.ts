import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import * as tar from 'tar-stream';
import { DOCKER_CLIENT } from '@common/adapters/docker';
import { CatchError } from '@common/decorators/catch-error.decorator';
import { ErrorCode } from '@common/enums/error-code.enum';

export class CompileError extends Error {
    constructor(public readonly stderr: string) {
        super(`Compile failed: ${stderr}`);
    }
}

/**
 * NOTE: 코드 주입, 컴파일, 컨테이너 제거를 담당하는 Service
 */
@Injectable()
export class CodeLaunchService {
    private readonly logger = new Logger(CodeLaunchService.name);

    constructor(@Inject(DOCKER_CLIENT) private readonly docker: Docker) {}

    /**
     * NOTE: tar-stream으로 코드 파일을 컨테이너 /workspace에 주입
     * @param containerId 대상 컨테이너 ID
     * @param fileName 생성할 파일명
     * @param code 파일 내용
     */
    @CatchError(ErrorCode.CODE_INJECT_FAILED)
    async injectCode(containerId: string, fileName: string, code: string): Promise<void> {
        const pack = tar.pack();
        pack.entry({ name: fileName }, code);
        pack.finalize();

        const tarBuffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            pack.on('data', (chunk: Buffer) => chunks.push(chunk));
            pack.on('end', () => resolve(Buffer.concat(chunks)));
            pack.on('error', reject);
        });

        const container = this.docker.getContainer(containerId);
        await container.putArchive(tarBuffer, { path: '/workspace' });

        this.logger.log(`Code injected — container: ${containerId}, file: ${fileName}`);
    }

    /**
     * NOTE: 컨테이너 내에서 컴파일 명령어 실행
     * @param containerId 대상 컨테이너 ID
     * @param compileCmd 컴파일 명령어
     * @throws CompileError exitCode !== 0인 경우
     */
    @CatchError(ErrorCode.CODE_COMPILE_FAILED)
    async compile(containerId: string, compileCmd: string): Promise<void> {
        const container = this.docker.getContainer(containerId);

        const exec = await container.exec({
            Cmd: ['sh', '-c', compileCmd],
            WorkingDir: '/workspace',
            AttachStdout: true,
            AttachStderr: true,
        });

        const stream = await exec.start({ hijack: false, stdin: false });

        const stderr = await new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk: Buffer) => {
                // NOTE: dockerode demux — 첫 번째 바이트가 stream type (1=stdout, 2=stderr)
                if (chunk.length > 8) {
                    chunks.push(chunk.subarray(8));
                }
            });
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            stream.on('error', reject);
        });

        const inspectResult = await exec.inspect();
        if (inspectResult.ExitCode !== 0) {
            throw new CompileError(stderr);
        }

        this.logger.log(`Compile succeeded — container: ${containerId}`);
    }

    /**
     * NOTE: 컴파일 실패 시 컨테이너 정리
     * @param containerId 제거할 컨테이너 ID
     */
    async removeContainer(containerId: string): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId);
            await container.stop();
        } catch (error) {
            // NOTE: AutoRemove: true이므로 stop()으로 충분, 이미 종료된 경우 무시
            this.logger.warn(
                `Container stop skipped (may already be removed): ${containerId} ${error}`,
            );
        }
    }
}
