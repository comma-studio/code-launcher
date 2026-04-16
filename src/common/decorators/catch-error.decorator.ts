import { ErrorCode } from '@common/enums/error-code.enum';
import { AppException } from '@common/exceptions/app.exception';

/**
 * NOTE: 메서드 실행 중 발생하는 예외를 AppException으로 변환하는 데코레이터
 * @param errorCode 에러 발생 시 반환할 ErrorCode
 */
export function CatchError(errorCode: ErrorCode): MethodDecorator {
    return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
        const original = descriptor.value as (...args: unknown[]) => Promise<unknown>;
        descriptor.value = async function (...args: unknown[]) {
            try {
                return await (original.apply(this, args) as Promise<unknown>);
            } catch (error) {
                if (error instanceof AppException) {
                    throw error;
                }
                throw new AppException(errorCode, error);
            }
        };
        return descriptor;
    };
}
