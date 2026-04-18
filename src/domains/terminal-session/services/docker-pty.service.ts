import { Inject, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import Docker from 'dockerode';
import { Duplex } from 'stream';
import { DOCKER_CLIENT } from '@common/adapters/docker';

interface PtySession {
    exec: Docker.Exec;
    stream: Duplex;
    containerId: string;
}

/**
 * NOTE: Docker 컨테이너에 exec PTY 세션을 열고 관리하는 Service
 */
@Injectable()
export class DockerPtyService {
    private readonly logger = new Logger(DockerPtyService.name);
    // NOTE: socketId → PtySession 매핑
    private readonly sessions = new Map<string, PtySession>();

    constructor(@Inject(DOCKER_CLIENT) private readonly docker: Docker) {}

    /**
     * NOTE: 특정 컨테이너에 PTY exec 세션을 열고 소켓과 스트림을 연결
     *       컨테이너 라벨 'comma.run-cmd'로 실행 명령어를 결정하며, 라벨이 없으면 예외 발생
     * @param socket 클라이언트 소켓
     * @param containerId 연결할 컨테이너 ID
     * @param size 터미널 초기 크기
     */
    async openSession(
        socket: Socket,
        containerId: string,
        size: { cols: number; rows: number },
    ): Promise<void> {
        try {
            // NOTE: 기존 세션이 있으면 정리
            if (this.sessions.has(socket.id)) {
                await this.closeSession(socket.id);
            }

            // NOTE: 컨테이너 인스턴스 가져오기
            const container = this.docker.getContainer(containerId);

            // NOTE: 컨테이너 상태 및 라벨 확인
            const containerInfo = await container.inspect();
            if (!containerInfo.State.Running) {
                throw new Error(`Container ${containerId} is not running`);
            }

            // NOTE: 컨테이너 라벨에서 runCmd 읽기 — 없으면 보안상 예외 발생
            const runCmd = containerInfo.Config.Labels?.['comma.run-cmd'];
            if (!runCmd) {
                throw new Error(`Container ${containerId} is missing required label 'comma.run-cmd'`);
            }
            const cmd = runCmd.split(' ');

            // NOTE: TTY exec 인스턴스 생성
            const exec = await container.exec({
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                Tty: true,
                Cmd: cmd,
                WorkingDir: '/workspace',
                Env: ['TERM=xterm-256color', 'LANG=en_US.UTF-8'],
                ConsoleSize: [size.cols, size.rows],
            });

            // NOTE: exec 스트림 시작
            const stream = await exec.start({
                hijack: true,
                stdin: true,
            });

            // NOTE: 컨테이너 출력 → 클라이언트 전송
            stream.on('data', (chunk: Buffer) => {
                socket.emit('output', chunk.toString());
            });

            // NOTE: 스트림 종료 시 세션 정리
            stream.on('close', () => {
                // NOTE: 세션이 이미 정리되었을 수 있으므로 존재 여부 확인
                if (!this.sessions.has(socket.id)) return;

                socket.emit('exit');
                this.sessions.delete(socket.id);
                this.logger.log(`PTY stream closed (socket: ${socket.id})`);
            });

            stream.on('error', (err: Error) => {
                this.logger.error(`PTY stream error (socket: ${socket.id}): ${err.message}`);
                socket.emit('error', err.message);
            });

            this.sessions.set(socket.id, { exec, stream, containerId });

            this.logger.log(`PTY session opened — container: ${containerId}, socket: ${socket.id}`);
        } catch (error) {
            this.logger.error(`Failed to open PTY session for container ${containerId}`, error);
            throw error;
        }
    }

    /**
     * NOTE: 클라이언트 입력을 컨테이너 stdin으로 전달
     * @param socketId 소켓 ID
     * @param data 사용자 입력 데이터
     */
    writeToSession(socketId: string, data: string): void {
        const session = this.sessions.get(socketId);
        if (session) {
            session.stream.write(data);
        }
    }

    /**
     * NOTE: 터미널 크기 변경 요청을 exec에 전달
     * @param socketId 소켓 ID
     * @param size 변경할 터미널 크기
     */
    async resizeSession(socketId: string, size: { cols: number; rows: number }): Promise<void> {
        const session = this.sessions.get(socketId);
        if (session) {
            await session.exec.resize({ h: size.rows, w: size.cols });
        }
    }

    /**
     * NOTE: PTY 세션 종료 및 정리. 연결된 컨테이너도 함께 종료
     * @param socketId 소켓 ID
     */
    async closeSession(socketId: string): Promise<void> {
        const session = this.sessions.get(socketId);
        if (session) {
            this.sessions.delete(socketId);
            session.stream.destroy();
            await this.docker.getContainer(session.containerId).stop();
            this.logger.log(`PTY session closed (socket: ${socketId})`);
        }
    }
}
