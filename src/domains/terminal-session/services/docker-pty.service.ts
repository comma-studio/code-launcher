import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import Docker from 'dockerode';
import { Duplex } from 'stream';

interface PtySession {
    exec: Docker.Exec;
    stream: Duplex;
}

/**
 * NOTE: Docker 컨테이너에 exec PTY 세션을 열고 관리하는 Service
 */
@Injectable()
export class DockerPtyService {
    private readonly logger = new Logger(DockerPtyService.name);
    private readonly docker: Docker;

    // NOTE: socketId → PtySession 매핑
    private readonly sessions = new Map<string, PtySession>();

    constructor() {
        this.docker = new Docker();
    }

    /**
     * NOTE: 특정 컨테이너에 PTY exec 세션을 열고 소켓과 스트림을 연결
     * @param socket 클라이언트 소켓
     * @param containerId 연결할 컨테이너 ID
     * @param size 터미널 초기 크기
     */
    async openSession(
        socket: Socket,
        containerId: string,
        size: { cols: number; rows: number },
    ): Promise<void> {
        try {
            // NOTE: 기존 세션이 있으면 정리
            if (this.sessions.has(socket.id)) {
                this.closeSession(socket.id);
            }

            // NOTE: 컨테이너 인스턴스 가져오기
            const container = this.docker.getContainer(containerId);

            // NOTE: 컨테이너 상태 확인
            const containerInfo = await container.inspect();
            if (!containerInfo.State.Running) {
                throw new Error(`Container ${containerId} is not running`);
            }

            // NOTE: TTY exec 인스턴스 생성
            const exec = await container.exec({
                AttachStdin: true,
                AttachStdout: true,
                AttachStderr: true,
                Tty: true,
                Cmd: ['/bin/sh'],
            });

            // NOTE: exec 스트림 시작
            const stream = await exec.start({
                hijack: true, // NOTE: 소켓을 직접 제어하여 양방향 통신 허용
                stdin: true,
            });

            // NOTE: 터미널 초기 크기 설정
            await exec.resize({ h: size.rows, w: size.cols });

            // NOTE: 컨테이너 출력 → 클라이언트 전송
            stream.on('data', (chunk: Buffer) => {
                socket.emit('output', chunk.toString());
            });

            // NOTE: 스트림 종료 시 세션 정리
            stream.on('close', () => {
                // NOTE: 세션이 이미 정리되었을 수 있으므로 존재 여부 확인
                if (!this.sessions.has(socket.id)) return;

                socket.emit('exit');
                this.sessions.delete(socket.id);
                this.logger.log(`PTY stream closed (socket: ${socket.id})`);
            });

            stream.on('error', (err: Error) => {
                this.logger.error(`PTY stream error (socket: ${socket.id}): ${err.message}`);
                socket.emit('error', err.message);
            });

            this.sessions.set(socket.id, { exec, stream });

            this.logger.log(`PTY session opened — container: ${containerId}, socket: ${socket.id}`);
        } catch (error) {
            this.logger.error(`Failed to open PTY session for container ${containerId}`, error);
            throw error;
        }
    }

    /**
     * NOTE: 클라이언트 입력을 컨테이너 stdin으로 전달
     * @param socketId 소켓 ID
     * @param data 사용자 입력 데이터
     */
    writeToSession(socketId: string, data: string): void {
        const session = this.sessions.get(socketId);
        if (session) {
            session.stream.write(data);
        }
    }

    /**
     * NOTE: 터미널 크기 변경 요청을 exec에 전달
     * @param socketId 소켓 ID
     * @param size 변경할 터미널 크기
     */
    async resizeSession(socketId: string, size: { cols: number; rows: number }): Promise<void> {
        const session = this.sessions.get(socketId);
        if (session) {
            await session.exec.resize({ h: size.rows, w: size.cols });
        }
    }

    /**
     * NOTE: PTY 세션 종료 및 정리
     * @param socketId 소켓 ID
     */
    closeSession(socketId: string): void {
        const session = this.sessions.get(socketId);
        if (session) {
            this.sessions.delete(socketId);
            session.stream.destroy();
            this.logger.log(`PTY session closed (socket: ${socketId})`);
        }
    }
}
