#!/usr/bin/env bash
# deploy/01-server-setup.sh
#
# Run ONCE on a fresh Ubuntu 24.04 VPS, as a user with sudo.
# Installs Node, pnpm, PostgreSQL, Nginx, PM2, Certbot.
#
# Usage: bash 01-server-setup.sh

set -euo pipefail

echo "==> Updating system packages"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Installing base tools"
sudo apt-get install -y curl git build-essential ufw

echo "==> Installing Node.js 22 LTS"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "==> Installing pnpm"
sudo npm install -g pnpm@latest pm2@latest

echo "==> Installing PostgreSQL 16"
sudo apt-get install -y postgresql postgresql-contrib

echo "==> Installing Nginx"
sudo apt-get install -y nginx

echo "==> Installing Certbot (for free SSL certs)"
sudo apt-get install -y certbot python3-certbot-nginx

echo "==> Configuring firewall"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "==> Creating app directories"
sudo mkdir -p /var/www/blood-bank/{donor-app,hospital-app,admin-app}
sudo mkdir -p /srv/blood-bank
sudo chown -R "$USER":"$USER" /var/www/blood-bank /srv/blood-bank

echo "==> Done. Next steps:"
echo "  1. Set up the database:      bash 02-db-setup.sh"
echo "  2. Clone your repo into:     /srv/blood-bank"
echo "  3. Configure Nginx sites:    bash 03-nginx-setup.sh"
echo "  4. Build and deploy apps:    bash 04-deploy.sh"
