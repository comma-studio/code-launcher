import { Module } from '@nestjs/common';

import { QueueRegisterModule } from '@common/adapters/bullmq';

import { CodeLaunchRequestProcessor } from './processors/code-launch-request.processor';
import { CodeLaunchRequestController } from './controllers/code-launch-request.controller';
import { DockerService } from './services/docker.service';

@Module({
    imports: [
        // NOTE: BullMQ Queue 등록
        QueueRegisterModule.register('code-launch-requests'),
    ],
    providers: [
        // NOTE: Job을 처리하기 위한 Processor 등록
        CodeLaunchRequestProcessor,
        // NOTE: Processor로부터 요청을 받는 Controller
        CodeLaunchRequestController,
        // NOTE: Docker 컨테이너 관리 서비스
        DockerService,
    ],
})
export class CodeLaunchModule {}
