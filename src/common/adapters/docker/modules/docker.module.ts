import { Global, Module } from '@nestjs/common';
import Docker from 'dockerode';

export const DOCKER_CLIENT = 'DOCKER_CLIENT';

const DockerProvider = {
    provide: DOCKER_CLIENT,
    useValue: new Docker(),
};

@Global()
@Module({
    providers: [DockerProvider],
    exports: [DockerProvider],
})
export class DockerModule {}
