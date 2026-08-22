# Self-Hosting on Your Own Domain (No Vercel / No Render)

Everything — 3 frontends + API + database — runs on one VPS you control,
served under your own domain via subdomains.

```
donor.yourdomain.com     → donor-app (static, served by Nginx)
hospital.yourdomain.com  → hospital-app (static, served by Nginx)
admin.yourdomain.com     → admin-app (static, served by Nginx)
api.yourdomain.com       → api-server (Express, run by PM2, proxied by Nginx)
                          ↳ PostgreSQL (local, same VPS)
```

## What you need first

1. **A domain** — buy from any registrar (Namecheap, Porkbun, GoDaddy, etc).
2. **A VPS** — Ubuntu 24.04, e.g. Hetzner (~€4/mo) or DigitalOcean (~$6/mo).
   1 vCPU / 1-2GB RAM is enough to start.
3. SSH access to the VPS as a user with `sudo`.

## Step-by-step

### 1. Point your domain at the VPS
At your registrar's DNS settings, add these records (replace with your VPS's
public IP):
```
A   donor      → <VPS_IP>
A   hospital   → <VPS_IP>
A   admin      → <VPS_IP>
A   api        → <VPS_IP>
```
DNS can take a few minutes to a few hours to propagate.

### 2. Provision the server (one time)
SSH into the VPS, then:
```bash
git clone <your-repo-url> /srv/blood-bank
cd /srv/blood-bank/deploy
bash 01-server-setup.sh
```
Installs Node 22, pnpm, PM2, PostgreSQL, Nginx, Certbot, and sets up the
firewall.

### 3. Set up the database (one time)
```bash
bash 02-db-setup.sh
```
Prompts you for a DB password, then prints a `DATABASE_URL`. Copy it.

Create the API's env file:
```bash
cd /srv/blood-bank/artifacts/api-server
cp .env.example .env
nano .env
```
Fill in:
```
DATABASE_URL=<the URL printed in step above>
SESSION_SECRET=<generate with: openssl rand -base64 48>
CORS_ALLOWED_ORIGINS=https://donor.yourdomain.com,https://hospital.yourdomain.com,https://admin.yourdomain.com
NODE_ENV=production
```
(`PORT` is already set to 4000 by the PM2 ecosystem config — no need to add
it here.)

Then push the schema:
```bash
cd /srv/blood-bank
pnpm --filter @workspace/db run push
```

### 4. Edit the Nginx configs with your real domain
In `deploy/nginx/*.conf`, replace every `yourdomain.com` with your actual
domain (4 files: `donor.`, `hospital.`, `admin.`, `api.`).

### 5. Set up Nginx + SSL (one time)
```bash
cd /srv/blood-bank/deploy
bash 03-nginx-setup.sh
```
Installs the 4 site configs and requests free SSL certificates from Let's
Encrypt via Certbot. Certs auto-renew.

### 6. Build and deploy the apps
```bash
bash 04-deploy.sh
```
Builds all 3 frontends + the API, copies the frontend builds into
`/var/www/blood-bank/*`, and starts/reloads the API under PM2.

### 7. Verify
Visit `https://donor.yourdomain.com`, `https://hospital.yourdomain.com`,
`https://admin.yourdomain.com` — should load over HTTPS with a valid cert.
Check the browser console/network tab for successful calls to
`https://api.yourdomain.com`.

```bash
pm2 status          # confirm blood-bank-api is running
pm2 logs blood-bank-api   # tail logs if something's wrong
```

## Redeploying after future code changes

Every time you push new code:
```bash
ssh youruser@your-vps-ip
cd /srv/blood-bank/deploy
bash 04-deploy.sh
```
That's it — pulls latest, rebuilds, redeploys, zero-downtime-reloads the API.

## Backups (do this — self-hosted Postgres has no automatic backups)

Set up a daily cron job dumping the database, e.g.:
```bash
# crontab -e
0 3 * * * pg_dump -U blood_bank_app blood_bank | gzip > /srv/backups/db-$(date +\%F).sql.gz
```
Consider also copying backups off-server (e.g. to S3, Backblaze B2, or even
just downloading periodically) — a VPS disk failure with no offsite backup
means losing all data.

## Notes

- `render.yaml` and the Vercel `vercel.json` files (if present) are unused
  in this setup — you can delete them, or leave them for later if you ever
  want to switch approaches.
- This setup does NOT include a staging environment. Consider a second,
  cheaper VPS or subdomains like `staging-donor.yourdomain.com` if you want
  to test changes before they hit production.
