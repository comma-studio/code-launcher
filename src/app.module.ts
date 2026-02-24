import { Module } from '@nestjs/common';

import { AppConfigModule } from '@common/configs/modules/app-config.module';
import { BullMQModule } from '@common/adapters/bullmq';

import { CodeLaunchModule } from './domains/code-launch/code-launch.module';
import { TerminalSessionModule } from './domains/terminal-session/terminal-session.module';

@Module({
    imports: [
        // NOTE: Config 모듈 설정
        AppConfigModule,
        // NOTE: BullMQ 모듈 설정
        BullMQModule,
        // NOTE: CodeLaunch 모듈 설정
        CodeLaunchModule,
        // NOTE: TerminalSession 모듈 설정
        TerminalSessionModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
