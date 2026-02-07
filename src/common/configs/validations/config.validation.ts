import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { AppConfig } from '../schemas/app-config.schema';

/**
 * NOTE: Config 유효성 검사 함수
 * Schema 기반으로 Config 객체를 검증합니다.
 */
export const validateConfig = (config: Record<string, unknown>): void => {
    // NOTE: Config 객체를 AppConfig 인스턴스로 변환
    const validatedConfig = plainToInstance(AppConfig, config);

    // NOTE: 유효성 검사 수행
    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    // NOTE: 오류가 있는 경우 예외 발생
    if (errors.length > 0) {
        throw new Error(errors.toString());
    }
};
