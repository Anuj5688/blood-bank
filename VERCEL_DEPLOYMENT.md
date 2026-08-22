# Deployment: Vercel + Render + Cloudflare

```
Cloudflare (domain + DNS)
  ├── donor.yourdomain.com    → Vercel (donor-app)
  ├── hospital.yourdomain.com → Vercel (hospital-app)
  ├── admin.yourdomain.com    → Vercel (admin-app)
  └── api.yourdomain.com      → Render (api-server)
                                  ↳ PostgreSQL (Render managed DB)
```

No app code changes are needed for this setup — Vercel and Render are
already fully configured (see `vercel.json` in each frontend, `render.yaml`
at the repo root). This doc only covers wiring your own domain on top via
Cloudflare.

## 1. Buy a domain

Two options:
- **Cloudflare Registrar** — buy directly from Cloudflare, sold at wholesale
  cost (no markup). Simplest — domain and DNS are already in one place.
- **Any other registrar** (Namecheap, Porkbun, GoDaddy, etc) — buy there,
  then add the domain to Cloudflare afterward (next step).

## 2. Add the domain to Cloudflare (skip if bought via Cloudflare Registrar)

1. Cloudflare dashboard → **Add a Site** → enter your domain.
2. Choose the Free plan.
3. Cloudflare scans existing DNS records, then gives you 2 nameservers
   (e.g. `aida.ns.cloudflare.com`, `walt.ns.cloudflare.com`).
4. Go to your registrar's dashboard → change nameservers to the ones
   Cloudflare gave you.
5. Wait for propagation (Cloudflare emails you when active — usually
   under an hour, can take up to 24h).

## 3. Deploy to Vercel and Render first

Do this before touching DNS — you need the `.vercel.app` / `.onrender.com`
URLs to point DNS at.

**Render (API):**
```bash
git push
```
Render reads `render.yaml` and deploys `blood-bank-api` +
`punjab-blood-connect-db`. Note the URL, e.g.:
```
https://blood-bank-api.onrender.com
```

**Vercel (3 frontends):** for each of `donor-app`, `hospital-app`,
`admin-app`:
1. Vercel dashboard → **Add New → Project** → import this repo.
2. **Root Directory** → `artifacts/donor-app` (or `hospital-app` /
   `admin-app`).
3. Add env var `VITE_API_URL` = `https://blood-bank-api.onrender.com/api`
   (use your real Render URL).
4. Deploy. Note the resulting `.vercel.app` URL.

Repeat for all 3 — same repo, different Root Directory each time.

## 4. Add DNS records in Cloudflare

Cloudflare dashboard → your domain → **DNS** → add:

| Type  | Name       | Target                              | Proxy status |
|-------|------------|--------------------------------------|--------------|
| CNAME | `donor`    | `blood-bank-donor.vercel.app`        | DNS only (grey cloud) |
| CNAME | `hospital` | `blood-bank-hospital.vercel.app`     | DNS only (grey cloud) |
| CNAME | `admin`    | `blood-bank-admin.vercel.app`        | DNS only (grey cloud) |
| CNAME | `api`      | `blood-bank-api.onrender.com`        | DNS only (grey cloud) |

**Important:** set Proxy status to **DNS only** (grey cloud, not orange) for
all 4 initially. Vercel and Render need to see the real DNS target to issue
SSL certificates and verify domain ownership. You can switch to Cloudflare's
proxy (orange cloud) afterward if you want their CDN/DDoS protection — see
step 7.

## 5. Add the custom domains in Vercel

For each of the 3 Vercel projects:
1. Project → **Settings → Domains** → add `donor.yourdomain.com` (etc,
   matching that project).
2. Vercel detects the CNAME and auto-issues an SSL cert (usually
   within minutes).

## 6. Add the custom domain in Render

1. `blood-bank-api` service → **Settings → Custom Domains** → add
   `api.yourdomain.com`.
2. Render verifies the CNAME and auto-issues an SSL cert.

## 7. Update CORS on Render

Once the frontends are reachable at their custom domains, update:
```
CORS_ALLOWED_ORIGINS=https://donor.yourdomain.com,https://hospital.yourdomain.com,https://admin.yourdomain.com
```
in the `blood-bank-api` service's Environment settings on Render, then
redeploy.

## 8. (Optional) Turn on Cloudflare's proxy

Once everything works with DNS-only mode, you can switch each record's
proxy status to **Proxied** (orange cloud) in Cloudflare DNS settings to get
Cloudflare's CDN caching, DDoS protection, and analytics in front of Vercel/
Render. Test thoroughly after switching — occasionally this needs SSL mode
set to **Full (strict)** under Cloudflare's SSL/TLS settings to avoid
redirect loops, since both Vercel and Render already serve valid HTTPS.

## Verify

- Visit each subdomain, confirm it loads over HTTPS with a valid cert.
- Check browser console/network tab for successful `/api/...` calls with
  no CORS errors.
- If CORS errors appear: confirm `CORS_ALLOWED_ORIGINS` on Render exactly
  matches your Vercel custom domains (no trailing slash).

## Notes

- `deploy/` (self-hosting scripts) is unused in this setup — only relevant
  if you later decide to self-host on a VPS instead.
- Cloudflare's free plan covers everything needed here: DNS, SSL flexibility,
  and (if enabled) the CDN proxy. No paid plan required for this setup.
