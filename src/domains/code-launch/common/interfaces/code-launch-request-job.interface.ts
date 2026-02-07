/**
 * NOTE: Code Launch 요청 Job 인터페이스
 */
export interface CodeLaunchRequestJob {
    clientSocketId: string;
    code: string;
    codeLanguage: string;
}
