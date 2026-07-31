# Deploying to Render

This monorepo deploys as **four separate Render web services** sharing one
managed Postgres database. A `render.yaml` Blueprint at the repo root
describes all of them, so the fastest path is Render's Blueprint deploy.

| Service                         | Path                    | Domain example                                 |
| -------------------------------- | ----------------------- | ------------------------------------------------ |
| Postgres                         | Render managed database | (internal)                                        |
| `punjab-blood-connect-api`        | `artifacts/api-server`   | `punjab-blood-connect-api.onrender.com`           |
| `punjab-blood-connect-donor`      | `artifacts/donor-app`    | `punjab-blood-connect-donor.onrender.com`         |
| `punjab-blood-connect-hospital`   | `artifacts/hospital-app` | `punjab-blood-connect-hospital.onrender.com`      |
| `punjab-blood-connect-admin`      | `artifacts/admin-app`    | `punjab-blood-connect-admin.onrender.com`         |

Each frontend calls the API on its own domain (CORS, not a shared reverse
proxy), matching how the apps are wired via `setBaseUrl()`.

## Option A: Blueprint deploy (recommended)

1. Push this repo to GitHub.
2. In the Render dashboard, click **New > Blueprint**, and point it at
   this repo. Render reads `render.yaml` from the repo root and proposes
   all four services plus the database.
3. Render generates `SESSION_SECRET` automatically and wires `DATABASE_URL`
   from the database to `punjab-blood-connect-api` automatically (both are
   declared in `render.yaml`).
4. For each of the two vars marked `sync: false` in `render.yaml`, Render
   will prompt you to fill them in during the Blueprint setup (or you can
   set them afterward in each service's **Environment** tab):
   - `punjab-blood-connect-api` → `CORS_ALLOWED_ORIGINS` (leave blank for
     now — you can only fill this in once the frontend domains exist; see
     step 6 below)
   - `punjab-blood-connect-donor`, `punjab-blood-connect-hospital`,
     `punjab-blood-connect-admin` → `VITE_API_URL` (the API service's URL,
     e.g. `https://punjab-blood-connect-api.onrender.com`, no trailing
     slash). **This must be set before the first build** — Vite bakes it
     into the static bundle, so changing it later requires a manual
     redeploy, not just a restart.
5. Click **Apply**. Render provisions the database and builds all four
   services.

## Option B: Manual setup (no Blueprint)

If you'd rather wire things up by hand in the dashboard:

1. **New > PostgreSQL** → create a database, any plan. Note the
   **Internal Database URL**.
2. **New > Web Service** for `api-server`:
   - Connect this repo, leave **Root Directory** blank (repo root — the
     build command runs pnpm filters from there, it needs the workspace).
   - Runtime: **Node**
   - Build command: `pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`
   - Start command: `pnpm --filter @workspace/api-server run start`
   - Health check path: `/api/healthz`
   - Environment variables (see `artifacts/api-server/.env.example`):
     - `DATABASE_URL` — paste the Internal Database URL from step 1
     - `SESSION_SECRET` — generate with `openssl rand -base64 48`
     - `NODE_ENV=production`
     - `CORS_ALLOWED_ORIGINS` — fill in after step 3, once the frontend
       domains exist (comma-separated, no trailing slashes)
3. **New > Web Service** for each of `donor-app`, `hospital-app`, and
   `admin-app`, same repo, Root Directory blank:
   - Build command: `pnpm install --frozen-lockfile && pnpm --filter @workspace/<app-name> run build`
   - Start command: `pnpm --filter @workspace/<app-name> run serve`
   - Environment variable: `VITE_API_URL` set to the `api-server` service's
     `.onrender.com` URL from step 2 (before the first build — see the
     note above about Vite baking this in at build time).

### Push the database schema

From your local machine (with `DATABASE_URL` pointed at the Render
Postgres instance — copy the **External Database URL** from the database's
Info tab):

```bash
cd lib/db
DATABASE_URL="<paste-external-url-from-render>" pnpm run push
```

This creates all tables, including the `admin_alerts` table used by the
hospital-registration approval flow. Re-run this any time the schema
changes.

### Seed a super admin

The app has no self-serve way to create the first admin account (by
design — that's what makes hospital approval meaningful). Insert one
directly, e.g. with `psql` against the same `DATABASE_URL`:

```sql
insert into admins (email, password_hash, name)
values ('admin@example.com', '<bcrypt-hash>', 'Super Admin');
```

Generate the bcrypt hash locally first, e.g.:

```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
```

> If you're migrating an existing Replit database (rather than starting
> fresh), check `replit.md` in this repo for admin/hospital credentials
> that may already be seeded — don't reuse those in production without
> changing the passwords first.

## Close the CORS loop

Once all three frontend domains exist, go back to
`punjab-blood-connect-api`'s Environment tab and set:

```
CORS_ALLOWED_ORIGINS=https://<donor-app-domain>,https://<hospital-app-domain>,https://<admin-app-domain>
```

Save, which triggers a redeploy of `api-server`.

## Smoke test

- `https://<api-server-domain>/api/healthz` → `{"status":"ok"}`
- Open the donor app, register a hospital via "Register Hospital".
- Log into the admin app with the seeded super admin, confirm the new
  registration shows up as an alert (bell icon) and under Hospitals as
  "Pending", then approve or reject it.
- Log into the hospital login form on the hospital app with the
  now-approved hospital's credentials.

## Local development

`.env` files already exist in `artifacts/api-server`, `artifacts/donor-app`,
`artifacts/hospital-app`, and `artifacts/admin-app` (git-ignored — each
holds a real, working local value, generated when this repo was set up).
Update `DATABASE_URL` in `artifacts/api-server/.env` to point at your own
Postgres instance, then:

```bash
# terminal 1
cd artifacts/api-server && pnpm run dev
# picks up .env automatically (PORT=8080, SESSION_SECRET, DATABASE_URL)

# terminal 2
cd artifacts/donor-app && pnpm run dev
# picks up .env automatically (VITE_API_URL=http://localhost:8080)

# terminal 3
cd artifacts/hospital-app && pnpm run dev

# terminal 4, if you also want the admin app
cd artifacts/admin-app && pnpm run dev
```

There's no dev-time reverse proxy in this repo (the original Replit
environment provided one; a bare `pnpm run dev` does not) — that's why
each frontend's `.env` points `VITE_API_URL` directly at the api-server's
port instead of relying on a shared origin. If you'd rather not deal with
separate ports, put a reverse proxy (e.g. Caddy, nginx) in front of both
and leave `VITE_API_URL` unset so requests stay relative.

For production (Render), `.env` files are never used — Render injects
service Environment Variables directly, and the api-server's `start`
script intentionally does not read `.env`.

## Notes on Render's free plan

- Free web services spin down after 15 minutes of inactivity and take
  ~30–60 seconds to wake on the next request — expect a cold-start delay
  on `api-server` after idle periods. Upgrade to a paid instance type to
  avoid this.
- The free Postgres plan expires after 30 days and is deleted; for
  anything beyond a demo, use a paid database plan.
