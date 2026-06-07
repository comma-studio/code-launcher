import { ErrorCode } from '@common/enums/error-code.enum';

/**
 * NOTE: 애플리케이션 전역 커스텀 예외 클래스
 * ErrorCode enum에 정의된 에러 코드를 포함한다.
 */
export class AppException extends Error {
    constructor(
        public readonly errorCode: ErrorCode,
        public readonly cause?: unknown,
    ) {
        super(errorCode);
        this.name = AppException.name;
    }
}
