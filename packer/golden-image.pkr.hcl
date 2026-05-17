# 골든 이미지 빌드 방법
#
# 1. 사전 준비
#    gcloud auth application-default login
#    gcloud services enable compute.googleapis.com --project=<PROJECT_ID>
#    (packer-build 태그 인스턴스에 SSH 22번 포트 인바운드 허용 필요)
#
# 2. 플러그인 초기화 (최초 1회)
#    packer init .
#
# 3. 빌드
#    packer build -var "project_id=<PROJECT_ID>" golden-image.pkr.hcl
#
# 빌드 성공 시 이미지 패밀리 "code-launcher-golden" 으로 GCP에 등록됨

packer {
  required_plugins {
    googlecompute = {
      version = ">= 1.1.4"
      source  = "github.com/hashicorp/googlecompute"
    }
  }
}

variable "project_id" {
  type        = string
  description = "GCP 프로젝트 ID"
}

variable "zone" {
  type        = string
  default     = "asia-northeast3-a"
  description = "VM 생성 리전"
}

variable "machine_type" {
  type    = string
  default = "e2-micro"
}

source "googlecompute" "golden" {
  project_id   = var.project_id
  zone         = var.zone
  machine_type = var.machine_type

  # 베이스 이미지: Debian 12
  source_image_family = "debian-12"
  source_image_project_id = ["debian-cloud"]

  # 생성될 Golden Image 이름/패밀리
  # 배포 시 image_family로 최신 이미지를 자동 참조하기 위해 패밀리를 고정한다
  image_name   = "code-launcher-golden-{{timestamp}}"
  image_family = "code-launcher-golden"

  disk_size = 15
  disk_type = "pd-standard"

  ssh_username = "packer"

  tags = ["packer-build"]
}

build {
  sources = ["source.googlecompute.golden"]

  provisioner "shell" {
    inline = [
      "set -e",

      # 패키지 목록 업데이트
      "sudo apt-get update -y",
      "sudo apt-get install -y ca-certificates curl gnupg",

      # Docker 공식 설치
      "curl -fsSL https://get.docker.com | sudo sh",
      "sudo systemctl enable docker",
      "sudo systemctl start docker",

      # GitHub Actions SA가 docker 명령을 실행할 수 있도록 권한 부여
      # startup-script는 root로 실행되므로 root도 docker 그룹에 추가
      "sudo usermod -aG docker packer",

      # 코드 실행에 사용되는 언어별 Docker 이미지 사전 pull
      # 런타임에 pull이 발생하면 첫 실행 지연이 크므로 골든 이미지에 미리 포함한다
      "sudo docker pull node:20-slim",
      "sudo docker pull python:3.12-slim",
      "sudo docker pull gcc:13",
      "sudo docker pull eclipse-temurin:21-jdk-alpine",

      # Node.js 20 설치
      "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -",
      "sudo apt-get install -y nodejs",

      # pnpm 전역 설치
      "sudo npm install -g pnpm",

      # Google Cloud Ops Agent 설치 (journald 로그 → Cloud Logging 전송)
      "curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh",
      "sudo bash add-google-cloud-ops-agent-repo.sh --also-install",
      "rm add-google-cloud-ops-agent-repo.sh",

      # 앱 배포 디렉토리 생성
      "sudo mkdir -p /app/code-launcher",

      # 패키지 캐시 정리 (이미지 크기 감소)
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*"
    ]
  }
}
