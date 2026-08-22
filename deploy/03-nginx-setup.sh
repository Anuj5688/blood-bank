#!/usr/bin/env bash
# deploy/03-nginx-setup.sh
#
# Run ONCE, after DNS A records for donor/hospital/admin/api.yourdomain.com
# point at this server's IP. Installs the 4 Nginx site configs and
# provisions free SSL certificates via Certbot.
#
# IMPORTANT: edit the .conf files in deploy/nginx/ first — replace
# "yourdomain.com" with your actual domain before running this.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_DIR="$SCRIPT_DIR/nginx"

for conf in "$NGINX_DIR"/*.conf; do
  name="$(basename "$conf")"
  echo "==> Installing $name"
  sudo cp "$conf" "/etc/nginx/sites-available/$name"
  sudo ln -sf "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
done

echo "==> Testing Nginx config"
sudo nginx -t

echo "==> Reloading Nginx"
sudo systemctl reload nginx

echo "==> Requesting SSL certificates (Certbot)"
echo "This will ask for your email and agree to Let's Encrypt terms."
read -rp "Enter your domain (e.g. yourdomain.com, no subdomain): " DOMAIN

sudo certbot --nginx \
  -d "donor.${DOMAIN}" \
  -d "hospital.${DOMAIN}" \
  -d "admin.${DOMAIN}" \
  -d "api.${DOMAIN}"

echo "==> Done. Certbot auto-renews via a systemd timer — verify with:"
echo "    sudo systemctl status certbot.timer"
