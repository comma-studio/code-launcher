#!/bin/bash
# VM 부팅 시 자동 실행되는 스크립트
# __ARTIFACT_URL__ 은 배포 시 실제 GCS 경로로 치환된다
set -e

ARTIFACT_URL="__ARTIFACT_URL__"
DEPLOY_DIR="/app/code-launcher"
export HOME=/root

echo "[startup] Downloading artifact from GCS..."
gsutil cp "${ARTIFACT_URL}" /tmp/artifact.tar.gz

echo "[startup] Extracting artifact..."
rm -rf \
  "${DEPLOY_DIR}/dist" \
  "${DEPLOY_DIR}/configs" \
  "${DEPLOY_DIR}/node_modules" \
  "${DEPLOY_DIR}/package.json" \
  "${DEPLOY_DIR}/pnpm-lock.yaml"

tar -xzf /tmp/artifact.tar.gz -C "${DEPLOY_DIR}"
rm /tmp/artifact.tar.gz

echo "[startup] Installing production dependencies..."
cd "${DEPLOY_DIR}"
CI=true pnpm install --prod --frozen-lockfile --ignore-scripts

echo "[startup] Writing .env..."
PRIVATE_IP=$(hostname -I | awk '{print $1}')
cat > "${DEPLOY_DIR}/.env" <<ENV
NODE_ENV=production
PORT=__PORT__
PRIVATE_IP=${PRIVATE_IP}
ENV

echo "[startup] Starting app with PM2..."
set -a
source "${DEPLOY_DIR}/.env"
set +a
pm2 describe code-launcher > /dev/null 2>&1 \
  && pm2 reload code-launcher --update-env \
  || pm2 start dist/main.js --name code-launcher

pm2 save

echo "[startup] Done."
