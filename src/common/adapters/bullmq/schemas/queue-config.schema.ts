import { IsBoolean, IsNumber } from 'class-validator';

/**
 * NOTE: Queue Config 스키마
 */
export class QueueConfig {
    // NOTE: 최대 재시도 횟수
    @IsNumber()
    RETRY_ATTEMPTS: number;

    // NOTE: Job 완료 후 제거 여부
    @IsBoolean()
    REMOVE_ON_COMPLETE: boolean;

    // NOTE: Job 실패 후 제거 여부
    @IsBoolean()
    REMOVE_ON_FAIL: boolean;
}
