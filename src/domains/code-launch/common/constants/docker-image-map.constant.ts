// NOTE: 코드 실행 언어별 Docker 이미지 매핑
// 이미지를 추가·변경·삭제할 경우 packer/golden-image.pkr.hcl의 docker pull 목록도 반드시 동기화해야 한다
export const DOCKER_IMAGE_MAP: Record<string, string> = {
    javascript: 'node:20-slim',
    python: 'python:3.12-slim',
    c: 'gcc:13',
    cpp: 'gcc:13',
    java: 'eclipse-temurin:21-jdk-alpine',
};
