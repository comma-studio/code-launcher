#!/bin/bash
# GCP 프록시 인스턴스 부팅 시 자동 실행되는 startup script
# nginx를 설치하고 클라이언트 WebSocket 연결을 MIG 내 특정 code-launcher 인스턴스로
# 동적 라우팅하는 설정을 구성한다.
#
# 클라이언트가 연결하는 WebSocket URL 형식:
#   ws://{proxy_ip}/{code-launcher-private-ip}/{port}
# nginx는 URL 경로에서 대상 IP와 포트를 추출해 해당 인스턴스로 트래픽을 전달한다.
#
# 이 스크립트는 gcp-proxy-instance-create.sh에 의해 인스턴스 메타데이터로 주입된다.
set -e

echo "[proxy-startup] Installing nginx..."
apt-get update -y
apt-get install -y nginx

echo "[proxy-startup] Configuring nginx for WebSocket dynamic routing..."
cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80;

    location ~ ^/([0-9.]+)/([0-9]+)(/.*)?$ {
        set $target_ip   $1;
        set $target_port $2;

        proxy_pass         http://$target_ip:$target_port;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "[proxy-startup] Done."
