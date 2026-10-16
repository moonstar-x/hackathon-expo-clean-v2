# Cleaning Products Inventory

A small ERP-style inventory for a cleaning company: which products it has, how much of each is on hand, and when to reorder. See [spec/SPEC-002.md](spec/SPEC-002.md), and [spec/SPEC-003.md](spec/SPEC-003.md) for user accounts.

| Folder | What | Stack | Docs |
|---|---|---|---|
| [`api/`](api/) | REST backend: categories, suppliers, products, append-only stock movement ledger, stats, users | Node.js 24, Express 5, SQLite, zod, JWT | [api/README.md](api/README.md) |
| [`web/`](web/) | Admin UI: catalog management, stock movements, low-stock dashboard, user management | react-admin 5, Vite, TypeScript | [web/README.md](web/README.md) |

The two services are **independent**. Each has its own `package.json`, lockfile, `.env` and README, and they share no code. There is no root `package.json` and no workspaces. They communicate only over HTTP, so each one installs, runs, tests and deploys on its own.

## Run locally

Requires Node.js 24 (22 or later works).

```bash
# Terminal 1: API on http://localhost:4000
cd api
npm ci
cp .env.example .env
npm run db:reset      # migrate + seed demo data
npm run dev

# Terminal 2: admin UI on http://localhost:5173
cd web
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:5173 and log in with `admin@example.com` / `change-me-please`. That initial user is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `api/.env` while the database has no users. Change them, and `JWT_SECRET`, for anything beyond local development. Add more people under **Usuarios**.

To use other ports, change `PORT` (and `CORS_ORIGIN`) in `api/.env`, and `VITE_API_URL` (and `PORT`) in `web/.env`. No code changes are needed.

## Checks

```bash
cd api && npm ci && npm run lint && npm test
cd web && npm ci && npm run lint && npm run typecheck && npm test && npm run build
```
