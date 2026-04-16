import { ErrorCode } from '@common/enums/error-code.enum';

/**
 * NOTE: Code Launch 응답 상태 Enum
 */
export enum CodeLaunchStatus {
    SUCCESS = 'success',
    ERROR = 'error',
}

/**
 * NOTE: Code Launch 응답 Job 인터페이스
 */
export interface CodeLaunchResponseJob {
    // NOTE: 코드 실행 결과
    status: CodeLaunchStatus;

    // NOTE: 클라이언트 소켓 ID (응답을 보낼 대상 식별)
    clientSocketId: string;

    // NOTE: WS에 연결하기 위한 정보 (성공 시)
    connection?: {
        wsUrl: string;
    };

    // NOTE: 컨테이너 정보 (성공 시)
    container?: {
        id: string;
        accessToken: string;
    };

    // NOTE: 에러 정보 (실패 시)
    error?: {
        code: ErrorCode;
        message: string;
    };
}
