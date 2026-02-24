import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // NOTE: WebSocket 어댑터 설정 (socket.io 사용)
    app.useWebSocketAdapter(new IoAdapter(app));

    await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
