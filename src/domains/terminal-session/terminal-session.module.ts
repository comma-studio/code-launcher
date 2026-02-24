import { Module } from '@nestjs/common';

import { TerminalSessionGateway } from './gateways/terminal-session.gateway';
import { DockerPtyService } from './services/docker-pty.service';

@Module({
    providers: [TerminalSessionGateway, DockerPtyService],
})
export class TerminalSessionModule {}
