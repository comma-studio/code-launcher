import { Module, DynamicModule } from '@nestjs/common';
import { BullModule, RegisterQueueOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { QueueConfig } from '../schemas/queue-config.schema';

/**
 * NOTE: ConfigService를 통해 BullMQ Queue 옵션 로드
 */
const loadOptions = (name: string, configService: ConfigService): RegisterQueueOptions => {
    // NOTE: BULLMQ_QUEUE_CONFIG 불러오기
    const queueConfig: QueueConfig = configService.getOrThrow<QueueConfig>('BULLMQ_QUEUE_CONFIG');

    return {
        name,
        defaultJobOptions: {
            attempts: queueConfig.RETRY_ATTEMPTS,
            removeOnComplete: queueConfig.REMOVE_ON_COMPLETE,
            removeOnFail: queueConfig.REMOVE_ON_FAIL,
        },
    };
};

/**
 * NOTE: Queue Register Module
 * BullMQ Queue를 동적으로 등록하는 Dynamic Module
 */
@Module({})
export class QueueRegisterModule {
    static register(name: string): DynamicModule {
        return {
            module: QueueRegisterModule,
            imports: [
                BullModule.registerQueueAsync({
                    name,
                    inject: [ConfigService],
                    useFactory: (configService: ConfigService) => loadOptions(name, configService),
                }),
            ],
            exports: [BullModule],
        };
    }
}
