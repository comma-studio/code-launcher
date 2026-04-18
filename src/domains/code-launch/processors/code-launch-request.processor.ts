import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { QueueConfig } from '@common/adapters/bullmq';

import { CodeLaunchRequestJob } from '../common/interfaces/code-launch-request-job.interface';
import { DockerService } from '../services/docker.service';
import { CodeLaunchService } from '../services/code-launch.service';
import { CodeLaunchResponseService } from '../services/code-launch-response.service';
import { ContainerConnectionTimeoutService } from '../services/container-connection-timeout.service';
import { LANGUAGE_COMMAND_MAP } from '../common/constants/language-command-map.constant';

/**
 * NOTE: BullMQ로부터 들어오는 코드 실행 요청을 처리하는 Processor
 */
@Processor('code-launch-requests')
export class CodeLaunchRequestProcessor extends WorkerHost {
    private readonly logger = new Logger(CodeLaunchRequestProcessor.name);
    // NOTE: 최대 재시도 횟수
    private readonly maxAttempts: number;

    constructor(
        private readonly dockerService: DockerService,
        private readonly codeLaunchService: CodeLaunchService,
        private readonly codeLaunchResponseService: CodeLaunchResponseService,
        // NOTE: PTY 미연결 시 컨테이너 자동 종료 타이머 서비스
        private readonly containerConnectionTimeoutService: ContainerConnectionTimeoutService,
        private readonly configService: ConfigService,
    ) {
        super();

        this.maxAttempts =
            this.configService.getOrThrow<QueueConfig>('BULLMQ_QUEUE_CONFIG').RETRY_ATTEMPTS;
    }

    @OnWorkerEvent('active')
    onActive(job: Job): void {
        this.logger.log(`Job started - [${job.name}] (id: ${job.id})`);
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job): void {
        this.logger.log(`Job completed - [${job.name}] (id: ${job.id})`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<CodeLaunchRequestJob>, error: Error): void {
        this.logger.error(
            `Job failed - [${job.name}] (id: ${job.id}) | attempt: ${job.attemptsMade} | ${error.message}`,
            error.stack,
        );

        // NOTE: 최종 실패 시 클라이언트에게 에러 응답 전송 (Job에 명시된 attempts 옵션이 없는 경우 기본 maxAttempts 사용)
        if (job.attemptsMade >= (job.opts.attempts ?? this.maxAttempts)) {
            void this.codeLaunchResponseService.sendErrorResponse(job.data.clientSocketId, error);
        }
    }

    // NOTE: Job 처리 메서드
    async process(job: Job<CodeLaunchRequestJob>): Promise<void> {
        switch (job?.name) {
            // NOTE: 코드 실행 요청 처리
            case 'launch':
                await this.launch(job.data);
                break;
            default:
                this.logger.warn(`Job unknown - [${job.name}] (id: ${job.id})`);
                void this.codeLaunchResponseService.sendErrorResponse(
                    job.data.clientSocketId,
                    new Error(`Unknown job name: ${job.name}`),
                );
        }
    }

    // NOTE: 코드 실행 요청 처리 메서드 (5단계 파이프라인)
    private async launch(job: CodeLaunchRequestJob): Promise<void> {
        const langCommands = LANGUAGE_COMMAND_MAP[job.codeLanguage.toLowerCase()];
        if (!langCommands) {
            throw new Error(`Unsupported language: ${job.codeLanguage}`);
        }

        // NOTE: ① 컨테이너 생성 (/workspace mkdir 포함) — runCmd를 Docker 라벨로 설정
        const containerId = await this.dockerService.createAndStartContainer(
            job.codeLanguage,
            langCommands.runCmd,
        );

        // NOTE: ② 코드 주입
        await this.codeLaunchService.injectCode(containerId, langCommands.fileName, job.code);

        // NOTE: ③ 컴파일 (컴파일 언어만)
        if (langCommands.compileCmd) {
            try {
                await this.codeLaunchService.compile(containerId, langCommands.compileCmd);
            } catch (error) {
                await this.codeLaunchService.removeContainer(containerId);
                throw error;
            }
        }

        // NOTE: ④ 성공 응답 발행
        // NOTE: PTY 미연결 시 5초 후 컨테이너 종료 타이머 시작
        this.containerConnectionTimeoutService.startTimer(containerId);

        // NOTE: 성공 응답 전송
        await this.codeLaunchResponseService.sendSuccessResponse(job.clientSocketId, containerId);
    }
}
