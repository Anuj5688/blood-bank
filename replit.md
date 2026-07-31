# Blood Bank

A centralized real-time blood availability platform for Punjab, India — connecting patients with hospitals and blood banks across all districts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/punjab-blood-connect run dev` — run the frontend (port 20540, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Default Credentials

- **Admin login**: `admin@punjabbloodconnect.in` / `password`
- **Hospital login** (after approval): any seeded hospital email / `password`
- Seeded hospital emails: `gmc.amritsar@punjabhospitals.in`, `blood@dmcludhiana.in`, `civil.patiala@punjabhospitals.in`, `bloodbank@ggsmc.ac.in`, `bloodbank@fortismohali.in`, `info@sgrdbloodbank.org`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + wouter + TanStack Query
- API: Express 5 + JWT auth (jsonwebtoken + bcryptjs)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (hospitals, bloodInventory, bloodStockHistory, cities, districts, auditLogs, admins)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, public, hospital, admin)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware + role guards
- `artifacts/punjab-blood-connect/src/` — React frontend

## Architecture decisions

- JWT stored in localStorage; role (`admin` | `hospital`) encoded in token payload
- Hospital approval workflow: pending → approved/rejected → can login
- Blood status auto-derived from units: >5 = Available, 1-5 = Low Stock, 0 = Out of Stock
- All inventory updates log to `blood_stock_history` and `audit_logs` tables
- Admin-created hospitals go directly to `approved` status; self-registered go to `pending`
- `SESSION_SECRET` env var used as JWT signing secret

## Product

- **Public**: Search blood availability by city, district, blood group, hospital type. View hospital details with real-time inventory and Google Maps links.
- **Hospital Dashboard**: Manage blood inventory for all 8 blood groups, update profile, view history.
- **Admin Panel**: Approve/reject registrations, manage all hospitals, analytics dashboard with charts, audit logs.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any schema change, run `pnpm --filter @workspace/db run push` then restart the API server
- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before editing routes
- The API server must be rebuilt (`pnpm --filter @workspace/api-server run build`) before restarting if route files change
- `numeric` Drizzle columns return as strings — always `parseFloat()` before sending in responses

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
