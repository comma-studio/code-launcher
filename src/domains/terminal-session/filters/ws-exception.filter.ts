import { Socket } from 'socket.io';
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';

/**
 * NOTE: WebSocket 이벤트 핸들러에서 발생한 예외를 잡아 클라이언트에 전달하는 Filter
 */
@Catch()
export class WsExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(WsExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const client = host.switchToWs().getClient<Socket>();
        const message = exception instanceof Error ? exception.message : 'Internal server error';

        this.logger.error(`WebSocket exception (socket: ${client.id}): ${message}`);
        client.emit('error', message);
    }
}
