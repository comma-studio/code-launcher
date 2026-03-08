import { IsString, IsNotEmpty, IsIn } from 'class-validator';

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

    // NOTE: WebSocket 연결 URL (호스트:포트)
    @IsString()
    @IsNotEmpty()
    URL: string;
}
