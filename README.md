# Cleaning Products Inventory

A small ERP-style inventory for a cleaning company: which products it has, how much of each is on hand, and when to reorder. See [spec/SPEC-002.md](spec/SPEC-002.md), and [spec/SPEC-003.md](spec/SPEC-003.md) for user accounts.

| Folder | What | Stack | Docs |
|---|---|---|---|
| [`api/`](api/) | REST backend: categories, suppliers, products, append-only stock movement ledger, stats, users, measurement uploads | Node.js 24, TypeScript, Express 5, SQLite, zod, JWT | [api/README.md](api/README.md) |
| [`web/`](web/) | Admin UI: catalog management, stock movements, low-stock dashboard, users, floor plans and 3D measurements | react-admin 5, Vite, TypeScript | [web/README.md](web/README.md) |
| [`mobile/`](mobile/) | iPhone room scanning, required login, durable measurement uploads | SwiftUI, RoomPlan, Core Data, Keychain | [mobile/README.md](mobile/README.md) |

The three parts are **independent** and share no runtime code. The API and web each have their own `package.json`, lockfile and `.env`; mobile has its own XcodeGen configuration. There is no root `package.json` and no workspaces. They communicate only over HTTP, so each one installs, runs, tests and deploys on its own.

RoomScanner uploads the dimensions, floor plan PNG, geometry and available RoomPlan exports from the iPhone. Operators use **Mediciones** in the admin to inspect, rename, download and delete those shared copies. Scans remain on the device, and queued uploads retry after connectivity or login returns. See [SPEC-004](spec/SPEC-004.md).

## Run with a phone

1. Start the API using the local instructions below.
2. Start `cloudflared tunnel --url http://localhost:4000` (or `ngrok http 4000`).
3. Set `PUBLIC_URL` in `api/.env` to the tunnel's HTTPS address and `TRUST_PROXY=1`, then restart the API.
4. Set `API_BASE_URL = https:/$()/your-tunnel-host` in `mobile/Config/API.local.xcconfig` (gitignored). The `$()` preserves the URL in xcconfig syntax.
5. Generate the project, build to a LiDAR iPhone and log in with an API account. Scan and save; open **Mediciones** in the admin. For the Simulator, use `http:/$()/localhost:4000` and **Depuración → Agregar lugar de ejemplo**.

For a deployed admin, `VITE_API_URL` is `PUBLIC_URL` plus `/api`. A local admin may keep its localhost URL. Tunnel addresses change when restarted. See the mobile README for same-Wi-Fi `.local` access and the full verification checklist.

## Run locally

Requires Node.js 24 (22.18 or later works).

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
cd mobile && xcodegen generate && xcodebuild -project RoomScanner.xcodeproj -scheme RoomScanner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=latest' build test
```

Measurements now become monthly cleaning-service quotes automatically (SPEC-005). An atomic database trigger queues each measurement, and the API worker derives zones and applies the workbook's cost model using editable company settings. The admin reviews assumptions, compares prices, edits zones and records chemical waste; the iPhone captures schedules, traffic, fixed posts and sanitary fixtures. Existing quotes retain their calculation snapshots until explicitly recalculated.

Commercial quote documents (SPEC-006) are available from **Documento** on each quote. Configure **Empresa** (logo, color, company data, legal representative) and **Plantilla** (numbering, validity, texts) under Administración, complete the client data and resolve the calculation blockers to preview and download matching PDF and Excel files. Downloads preserve the previewed bytes, freeze the quote number and record content revisions in an export history. The PDF and Excel files carry the company's own logo and main color (SPEC-007). The mobile app is unchanged.
