import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateConfig } from '../validations/config.validation';

// NOTE: Config 파일 경로
const CONFIG_PATH = join(process.cwd(), 'configs', 'config.json');

/**
 * NOTE: Config 파일에 접근하여 내용을 반환하는 팩토리 함수
 */
const loadConfiguration = (): Record<string, any> => {
    // NOTE: CONFIG_PATH 경로에 파일이 없는 경우 오류 발생
    if (!existsSync(CONFIG_PATH)) {
        throw new Error(`Config file not found: ${CONFIG_PATH}`);
    }

    try {
        // NOTE: Config 파일 읽기
        const file = readFileSync(CONFIG_PATH, 'utf8');

        // NOTE: JSON 파싱
        const config = JSON.parse(file) as Record<string, any>;

        // NOTE: Config 유효성 검사
        validateConfig(config);

        return config;
    } catch (error) {
        throw new Error(`Error reading config file: ${error}`);
    }
};

/**
 * NOTE: App Config Module
 * config.json 파일을 로드하여 전역적으로 설정을 제공하는 정적 모듈
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            // NOTE: 전역 모듈로 설정
            isGlobal: true,
            // NOTE: 환경 변수 무시 (config.json만 사용)
            ignoreEnvFile: true,
            // NOTE: configuration 팩토리 함수 등록
            load: [loadConfiguration],
        }),
    ],
})
export class AppConfigModule {}
