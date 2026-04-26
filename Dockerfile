# 베이스 이미지로 Node.js 20 버전의 이미지를 사용합니다.
# https://hub.docker.com/layers/library/node/20-slim/images/sha256-3d0f05455dea2c82e2f76e7e2543964c30f6b7d673fc1a83286736d44fe4c41c
FROM node:20-slim@sha256:3d0f05455dea2c82e2f76e7e2543964c30f6b7d673fc1a83286736d44fe4c41c

WORKDIR /app

# package.json과 lockfile 먼저 복사하여 의존성 레이어 캐싱
COPY package.json pnpm-lock.yaml ./

# pnpm 설치 및 의존성 설치를 단일 레이어로 처리
RUN npm install -g pnpm && \
    CI=true pnpm install --frozen-lockfile

COPY . .

# 빌드 후 devDependencies를 제거하여 VM에 복사될 node_modules 크기를 최소화
RUN pnpm build && \
    pnpm prune --prod
