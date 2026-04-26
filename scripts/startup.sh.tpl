#!/bin/bash
# VM 부팅 시 자동 실행되는 스크립트
# __IMAGE_URL__ 은 배포 시 실제 이미지 경로로 치환된다
set -e

IMAGE_URL="__IMAGE_URL__"
AR_REGION="__AR_REGION__"
DEPLOY_DIR="/opt/code-launcher"

echo "[startup] Configuring Docker auth for Artifact Registry..."
gcloud auth configure-docker ${AR_REGION}-docker.pkg.dev --quiet

echo "[startup] Pulling image: ${IMAGE_URL}"
docker pull "${IMAGE_URL}"

echo "[startup] Extracting app artifacts from image..."
CONTAINER_ID=$(docker create "${IMAGE_URL}")

rm -rf \
  "${DEPLOY_DIR}/dist" \
  "${DEPLOY_DIR}/configs" \
  "${DEPLOY_DIR}/package.json" \
  "${DEPLOY_DIR}/pnpm-lock.yaml"

docker cp "${CONTAINER_ID}:/app/dist"         "${DEPLOY_DIR}/dist"
docker cp "${CONTAINER_ID}:/app/configs"      "${DEPLOY_DIR}/configs"
docker cp "${CONTAINER_ID}:/app/node_modules" "${DEPLOY_DIR}/node_modules"
docker cp "${CONTAINER_ID}:/app/package.json" "${DEPLOY_DIR}/package.json"
docker rm "${CONTAINER_ID}"

echo "[startup] Starting app with PM2..."
pm2 describe code-launcher > /dev/null 2>&1 \
  && pm2 reload code-launcher \
  || pm2 start dist/main.js --name code-launcher

pm2 save

echo "[startup] Done."
