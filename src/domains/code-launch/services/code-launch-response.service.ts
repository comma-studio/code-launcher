import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

import { WSConnectionConfig } from '@common/adapters/socket';

import { CodeLaunchStatus } from '../common/interfaces/code-launch-response-job.interface';
import { ErrorCode } from '@common/enums/error-code.enum';

/**
 * NOTE: Code Launch 응답을 BullMQ를 통해 Backend로 전송하는 Service
 */
@Injectable()
export class CodeLaunchResponseService {
    private readonly logger = new Logger(CodeLaunchResponseService.name);
    // NOTE: WebSocket 접속 URL
    private readonly wsUrl: string;

    constructor(
        @InjectQueue('code-launch-responses')
        private readonly codeLaunchResponsesQueue: Queue,
        private readonly configService: ConfigService,
    ) {
        // NOTE: WS_CONNECTION 설정으로부터 wsUrl 생성
        const wsConfig = this.configService.getOrThrow<WSConnectionConfig>('WS_CONNECTION');
        this.wsUrl = `${wsConfig.PROTOCOL}://${wsConfig.URL}`;
    }

    /**
     * NOTE: 컨테이너 생성 성공 응답 전송
     * @param clientSocketId 클라이언트 소켓 ID
     * @param containerId 생성된 컨테이너 ID
     * @param jobId BullMQ Job ID (로그 추적용)
     */
    async sendSuccessResponse(
        clientSocketId: string,
        containerId: string,
        jobId: string,
    ): Promise<void> {
        await this.codeLaunchResponsesQueue.add('launched', {
            status: CodeLaunchStatus.SUCCESS,
            clientSocketId,
            connection: {
                wsUrl: this.wsUrl,
            },
            container: {
                id: containerId,
                accessToken: '', // TODO: 컨테이너 접근 토큰 생성 로직 추가 예정
            },
        });

        this.logger.log(
            `Sent success response - jobId: ${jobId}, clientSocketId: ${clientSocketId}, containerId: ${containerId}`,
        );
    }

    /**
     * NOTE: 컨테이너 생성 실패 응답 전송
     * @param clientSocketId 클라이언트 소켓 ID
     * @param errorCode 에러 코드
     * @param jobId BullMQ Job ID (로그 추적용)
     * @param error 원본 에러 객체
     */
    async sendErrorResponse(
        clientSocketId: string,
        errorCode: ErrorCode,
        jobId: string,
        error?: Error,
    ): Promise<void> {
        await this.codeLaunchResponsesQueue.add('launched', {
            status: CodeLaunchStatus.ERROR,
            clientSocketId,
            error: {
                code: errorCode,
                message: error?.message ?? '',
            },
        });

        this.logger.error(
            `Sent error response - jobId: ${jobId}, clientSocketId: ${clientSocketId}, errorCode: ${errorCode}, error: ${error ?? 'Unknown error'}`,
            error?.stack,
        );
    }
}
