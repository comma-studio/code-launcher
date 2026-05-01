#!/bin/bash
# GCP MIG code-launcher 인스턴스 부팅 시 자동 실행되는 startup script 템플릿
# CI/CD 파이프라인(build-and-deploy.yml)이 배포 시점에 아래 플레이스홀더를 실제 값으로 치환한 뒤
# gcloud instance-templates create --metadata=startup-script 옵션으로 인스턴스 메타데이터에 주입한다.
#   __ARTIFACT_URL__ → GCS에 업로드된 빌드 아티팩트 경로 (예: gs://bucket/code-launcher/YYYYMMDD-abc1234.tar.gz)
#   __PORT__         → 앱이 수신할 포트 번호
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
NO_COLOR=1
PORT=__PORT__
PRIVATE_IP=${PRIVATE_IP}
ENV

echo "[startup] Writing systemd service..."
cat > /etc/systemd/system/code-launcher.service <<EOF
[Unit]
Description=Code Launcher
After=network.target docker.service

[Service]
WorkingDirectory=${DEPLOY_DIR}
EnvironmentFile=${DEPLOY_DIR}/.env
ExecStart=/usr/bin/node ${DEPLOY_DIR}/dist/main.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=code-launcher

[Install]
WantedBy=multi-user.target
EOF

echo "[startup] Starting app with systemd..."
systemctl daemon-reload
systemctl enable code-launcher
systemctl restart code-launcher

echo "[startup] Done."
