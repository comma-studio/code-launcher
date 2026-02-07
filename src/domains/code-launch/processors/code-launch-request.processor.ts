import { Job } from 'bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';

import { CodeLaunchRequestController } from '../controllers/code-launch-request.controller';

import { CodeLaunchRequestJob } from '../common/interfaces/code-launch-request-job.interface';

/**
 * NOTE: BullMQ로부터 들어오는 코드 실행 요청을 처리하는 Processor
 */
@Processor('code-launch-requests')
export class CodeLaunchRequestProcessor extends WorkerHost {
    constructor(
        // NOTE: CodeLaunchRequestController 주입
        private readonly codeLaunchRequestController: CodeLaunchRequestController,
    ) {
        super();
    }

    // NOTE: Job 처리 메서드
    process(job: Job<CodeLaunchRequestJob>): any {
        switch (job?.name) {
            // NOTE: 코드 실행 요청 처리
            case 'launch':
                this.codeLaunchRequestController.launch(job.data);
                break;
            default:
                return;
        }
    }
}
