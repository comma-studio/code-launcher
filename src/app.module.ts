import { Module } from '@nestjs/common';

import { AppConfigModule } from '@common/configs/modules/app-config.module';
import { BullMQModule } from '@common/adapters/bullmq';

@Module({
    imports: [
        // NOTE: Config 모듈 설정
        AppConfigModule,
        // NOTE: BullMQ 모듈 설정
        BullMQModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
