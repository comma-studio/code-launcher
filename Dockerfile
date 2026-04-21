# 1) 빌드 단계: NestJS 애플리케이션 빌드
FROM node:20-slim@sha256:677c9bc72e8f52777aa42241fdb12a0aa87dc23f76299871686443907619f767 AS builder

# 작업 디렉토리 설정
WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# package.json과 lockfile 먼저 복사 (캐싱 최적화)
COPY package.json pnpm-lock.yaml ./

# 의존성 설치 (CI 환경 재현 및 잠금파일 고정)
RUN CI=true pnpm install --frozen-lockfile

# 나머지 코드 복사
COPY . .

# 코드 빌드
RUN pnpm build

# 2) 런타임 단계: NestJS 애플리케이션 실행
FROM node:20-slim@sha256:677c9bc72e8f52777aa42241fdb12a0aa87dc23f76299871686443907619f767 AS runner

# 작업 디렉토리 설정
WORKDIR /app

# pnpm 설치 및 루트리스 사용자 구성
RUN npm install -g pnpm && \
    useradd -m -u 1001 nodeuser
    
# 소유권 변경
RUN chown -R nodeuser:nodeuser /app

# 루트리스
USER nodeuser

# 빌드된 파일과 설정 파일만 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/configs ./configs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# 프로덕션 의존성 설치
RUN CI=true pnpm install --prod --frozen-lockfile --ignore-scripts

# Cloud Run 기본 포트 4000 노출
EXPOSE 4000

# Cloud Run 기본 포트 4000 설정
ENV PORT=4000

# 서버 실행
CMD ["pnpm", "start:prod"]