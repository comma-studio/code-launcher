import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

import { WSConnectionConfig } from '@common/adapters/socket';

import { CodeLaunchStatus } from '../common/interfaces/code-launch-response-job.interface';

/**
 * NOTE: Code Launch 응답을 BullMQ를 통해 Backend로 전송하는 Service
 */
@Injectable()
export class CodeLaunchResponseService {
    private readonly logger = new Logger(CodeLaunchResponseService.name);
    // NOTE: WebSocket 접속 오리진 (protocol://host)
    private readonly wsOrigin: string;
    // NOTE: WebSocket 접속 경로 (/privateIp/port)
    private readonly wsPath: string;

    constructor(
        @InjectQueue('code-launch-responses')
        private readonly codeLaunchResponsesQueue: Queue,
        private readonly configService: ConfigService,
    ) {
        const wsConfig = this.configService.getOrThrow<WSConnectionConfig>('WS_CONNECTION');

        const port = Number(process.env.PORT ?? 4000);
        this.wsOrigin = this.buildWsOrigin(wsConfig, port);
        this.wsPath = this.buildWsPath(wsConfig, port);
    }

    /**
     * NOTE: WebSocket 접속 오리진 생성 (protocol://host)
     * - 운영 환경: protocol://프록시 호스트
     * - 개발 환경: protocol://localhost:{port}
     */
    private buildWsOrigin(wsConfig: WSConnectionConfig, port: number): string {
        if (process.env.NODE_ENV === 'production') {
            if (!wsConfig.PROXY_HOST) {
                throw new Error('WS_CONNECTION.PROXY_HOST is required in production');
            }
            return `${wsConfig.PROTOCOL}://${wsConfig.PROXY_HOST}`;
        }
        return `${wsConfig.PROTOCOL}://localhost:${port}`;
    }

    /**
     * NOTE: WebSocket 접속 경로 생성 (/privateIp/port/socket.io)
     * - 운영 환경: 프록시가 특정 Code Launcher 인스턴스로 라우팅하기 위한 경로
     * - 개발 환경: 빈 문자열
     */
    private buildWsPath(_wsConfig: WSConnectionConfig, port: number): string {
        if (process.env.NODE_ENV === 'production') {
            const privateIp = process.env.PRIVATE_IP;
            return `/${privateIp}/${port}/socket.io`;
        }
        return '';
    }

    /**
     * NOTE: 컨테이너 생성 성공 응답 전송
     * @param clientSocketId 클라이언트 소켓 ID
     * @param containerId 생성된 컨테이너 ID
     */
    async sendSuccessResponse(clientSocketId: string, containerId: string): Promise<void> {
        await this.codeLaunchResponsesQueue.add('launched', {
            status: CodeLaunchStatus.SUCCESS,
            clientSocketId,
            connection: {
                origin: this.wsOrigin,
                path: this.wsPath,
            },
            container: {
                id: containerId,
                accessToken: '', // TODO: 컨테이너 접근 토큰 생성 로직 추가 예정
            },
        });

        this.logger.log(
            `Sent success response - clientSocketId: ${clientSocketId}, containerId: ${containerId}`,
        );
    }

    /**
     * NOTE: 컨테이너 생성 실패 응답 전송
     * @param clientSocketId 클라이언트 소켓 ID
     */
    async sendErrorResponse(clientSocketId: string, error?: Error): Promise<void> {
        await this.codeLaunchResponsesQueue.add('launched', {
            status: CodeLaunchStatus.ERROR,
            clientSocketId,
            error: {
                code: '', // TODO: 에러 코드 추가 예정
                message: error?.message ?? '',
            },
        });

        this.logger.log(
            `Sent error response - clientSocketId: ${clientSocketId}, error: ${error?.message ?? 'Unknown error'}`,
        );
    }
}
