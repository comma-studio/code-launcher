import { Controller } from '@nestjs/common';

import { CodeLaunchRequestJob } from '../common/interfaces/code-launch-request-job.interface';

/**
 * NOTE: Processor으로부터 들어오는 코드 실행 요청을 처리하는 Controller
 */
@Controller('code-launch-request')
export class CodeLaunchRequestController {
    constructor() {}

    // NOTE: 코드 실행 요청 처리 메서드
    public launch = (job: CodeLaunchRequestJob): void => {
        console.log('Launching code:', job.code, 'in language:', job.codeLanguage);
    };
}
