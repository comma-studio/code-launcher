import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class RedisConfig {
    // NOTE: Redis 호스트
    @IsString()
    @IsNotEmpty()
    HOST: string;

    // NOTE: Redis 포트
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    PORT: number;

    // NOTE: Redis 유저 이름
    USERNAME?: string;

    // NOTE: Redis 비밀번호
    PASSWORD?: string;
}
