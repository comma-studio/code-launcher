#!/bin/bash
# GCP 프록시 인스턴스 생성 스크립트
# 인스턴스 템플릿을 생성한 뒤 해당 템플릿으로 프록시 인스턴스를 기동한다.
# 동일한 이름의 템플릿 또는 인스턴스가 이미 존재하면 해당 단계를 건너뛴다.
#
# 사전 조건:
#   - gcloud CLI 설치 및 인증 완료 (gcloud auth login)
#   - 아래 환경변수 설정 또는 기본값 사용
#
# 환경변수:
#   GCP_PROJECT_ID   GCP 프로젝트 ID (기본값: gcloud config의 현재 프로젝트)
#   GCP_ZONE         인스턴스를 생성할 존 (기본값: asia-northeast3-a)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TEMPLATE_NAME="op-comma-code-launcher-proxy"
INSTANCE_NAME="op-comma-code-launcher-proxy"
MACHINE_TYPE="e2-micro"
ZONE="${GCP_ZONE:-asia-northeast3-a}"
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"

if [ -z "${PROJECT_ID}" ]; then
    echo "[create-proxy] Error: GCP_PROJECT_ID 환경변수가 설정되지 않았습니다." >&2
    exit 1
fi

echo "[create-proxy] Project: ${PROJECT_ID}, Zone: ${ZONE}"

echo "[create-proxy] Creating instance template '${TEMPLATE_NAME}'..."
# 인스턴스 템플릿은 불변(immutable)이므로 항상 삭제 후 재생성한다.
if gcloud compute instance-templates describe "${TEMPLATE_NAME}" --project="${PROJECT_ID}" --quiet 2>/dev/null; then
    echo "[create-proxy] Deleting existing template '${TEMPLATE_NAME}'..."
    gcloud compute instance-templates delete "${TEMPLATE_NAME}" --project="${PROJECT_ID}" --quiet
fi

gcloud compute instance-templates create "${TEMPLATE_NAME}" \
    --project="${PROJECT_ID}" \
    --machine-type="${MACHINE_TYPE}" \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=10GB \
    --boot-disk-type=pd-standard \
    --tags=op-comma-code-launcher-proxy,http-server,https-server \
    --metadata-from-file=startup-script="${SCRIPT_DIR}/../startup/gcp-proxy-startup.sh"
echo "[create-proxy] Template '${TEMPLATE_NAME}' created."

echo "[create-proxy] Creating instance '${INSTANCE_NAME}'..."
if gcloud compute instances describe "${INSTANCE_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --quiet 2>/dev/null; then
    echo "[create-proxy] Instance '${INSTANCE_NAME}' already exists, skipping."
else
    gcloud compute instances create "${INSTANCE_NAME}" \
        --source-instance-template="${TEMPLATE_NAME}" \
        --zone="${ZONE}" \
        --project="${PROJECT_ID}"
    echo "[create-proxy] Instance '${INSTANCE_NAME}' created."
fi

echo "[create-proxy] Done."
