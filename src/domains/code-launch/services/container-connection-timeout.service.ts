import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import Docker from 'dockerode';
import { DOCKER_CLIENT } from '@common/adapters/docker';

interface ContainerAttachedEvent {
    containerId: string;
}

/**
 * NOTE: 컨테이너 생성 후 클라이언트가 PTY 연결을 하지 않는 경우, 자동으로 컨테이너를 종료하는 서비스
 * 컨테이너 생성 시 5초 타이머를 시작하고, 클라이언트가 연결되면 타이머를 취소한다.
 */
@Injectable()
export class ContainerConnectionTimeoutService {
    private readonly logger = new Logger(ContainerConnectionTimeoutService.name);
    private readonly timers = new Map<string, NodeJS.Timeout>();
    private readonly TIMEOUT_MS = 5_000;

    constructor(@Inject(DOCKER_CLIENT) private readonly docker: Docker) {}

    /**
     * NOTE: 컨테이너 생성 직후 호출. 5초 내 PTY 연결이 없으면 컨테이너 종료
     * @param containerId 모니터링할 컨테이너 ID
     */
    startTimer(containerId: string): void {
        const timer = setTimeout(() => {
            this.timers.delete(containerId);
            this.logger.warn(
                `No PTY connection within ${this.TIMEOUT_MS}ms — stopping container (id: ${containerId})`,
            );
            void this.stopContainer(containerId);
        }, this.TIMEOUT_MS);

        this.timers.set(containerId, timer);
        this.logger.log(`Connection timeout timer started (id: ${containerId})`);
    }

    /**
     * NOTE: 클라이언트가 PTY 소켓에 연결되면 타이머 취소
     * 해당 이벤트는 TerminalSessionGateway에서 컨테이너에 attach 성공 시 emit함
     */
    @OnEvent('container.attached')
    cancelTimer({ containerId }: ContainerAttachedEvent): void {
        const timer = this.timers.get(containerId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(containerId);
            this.logger.log(`Connection timeout timer cancelled (id: ${containerId})`);
        }
    }

    /**
     * NOTE: Docker 컨테이너 종료
     * @param containerId 종료할 컨테이너 ID
     */
    private async stopContainer(containerId: string): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId);
            await container.stop();
            this.logger.log(`Container stopped by timeout (id: ${containerId})`);
        } catch (error) {
            this.logger.error(`Failed to stop container ${containerId}`, error);
        }
    }
}
