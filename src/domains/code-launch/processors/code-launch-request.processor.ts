import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';

import { CodeLaunchRequestController } from '../controllers/code-launch-request.controller';

import { CodeLaunchRequestJob } from '../common/interfaces/code-launch-request-job.interface';

/**
 * NOTE: BullMQ로부터 들어오는 코드 실행 요청을 처리하는 Processor
 */
@Processor('code-launch-requests')
export class CodeLaunchRequestProcessor extends WorkerHost {
    private readonly logger = new Logger(CodeLaunchRequestProcessor.name);

    constructor(
        // NOTE: CodeLaunchRequestController 주입
        private readonly codeLaunchRequestController: CodeLaunchRequestController,
    ) {
        super();
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
    onFailed(job: Job, error: Error): void {
        this.logger.error(
            `Job failed - [${job.name}] (id: ${job.id}) | attempt: ${job.attemptsMade} | ${error.message}`,
            error.stack,
        );
    }

    // NOTE: Job 처리 메서드
    async process(job: Job<CodeLaunchRequestJob>): Promise<void> {
        switch (job?.name) {
            // NOTE: 코드 실행 요청 처리
            case 'launch':
                await this.codeLaunchRequestController.launch(job.data);
                break;
            default:
                this.logger.warn(`Job unknown - [${job.name}] (id: ${job.id})`);
                return;
        }
    }
}
