import { Module } from '@nestjs/common';

import { QueueRegisterModule } from '@common/adapters/bullmq';
import { TerminalSessionModule } from '../terminal-session/terminal-session.module';

import { CodeLaunchRequestProcessor } from './processors/code-launch-request.processor';
import { DockerService } from './services/docker.service';
import { CodeLaunchService } from './services/code-launch.service';
import { CodeLaunchResponseService } from './services/code-launch-response.service';

@Module({
    imports: [
        // NOTE: BullMQ Queue 등록
        QueueRegisterModule.register('code-launch-requests'),
        QueueRegisterModule.register('code-launch-responses'),
        // NOTE: DockerPtyService 공유를 위해 TerminalSessionModule import
        TerminalSessionModule,
    ],
    providers: [
        // NOTE: Job을 처리하기 위한 Processor 등록
        CodeLaunchRequestProcessor,
        // NOTE: Docker 컨테이너 관리 서비스
        DockerService,
        // NOTE: 코드 주입 및 컴파일 서비스
        CodeLaunchService,
        // NOTE: Code Launch 응답 전송 서비스
        CodeLaunchResponseService,
    ],
})
export class CodeLaunchModule {}
