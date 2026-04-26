# 베이스 이미지로 Node.js 20 버전의 Alpine 이미지를 사용합니다.
# https://hub.docker.com/layers/library/node/20-alpine/images/sha256-afdf98210b07b586eb71fa22ba2e432e058e4cd1304d31ed60888755b8c865fb
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293

WORKDIR /app

# package.json과 lockfile 먼저 복사하여 의존성 레이어 캐싱
COPY package.json pnpm-lock.yaml ./

# pnpm 설치 및 의존성 설치를 단일 레이어로 처리
RUN npm install -g pnpm && \
    CI=true pnpm install --frozen-lockfile

COPY . .

RUN pnpm build
