#!/usr/bin/env bash
# deploy/04-deploy.sh
#
# Run this every time you want to deploy new code (after `git pull`).
# Builds all 3 frontends + the API, copies frontend builds into place,
# and restarts the API via PM2.
#
# Assumes the repo lives at /srv/blood-bank (see 01-server-setup.sh).

set -euo pipefail

REPO_DIR="/srv/blood-bank"
WWW_DIR="/var/www/blood-bank"

cd "$REPO_DIR"

echo "==> Pulling latest code"
git pull

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Building frontends"
pnpm --filter @workspace/donor-app run build
pnpm --filter @workspace/hospital-app run build
pnpm --filter @workspace/admin-app run build

echo "==> Building API"
pnpm --filter @workspace/api-server run build

echo "==> Deploying frontend builds to Nginx directories"
rsync -a --delete artifacts/donor-app/dist/public/ "$WWW_DIR/donor-app/"
rsync -a --delete artifacts/hospital-app/dist/public/ "$WWW_DIR/hospital-app/"
rsync -a --delete artifacts/admin-app/dist/public/ "$WWW_DIR/admin-app/"

echo "==> Restarting API via PM2"
cd artifacts/api-server
if pm2 describe blood-bank-api > /dev/null 2>&1; then
  pm2 reload blood-bank-api
else
  pm2 start ../../deploy/ecosystem.config.cjs
  pm2 save
fi

echo "==> Done. Check status with: pm2 status"
