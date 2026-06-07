import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

/**
 * NOTE: WebSocket 연결 설정 스키마
 * 클라이언트는 해당 접속 정보로 WebSocket 서버에 연결함
 */
export class WSConnectionConfig {
    // NOTE: WebSocket 프로토콜 (ws 또는 wss)
    @IsString()
    @IsNotEmpty()
    @IsIn(['ws', 'wss'])
    PROTOCOL: string;

    // NOTE: 프록시 서버 호스트 — OP 환경에서만 필요 (개발 환경에서는 미사용)
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    PROXY_HOST?: string;
}
