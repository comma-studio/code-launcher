import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { QueueConfig } from '@common/adapters/bullmq';

import { CodeLaunchRequestJob } from '../common/interfaces/code-launch-request-job.interface';
import { ErrorCode } from '@common/enums/error-code.enum';
import { DockerService } from '../services/docker.service';
import { CodeLaunchResponseService } from '../services/code-launch-response.service';

/**
 * NOTE: BullMQ로부터 들어오는 코드 실행 요청을 처리하는 Processor
 */
@Processor('code-launch-requests')
export class CodeLaunchRequestProcessor extends WorkerHost {
    private readonly logger = new Logger(CodeLaunchRequestProcessor.name);
    // NOTE: 최대 재시도 횟수
    private readonly maxAttempts: number;

    constructor(
        // NOTE: DockerService 주입
        private readonly dockerService: DockerService,
        // NOTE: CodeLaunchResponseService 주입
        private readonly codeLaunchResponseService: CodeLaunchResponseService,
        private readonly configService: ConfigService,
    ) {
        super();

        this.maxAttempts =
            this.configService.getOrThrow<QueueConfig>('BULLMQ_QUEUE_CONFIG').RETRY_ATTEMPTS;
    }

    @OnWorkerEvent('active')
    onActive(job: Job): void {
        this.logger.log(`Job started - [${job.name}] (id: ${job.id})`);
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job): void {
        this.logger.log(`Job completed - [${job.name}] (id: ${job.id})`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<CodeLaunchRequestJob>, error: Error): void {
        this.logger.error(
            `Job failed - [${job.name}] (id: ${job.id}) | attempt: ${job.attemptsMade} | ${error.message}`,
            error.stack,
        );

        // NOTE: 최종 실패 시 클라이언트에게 에러 응답 전송 (Job에 명시된 attempts 옵션이 없는 경우 기본 maxAttempts 사용)
        if (job.attemptsMade >= (job.opts.attempts ?? this.maxAttempts)) {
            const jobId = job.id ?? 'unknown';
            void this.codeLaunchResponseService.sendErrorResponse(
                job.data.clientSocketId,
                ErrorCode.JOB_PROCESSING_FAILED,
                jobId,
                error,
            );
        }
    }

    // NOTE: Job 처리 메서드
    async process(job: Job<CodeLaunchRequestJob>): Promise<void> {
        const jobId = job.id ?? 'unknown';

        switch (job?.name) {
            // NOTE: 코드 실행 요청 처리
            case 'launch':
                await this.launch(job.data, jobId);
                break;
            default:
                this.logger.warn(`Job unknown - [${job.name}] (id: ${jobId})`);
                void this.codeLaunchResponseService.sendErrorResponse(
                    job.data.clientSocketId,
                    ErrorCode.JOB_UNKNOWN,
                    jobId,
                    new Error(`Unknown job name: ${job.name}`),
                );
        }
    }

    // NOTE: 코드 실행 요청 처리 메서드
    private async launch(job: CodeLaunchRequestJob, jobId: string): Promise<void> {
        // NOTE: Docker 컨테이너 생성 및 시작
        const containerId = await this.dockerService.createAndStartContainer(
            job.codeLanguage,
            job.code,
            jobId,
        );

        // NOTE: 성공 응답 전송
        await this.codeLaunchResponseService.sendSuccessResponse(
            job.clientSocketId,
            containerId,
            jobId,
        );
    }
}
