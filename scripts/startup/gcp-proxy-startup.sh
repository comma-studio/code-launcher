#!/bin/bash
# GCP 프록시 인스턴스 부팅 시 자동 실행되는 startup script
# nginx를 설치하고 클라이언트 WebSocket 연결을 MIG 내 특정 code-launcher 인스턴스로
# 동적 라우팅하는 설정을 구성한다.
#
# 클라이언트가 연결하는 WebSocket URL 형식:
#   wss://{proxy_public_ip}.nip.io/{code-launcher-private-ip}/{port}
# nginx는 URL 경로에서 대상 IP와 포트를 추출해 해당 인스턴스로 트래픽을 전달한다.
#
# 이 스크립트는 gcp-proxy-instance-create.sh에 의해 인스턴스 메타데이터로 주입된다.
#
# 사전 조건 (GCP 방화벽 규칙):
#   - TCP 80  허용 (Let's Encrypt HTTP-01 인증 챌린지)
#   - TCP 443 허용 (HTTPS/WSS 트래픽)
set -e

# GCP 메타데이터 서버에서 인스턴스 공인 IP 조회
echo "[proxy-startup] Fetching public IP..."
PUBLIC_IP=$(curl -sf -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip")
NIP_DOMAIN="${PUBLIC_IP}.nip.io"
echo "[proxy-startup] Domain: ${NIP_DOMAIN}"

echo "[proxy-startup] Installing nginx and certbot..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

# certbot이 도메인을 인식하려면 server_name이 먼저 설정되어 있어야 한다
echo "[proxy-startup] Configuring nginx (HTTP)..."
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name ${NIP_DOMAIN};

    location ~ ^/([0-9.]+)/([0-9]+)(/.*)$ {
        set \$target_ip   \$1;
        set \$target_port \$2;

        rewrite ^/[0-9.]+/[0-9]+(/.*)$ \$1 break;

        # Socket.IO polling의 CORS preflight 요청 처리
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin'  \$http_origin;
            add_header 'Access-Control-Allow-Credentials' 'true';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type';
            add_header 'Access-Control-Max-Age'       1728000;
            return 204;
        }

        proxy_pass         http://\$target_ip:\$target_port;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       \$host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx

# certbot --nginx: nginx 설정에 SSL 블록을 자동으로 추가하고
# HTTP → HTTPS 리다이렉트를 설정한다
echo "[proxy-startup] Issuing Let's Encrypt certificate for ${NIP_DOMAIN}..."
certbot --nginx \
  -d "${NIP_DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --email ypjun100@gmail.com \
  --redirect

echo "[proxy-startup] Done. Proxy available at https://${NIP_DOMAIN}"
