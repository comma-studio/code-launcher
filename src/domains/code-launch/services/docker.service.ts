import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { DOCKER_CLIENT } from '@common/adapters/docker';
import { CatchError } from '@common/decorators/catch-error.decorator';
import { DOCKER_IMAGE_MAP } from '../common/constants/docker-image-map.constant';
import { ErrorCode } from '@common/enums/error-code.enum';

interface PullEvent {
    status?: string;
    progress?: string;
}

/**
 * NOTE: Docker 컨테이너를 생성하고 관리하는 Service
 */
@Injectable()
export class DockerService {
    // NOTE: 로깅을 위한 Logger 인스턴스
    private readonly logger = new Logger(DockerService.name);
    // NOTE: 컨테이너 자동 종료 시간 설정 (초 단위)
    private readonly CONTAINER_TIMEOUT_SECONDS = 2 * 60;

    constructor(@Inject(DOCKER_CLIENT) private readonly docker: Docker) {}

    /**
     * NOTE: 코드 실행을 위한 Docker 컨테이너 생성 및 시작
     * @param codeLanguage 프로그래밍 언어
     * @param code 실행할 코드 (추후 컨테이너에 주입 예정)
     * @param jobId BullMQ Job ID (로그 추적용)
     * @returns 컨테이너 ID
     */
    @CatchError(ErrorCode.CONTAINER_CREATE_FAILED)
    async createAndStartContainer(
        codeLanguage: string,
        _code: string,
        jobId: string,
    ): Promise<string> {
        const imageName = DOCKER_IMAGE_MAP[codeLanguage.toLowerCase()] || 'ubuntu:22.04';

        // NOTE: 이미지가 로컬에 없으면 pull
        await this.pullImageIfNotExists(imageName, jobId);

        // NOTE: 컨테이너 생성
        const container = await this.docker.createContainer({
            Image: imageName,
            // NOTE: 컨테이너가 일정 시간 후 종료되도록 sleep 명령어 사용
            Cmd: ['/bin/sh', '-c', `sleep ${this.CONTAINER_TIMEOUT_SECONDS}`],
            Tty: true,
            HostConfig: {
                AutoRemove: true, // NOTE: 컨테이너 종료 시 자동 삭제
            },
        });

        // NOTE: 컨테이너 시작
        await container.start();

        // NOTE: 컨테이너 정보 조회
        const containerInfo = await container.inspect();

        this.logger.log(
            `Created and started container - jobId: ${jobId}, ID: ${containerInfo.Id}, Image: ${imageName}`,
        );

        return containerInfo.Id;
    }

    /**
     * NOTE: Docker 이미지가 로컬에 없으면 pull
     * @param imageName 이미지 이름
     * @param jobId BullMQ Job ID (로그 추적용)
     */
    @CatchError(ErrorCode.IMAGE_PULL_FAILED)
    private async pullImageIfNotExists(imageName: string, jobId: string): Promise<void> {
        const images = await this.docker.listImages();
        const imageExists = images.some((image) =>
            image.RepoTags?.some((tag) => tag === imageName),
        );

        if (!imageExists) {
            this.logger.debug(`[jobId: ${jobId}] Pulling image: ${imageName}`);
            await new Promise<void>((resolve, reject) => {
                void this.docker.pull(
                    imageName,
                    (err: Error | null, stream: NodeJS.ReadableStream) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        this.docker.modem.followProgress(
                            stream,
                            (err: Error | null) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    this.logger.log(
                                        `[jobId: ${jobId}] Successfully pulled image: ${imageName}`,
                                    );
                                    resolve();
                                }
                            },
                            (event: PullEvent) => {
                                // NOTE: Pull 진행 상황 로깅 (optional)
                                if (event.status) {
                                    this.logger.debug(`${event.status} ${event.progress || ''}`);
                                }
                            },
                        );
                    },
                );
            });
        }
    }
}
