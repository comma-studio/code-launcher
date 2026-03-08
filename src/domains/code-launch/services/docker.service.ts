import { Inject, Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import { DOCKER_CLIENT } from '@common/adapters/docker';
import { DOCKER_IMAGE_MAP } from '../common/constants/docker-image-map.constant';

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
     * @returns 컨테이너 정보
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async createAndStartContainer(codeLanguage: string, code: string): Promise<Docker.Container> {
        try {
            const imageName = DOCKER_IMAGE_MAP[codeLanguage.toLowerCase()] || 'ubuntu:22.04';

            this.logger.log(`Creating container with image: ${imageName}`);

            // NOTE: 이미지가 로컬에 없으면 pull
            await this.pullImageIfNotExists(imageName);

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

            // NOTE: 컨테이너 정보 로깅
            this.logger.log('=== Container Created Successfully ===');
            this.logger.log(`Container ID: ${containerInfo.Id}`);
            this.logger.log(`Container Name: ${containerInfo.Name}`);
            this.logger.log(`Image: ${containerInfo.Config.Image}`);
            this.logger.log(`Status: ${containerInfo.State.Status}`);
            this.logger.log(`Started At: ${containerInfo.State.StartedAt}`);
            this.logger.log(
                `Container will auto-stop after ${this.CONTAINER_TIMEOUT_SECONDS} seconds`,
            );
            this.logger.log('=====================================');

            return container;
        } catch (error) {
            this.logger.error('Failed to create and start container', error);
            throw error;
        }
    }

    /**
     * NOTE: Docker 이미지가 로컬에 없으면 pull
     * @param imageName 이미지 이름
     */
    private async pullImageIfNotExists(imageName: string): Promise<void> {
        try {
            const images = await this.docker.listImages();
            const imageExists = images.some((image) =>
                image.RepoTags?.some((tag) => tag === imageName),
            );

            if (!imageExists) {
                this.logger.log(`Pulling image: ${imageName}`);
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
                                        this.logger.log(`Successfully pulled image: ${imageName}`);
                                        resolve();
                                    }
                                },
                                (event: PullEvent) => {
                                    // NOTE: Pull 진행 상황 로깅 (optional)
                                    if (event.status) {
                                        this.logger.debug(
                                            `${event.status} ${event.progress || ''}`,
                                        );
                                    }
                                },
                            );
                        },
                    );
                });
            }
        } catch (error) {
            this.logger.error(`Failed to pull image: ${imageName}`, error);
            throw error;
        }
    }
}
