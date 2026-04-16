/**
 * NOTE: Code Launch 처리 단계별 에러 코드 Enum
 */
export enum ErrorCode {
    // NOTE: Job 처리 단계
    JOB_UNKNOWN = 'JOB_UNKNOWN',
    JOB_PROCESSING_FAILED = 'JOB_PROCESSING_FAILED',

    // NOTE: Docker 이미지/컨테이너 단계
    IMAGE_PULL_FAILED = 'IMAGE_PULL_FAILED',
    CONTAINER_CREATE_FAILED = 'CONTAINER_CREATE_FAILED',
}
