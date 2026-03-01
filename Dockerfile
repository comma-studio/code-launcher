# 1) 빌드 단계: NestJS 애플리케이션 빌드
FROM node:20-slim AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

# 의존성 설치 (CI 환경 재현 및 잠금파일 고정)
RUN CI=true pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# 2) 런타임 단계
FROM node:20-slim AS runner

WORKDIR /app

RUN npm install -g pnpm

# Docker API 접근을 위해 root 유지 (호스트 docker.sock 마운트 시 필요)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/configs ./configs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# 프로덕션 의존성 설치
RUN CI=true pnpm install --prod --frozen-lockfile --ignore-scripts

EXPOSE 4000
ENV PORT=4000

CMD ["pnpm", "start:prod"]
