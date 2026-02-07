import { IsObject } from 'class-validator';

import { RedisConfig } from '@common/adapters/redis';
import { QueueConfig } from '@common/adapters/bullmq';

/**
 * NOTE: App Config 스키마
 */
export class AppConfig {
    @IsObject()
    REDIS: RedisConfig;

    @IsObject()
    BULLMQ_QUEUE_CONFIG: QueueConfig;
}
