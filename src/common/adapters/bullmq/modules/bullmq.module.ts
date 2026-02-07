import { Module } from '@nestjs/common';
import { QueueOptions } from 'bullmq';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { RedisConfig } from '@common/adapters/redis';

/**
 * NOTE: Config Module에서 Redis 설정을 로드하여 Options을 반환하는 팩토리 함수
 */
const loadOptions = (configService: ConfigService): QueueOptions => {
    // NOTE: Redis 설정 가져오기
    const redisConfig: RedisConfig = configService.getOrThrow<RedisConfig>('REDIS');

    return {
        connection: {
            host: redisConfig.HOST,
            port: redisConfig.PORT,
            username: redisConfig.USERNAME,
            password: redisConfig.PASSWORD,
        },
    };
};

/**
 * NOTE: BullMQ Module
 * Redis 설정을 기반으로 BullMQ를 구성하는 정적 모듈
 */
@Module({
    imports: [
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: loadOptions,
        }),
    ],
    exports: [BullModule],
})
export class BullMQModule {}
