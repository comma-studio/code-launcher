import { Type } from 'class-transformer';
import { IsObject } from 'class-validator';

import { RedisConfig } from '@common/adapters/redis';
import { QueueConfig } from '@common/adapters/bullmq';
import { WSConnectionConfig } from '@common/adapters/socket';

/**
 * NOTE: App Config 스키마
 */
export class AppConfig {
    @IsObject()
    @Type(() => RedisConfig)
    REDIS: RedisConfig;

    @IsObject()
    @Type(() => QueueConfig)
    BULLMQ_QUEUE_CONFIG: QueueConfig;

    @IsObject()
    @Type(() => WSConnectionConfig)
    WS_CONNECTION: WSConnectionConfig;
}
