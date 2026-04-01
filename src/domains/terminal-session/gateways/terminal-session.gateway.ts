import { Logger, UseFilters } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

import { WsExceptionFilter } from '../filters/ws-exception.filter';
import { DockerPtyService } from '../services/docker-pty.service';

// NOTE: 'attach' 이벤트의 페이로드 인터페이스
interface AttachPayload {
    containerId: string;
    cols?: number;
    rows?: number;
}

// NOTE: 'resize' 이벤트의 페이로드 인터페이스
interface ResizePayload {
    cols: number;
    rows: number;
}

/**
 * NOTE: 클라이언트 소켓 연결을 수신하고 PTY 세션 이벤트를 라우팅하는 Gateway
 */
@UseFilters(WsExceptionFilter)
@WebSocketGateway({ cors: { origin: '*' } })
export class TerminalSessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(TerminalSessionGateway.name);

    constructor(
        private readonly dockerPtyService: DockerPtyService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    /**
     * NOTE: 클라이언트가 소켓으로 연결될 때 이벤트 핸들러
     */
    handleConnection(socket: Socket) {
        this.logger.log(`Socket connected: ${socket.id}`);
    }

    /**
     * NOTE: 클라이언트가 소켓 연결을 끊을 때 이벤트 핸들러
     */
    handleDisconnect(socket: Socket) {
        this.logger.log(`Socket disconnected: ${socket.id}`);
        this.dockerPtyService.closeSession(socket.id);
    }

    /**
     * NOTE: 컨테이너에 PTY 세션을 열고 스트림을 연결
     */
    @SubscribeMessage('attach')
    async handleAttach(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: AttachPayload,
    ): Promise<void> {
        const { containerId, cols = 80, rows = 24 } = payload;

        // NOTE: DockerPtyService를 사용하여 세션 열기
        await this.dockerPtyService.openSession(socket, containerId, { cols, rows });

        // NOTE: code-launch 도메인에서 컨테이너 연결 대기 타이머를 취소하도록 이벤트 전달
        this.eventEmitter.emit('container.attached', { containerId });

        // NOTE: 세션이 성공적으로 열렸음을 클라이언트에 알림
        socket.emit('ready');
    }

    /**
     * NOTE: 클라이언트 입력을 컨테이너 stdin으로 전달
     */
    @SubscribeMessage('input')
    handleInput(@ConnectedSocket() socket: Socket, @MessageBody() data: string): void {
        this.dockerPtyService.writeToSession(socket.id, data);
    }

    /**
     * NOTE: 터미널 크기 변경을 컨테이너 exec에 전달
     */
    @SubscribeMessage('resize')
    async handleResize(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: ResizePayload,
    ): Promise<void> {
        await this.dockerPtyService.resizeSession(socket.id, payload);
    }
}
