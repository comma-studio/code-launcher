import { Module } from '@nestjs/common';

import { QueueRegisterModule } from '@common/adapters/bullmq';

import { CodeLaunchRequestProcessor } from './processors/code-launch-request.processor';
import { DockerService } from './services/docker.service';
import { CodeLaunchResponseService } from './services/code-launch-response.service';

@Module({
    imports: [
        // NOTE: BullMQ Queue 등록
        QueueRegisterModule.register('code-launch-requests'),
        QueueRegisterModule.register('code-launch-responses'),
    ],
    providers: [
        // NOTE: Job을 처리하기 위한 Processor 등록
        CodeLaunchRequestProcessor,
        // NOTE: Docker 컨테이너 관리 서비스
        DockerService,
        // NOTE: Code Launch 응답 전송 서비스
        CodeLaunchResponseService,
    ],
})
export class CodeLaunchModule {}
