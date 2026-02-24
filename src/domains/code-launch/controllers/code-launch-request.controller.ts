import { Controller } from '@nestjs/common';

import { CodeLaunchRequestJob } from '../common/interfaces/code-launch-request-job.interface';
import { DockerService } from '../services/docker.service';

/**
 * NOTE: Processor으로부터 들어오는 코드 실행 요청을 처리하는 Controller
 */
@Controller('code-launch-request')
export class CodeLaunchRequestController {
    constructor(
        // NOTE: DockerService 주입
        private readonly dockerService: DockerService,
    ) {}

    // NOTE: 코드 실행 요청 처리 메서드
    public async launch(job: CodeLaunchRequestJob): Promise<void> {
        // NOTE: Docker 컨테이너 생성 및 시작
        await this.dockerService.createAndStartContainer(job.codeLanguage, job.code);
    }
}
