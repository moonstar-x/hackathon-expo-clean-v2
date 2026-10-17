# Cleaning Inventory API

REST backend for the cleaning products inventory ([SPEC-002](../spec/SPEC-002.md), user accounts in [SPEC-003](../spec/SPEC-003.md)). It stores categories, suppliers, products, an append-only ledger of **stock movements**, and the **users** who can log in. A product's on-hand quantity changes only through movements, so every change is auditable.

Stack: Node.js 24 (≥ 22.18), Express 5, SQLite (`better-sqlite3`), zod, JWT auth. TypeScript (strict) ES modules with no build step: Node runs the `.ts` files directly through its built-in type stripping, and `tsc` only type-checks. So the code may only use erasable TypeScript syntax: no `enum`, no `namespace` with runtime code, no constructor parameter properties.

This service is independent of the admin UI in `../web`. It shares no code with it and talks to it only over HTTP.

## Quick start

```bash
cd api
nvm use              # optional: Node 24 from .nvmrc
npm ci
cp .env.example .env # then edit secrets for anything beyond local dev
npm run db:reset     # create data/inventory.db, migrate and seed demo data
npm run dev          # http://localhost:4000 (PORT from .env)
```

```bash
curl -s localhost:4000/health   # {"status":"ok","db":"ok"}
```

## Configuration

Every setting comes from environment variables. `src/server.ts` loads `api/.env` with dotenv, and real environment variables take precedence over the file. Invalid or missing values stop the process with exit code 1, and **every** problem is listed by variable name.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `test` or `production` |
| `PORT` | no | `4000` | HTTP port (1–65535) |
| `PUBLIC_URL` | in production | `http://localhost:<PORT>` | Public HTTP(S) base URL; HTTPS required in production; optional proxy path prefix. No credentials, query or fragment. |
| `TRUST_PROXY` | no | `false` | Express trusted proxies: boolean, hop count, IP/subnet list or named ranges. Usually `1` behind a tunnel. |
| `UPLOAD_MAX_FILE_MB` | no | `50` | Maximum bytes per measurement file, in MB (integer 1–500). |
| `DATABASE_PATH` | no | `./data/inventory.db` | SQLite file, relative to `api/`. `:memory:` is allowed. The parent directory is created if missing. |
| `FILES_PATH` | no | `./data/files` | Folder for uploaded files kept outside the database (the company logo, under `logos/`, and its sealed electronic signature, under `signatures/`), relative to `api/`. Created when the first file is written. Back it up with the database. |
| `CORS_ORIGIN` | **yes** | – | Comma-separated origins allowed to call the API, e.g. `http://localhost:5173` |
| `JWT_SECRET` | **yes** | – | At least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. It also seals the company's electronic signature: after changing it, load the signature again. |
| `JWT_EXPIRES_IN` | no | `8h` | Token lifetime (`30m`, `8h`, `7d`, …) |
| `ADMIN_EMAIL` | **yes** | – | Email of the **initial user** (see below) |
| `ADMIN_PASSWORD` | **yes** | – | Password of the initial user, 8–128 characters |
| `QUOTE_DOCUMENT_TIMEZONE` | no | `America/Guayaquil` | Valid IANA timezone for document issue dates and metadata. |
| `LOG_LEVEL` | no | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent` |

With `NODE_ENV=production`, startup also fails if `JWT_SECRET` or `ADMIN_PASSWORD` still has its `.env.example` placeholder value.

### The initial user

User accounts live in the database. While the `users` table is **empty**, the server (and `db:seed` / `db:reset`) creates one user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, so a fresh install, or one upgraded from the single-admin version, can log in with the same credentials as before. Once any user exists these two variables are no longer used for login: changing them does **not** change anyone's password. Manage accounts through `/api/users` or the Users screen in the admin UI.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start with `node --watch` (restarts on change) |
| `npm start` | Start the server |
| `npm test` | Run the Vitest suite (in-memory SQLite; no `.env` needed) |
| `npm run typecheck` | `tsc` type check (no output files) |
| `npm run lint` | ESLint with typescript-eslint |
| `npm run db:migrate` | Apply pending `migrations/NNN_*.sql` files |
| `npm run db:seed` | Seed demo data, only if there are no products yet |
| `npm run db:reset` | Delete the DB file (plus `-wal`/`-shm`), migrate and seed |

Migrations also run automatically on startup. `SIGINT`/`SIGTERM` close the HTTP server and the database before the process exits.

## HTTP conventions

- Resources live under `/api`. The health check is `GET /health` (public).
- JSON in, JSON out. The body limit is 100 kB. Responses use camelCase.
- Every `/api/*` route except `POST /api/auth/login` needs `Authorization: Bearer <token>`. Any active user can call every endpoint, including user management; there are no roles yet.
- Lists follow the [`ra-data-simple-rest`](https://github.com/marmelab/react-admin/tree/master/packages/ra-data-simple-rest) protocol:
  - `sort=["field","ASC"|"DESC"]` (whitelisted fields; text sorts are case-insensitive; ties are broken by `id ASC`)
  - `range=[start,end]` (inclusive, default `[0,24]`, at most 1000 rows)
  - `filter={...}` (whitelisted keys, combined with AND; array values mean "in"; `id` and `q` work on every resource)
  - The response is a JSON array plus `Content-Range: <resource> <start>-<end>/<total>` (or `<resource> */<total>` when the page is empty).
- `PUT` merges: fields missing from the body keep their current value. Read-only and unknown fields are ignored.
- `DELETE` returns the deleted record.

Every error response has the same shape:

```json
{ "message": "Human-readable summary", "code": "VALIDATION_ERROR", "errors": { "sku": "Required" } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON; bad `sort`/`range`/`filter`; unknown sort field or filter key |
| 401 | `UNAUTHORIZED` / `INVALID_CREDENTIALS` | Missing, invalid or expired token / wrong login |
| 404 | `NOT_FOUND` | Unknown record or route |
| 405 | `METHOD_NOT_ALLOWED` | `PUT`/`DELETE` on stock movements |
| 409 | `CONFLICT` | Duplicate name, SKU or user email; deleting a record that is still referenced; deleting your own account |
| 409 | `DOCUMENT_NOT_READY` | Calculation, issuer, payment or client data is incomplete. |
| 409 | `DOCUMENT_CHANGED` | Content changed after the preview; refresh before saving a file. |
| 409 | `INSUFFICIENT_STOCK` | `OUT` larger than the quantity on hand |
| 422 | `VALIDATION_ERROR` | Invalid body, a referenced id that does not exist, or deactivating your own account |
| 429 | `RATE_LIMITED` | More than 10 login attempts per 15 minutes per IP |
| 500 | `INTERNAL_ERROR` | Unexpected error (details hidden in production) |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{"status":"ok","db":"ok"}`, or 503 if the DB check fails |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, expiresAt, user: { id, email, name } }` |
| GET | `/api/auth/me` | `{ id, email, name }` |
| GET, POST | `/api/categories` | Sort: `id`, `name`, `createdAt`, `updatedAt`. `q` searches name and description. |
| GET, PUT, DELETE | `/api/categories/:id` | 409 on delete while products use it |
| GET, POST | `/api/suppliers` | Sort: also `contactName`, `email`. `q` searches name, contact and email. |
| GET, PUT, DELETE | `/api/suppliers/:id` | 409 on delete while products use it |
| GET, POST | `/api/products` | Filters: `categoryId`, `supplierId`, `unit`, `active`, `hazardous`, `lowStock`, `outOfStock`. POST accepts `initialQuantity`. |
| GET, PUT, DELETE | `/api/products/:id` | `quantity` is read-only. `unit` is locked once movements exist. 409 on delete if it has movements. |
| GET, POST | `/api/stock-movements` | Filters: `productId`, `type`, `createdBy`, `createdAt_gte`, `createdAt_lte` (date or ISO datetime, inclusive) |
| GET | `/api/stock-movements/:id` | |
| PUT, DELETE | `/api/stock-movements/:id` | Always 405: the ledger is append-only |
| GET | `/api/stats` | Product counts, stock value and movement counts for the last 30 days |
| GET, POST | `/api/users` | Sort: `id`, `email`, `name`, `active`, `lastLoginAt`, `createdAt`, `updatedAt` (default `email ASC`). Filter: `active`. `q` searches email and name. |
| GET, PUT, DELETE | `/api/users/:id` | `password` is write-only. You cannot delete (409) or deactivate (422) your own account. |

### Users

| Field | Rules |
|---|---|
| `email` | required, valid, ≤ 254 chars, stored **lowercased**, unique (case-insensitive). Used to log in. |
| `name` | optional display name, ≤ 100 chars |
| `password` | **write-only**, 8–128 chars, required on create. On `PUT`, a missing, `null` or `""` password keeps the current one. |
| `active` | default `true`. Inactive users cannot log in. |
| `lastLoginAt` | read-only, set on every successful login (`null` until then) |

- Passwords are hashed with Node's built-in **scrypt** (N=2¹⁴, r=8, p=5, OWASP's lower-memory setting), with a random salt per password. The hash stores its own cost parameters, so they can be raised later without invalidating existing passwords. Hashes are never returned by the API.
- Login looks the user up by email (case-insensitive). An unknown email, a wrong password and an inactive account all get the same `401 INVALID_CREDENTIALS`, and unknown emails are checked against a dummy hash so they take as long as a wrong password.
- The JWT's `sub` is the user id. The user is loaded on every request, so **deleting or deactivating a user ends their sessions immediately**, and `createdBy` on new stock movements is always the user's current email.
- Changing a user's password does not end sessions that are already open. Deactivate the user to cut them off immediately.
- Deleting a user keeps their stock movements: `createdBy` is a plain email, not a foreign key.

### Stock movements

| Type | `quantity` means | `delta` |
|---|---|---|
| `IN` | amount received (> 0) | `+quantity` |
| `OUT` | amount used (> 0, ≤ on hand) | `−quantity` |
| `ADJUSTMENT` | counted quantity on hand (≥ 0) | `counted − previous` (may be 0) |

Recording a movement and updating the product happen in a single SQLite transaction. Quantities allow up to 3 decimals and `unitCost` up to 4. Every arithmetic step is rounded so float error never accumulates (`0.1 + 0.2` is stored as `0.3`).

## curl examples

```bash
API=http://localhost:4000

# Log in and keep the token
TOKEN=$(curl -s -X POST $API/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change-me-please"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

# List: active, low-stock products sorted by quantity, first 5 rows (-g turns off curl's URL globbing)
curl -sg -D - "$API/api/products?sort=[\"quantity\",\"ASC\"]&range=[0,4]&filter={\"active\":true,\"lowStock\":true}" \
  -H "Authorization: Bearer $TOKEN"
# → header  Content-Range: products 0-4/5

# Create a category, then a product with opening stock (recorded as an IN movement)
CATEGORY_ID=$(curl -s -X POST $API/api/categories -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Cocina"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')

curl -s -X POST $API/api/products -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{
  \"sku\": \"kit-degr-1\", \"name\": \"Desengrasante de cocina\", \"categoryId\": $CATEGORY_ID,
  \"unit\": \"L\", \"reorderLevel\": 5, \"unitCost\": 3.2, \"hazardous\": true, \"initialQuantity\": 10
}"
# → 201 {"id":18,"sku":"KIT-DEGR-1",...,"quantity":10,"stockValue":32,...}

# Add a user, who can then log in with these credentials
curl -s -X POST $API/api/users -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","name":"Ana Pérez","password":"a-strong-password"}'
# → 201 {"id":2,"email":"ana@example.com","name":"Ana Pérez","active":true,"lastLoginAt":null,...}

# Record usage
curl -s -X POST $API/api/stock-movements -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":18,"type":"OUT","quantity":4,"reason":"Usado en trabajo de Torre de Oficinas","reference":"WO-1042"}'
# → 201 {"type":"OUT","quantity":4,"delta":-4,"balanceAfter":6,...}

# Too much → 409 INSUFFICIENT_STOCK, nothing changes
curl -s -X POST $API/api/stock-movements -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":18,"type":"OUT","quantity":7}'

# Physical count
curl -s -X POST $API/api/stock-movements -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":18,"type":"ADJUSTMENT","quantity":5,"reason":"Conteo mensual"}'
# → delta -1, balanceAfter 5

# Archive instead of delete (products with history cannot be deleted)
curl -s -X PUT $API/api/products/18 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"active":false}'

curl -s $API/api/stats -H "Authorization: Bearer $TOKEN"
```

## Project layout

```
src/
  server.ts        entry point: env → config → DB → migrate → listen; graceful shutdown
  app.ts           createApp({ db, config }) → Express app (used by tests)
  config.ts        loadConfig(env) → frozen config, or a ConfigError listing every problem
  db/              connection (pragmas), migration runner, seed data
  lib/             errors, list protocol (sort/range/filter → bound SQL), rounding, zod helpers, CRUD router, password hashing
  middleware/      requireAuth, error handler, 404
  modules/<name>/  router.ts, repository.ts (SQL + snake_case ↔ camelCase, row and API types), schemas.ts (zod + inferred input types)
migrations/        NNN_description.sql, applied in order and tracked in schema_migrations
scripts/           db-migrate, db-seed, db-reset
test/              Vitest + supertest; each file builds its own in-memory app
```

## Notes and additions to the spec

- **CORS allows the `Range` request header.** `ra-data-simple-rest` sends `Range: <resource>=<start>-<end>` on every `getList`. It is not a CORS-safelisted header, so without it the browser preflight fails. The header is accepted and ignored; paging uses the `range` query parameter.
- **`outOfStock` product filter** (`true` → `quantity = 0`, `false` → `quantity > 0`). The admin dashboard's "Out of stock" card links to this filtered list.
- Tokens issued before user accounts existed (`sub` = the admin email) are rejected after the upgrade, so everyone logs in once more.
- `better-sqlite3` ships prebuilt binaries for macOS, Linux and Windows, so `npm ci` does not need a compiler. npm 11 may print an "install scripts not covered by allowScripts" warning, which is safe to ignore.

## Public URL

`PUBLIC_URL` is the address where `/health` lives, without an `/api` suffix or trailing slash. It accepts an optional path prefix that a proxy strips before forwarding. Query strings, fragments and credentials are rejected. It defaults to `http://localhost:<PORT>` in development; production requires an explicit HTTPS URL.

In production, put the API behind HTTPS and set `PUBLIC_URL=https://your-api.example.com` and `TRUST_PROXY=1` for one proxy hop. `TRUST_PROXY` also accepts `false` (default), `true`, a nonnegative hop count, or comma-separated trusted IPs/subnets and `loopback`, `linklocal`, `uniquelocal`. Trust only the proxies in your deployment. `UPLOAD_MAX_FILE_MB` limits each measurement file (integer 1–500, default 50).

For a phone, start `cloudflared tunnel --url http://localhost:4000` (or `ngrok http 4000`), copy the HTTPS address to `PUBLIC_URL`, set `TRUST_PROXY=1`, and restart the API. Put that same address in `mobile/Config/API.local.xcconfig` using `https:/$()/host`. Quick tunnel addresses change on restart. Alternatively, use `http://<mac-name>.local:4000` on the same Wi-Fi. The Simulator can use `http://localhost:4000` directly. `CORS_ORIGIN` lists browser origins; it is unrelated to the API address and doesn't apply to iOS.

## Measurements

Every endpoint requires a bearer token. All active accounts can list, view, rename and delete measurements.

- `POST /api/measurements`: multipart `metadata` JSON field, required `geometry` JSON and `floorPlan` PNG files; optional `thumbnail` PNG, `model` USDZ, `csv` UTF-8 and `raw` JSON. Each part occurs once. Returns 201 plus an absolute `Location`; replaying the same `clientId` with the same account returns 200. Another account receives 409 `CONFLICT`.
- `GET /api/measurements`: standard sort/range/filter protocol. Sort by id, name, scannedAt, roomCount, totalFloorArea, createdBy, createdAt, updatedAt; default createdAt DESC. Filters: id, q, userId, createdBy, scannedAt_gte/lte (date-only upper bound includes the whole day).
- `GET /api/measurements/:id`, `PUT /api/measurements/:id` (merge name/notes only), `DELETE /api/measurements/:id` (cascades files).
- `GET /api/measurements/:id/files/:kind`: immutable authenticated bytes, SHA-256 ETag, private caching and conditional 304. Add `?download=1` for an attachment with a readable filename. Lists never load BLOBs.

Additional errors: 400 `BAD_REQUEST` for malformed/duplicate/unknown multipart parts or invalid metadata JSON; 413 `PAYLOAD_TOO_LARGE` for a file over the configured limit or metadata over 1 MB; 415 `UNSUPPORTED_MEDIA_TYPE` for non-multipart uploads; 422 `VALIDATION_ERROR` with nested field/part errors; 409 `CONFLICT` for an upload owned by another user. Files return 404 when absent. Uploads are atomic SQLite transactions and retain the uploader's email after account deletion.

With `$API` set to the base URL and `$TOKEN` from login:

```bash
curl -s -X POST "$API/api/measurements" -H "Authorization: Bearer $TOKEN" \
  -F 'metadata=<test/fixtures/metadata.json' \
  -F 'geometry=@test/fixtures/two-room-apartment.geometry.json;type=application/json' \
  -F 'floorPlan=@src/db/fixtures/sample-measurement/floor-plan.png;type=image/png'
```

`db:seed` independently inserts “Apartamento de ejemplo” when measurements is empty, with two rooms and 34 m².

### SPEC-004 notes

The geometry fixture was encoded from the actual Swift sample using JSONEncoder with sorted keys. The seed floor plan and thumbnail are temporary CoreGraphics drawings of that geometry: Xcode is unavailable here, so replacing them with exports from `FloorPlanImageRenderer` remains unverified. No API P0 requirements are skipped.

## Monthly cleaning quotes (SPEC-005)

Migrations `004_quotes` and `005_quote_defaults` install the cost model and editable workbook defaults. They also backfill existing measurements. An SQLite `AFTER INSERT` trigger creates one quote and one generation job in the measurement upload's transaction. Replaying an upload does not duplicate either. Deleting a measurement preserves its quote; deleting a quote cascades its zones, jobs and waste controls.

All routes below require a valid active-user bearer token. Catalogs use the existing JSON `sort`, `range`, `filter` and `Content-Range` protocol.

| Route | Operations |
| --- | --- |
| `/api/quote-parameters/1` | GET and merge PUT; singleton settings, source notes, revision |
| `/api/quote-zone-types` | List, create, get, merge update, delete; risk/active filters |
| `/api/quote-schedules` | List, create, get, merge update, delete; active filter |
| `/api/quote-products` | List, create, get, merge update, delete; net prices, dose units and inventory stock conversion |
| `/api/quote-location-types` | List, get, merge update of `zoneTypeId`; null filter means unmapped |
| `/api/quoting/options` | GET active schedules, traffic choices and server defaults for the phone |
| `/api/quotes` | List; search, status, calculation state, measurement, stale-settings and date filters |
| `/api/quotes/:id` | GET full zones/result/snapshot; merge PUT and DELETE. No POST collection route. |
| `/api/quotes/:id/recalculate` | POST, 202; calculate current zone inputs with current settings |
| `/api/quotes/:id/regenerate` | POST, 202; replace zone inputs from the measurement, discarding zone edits |
| `/api/measurements/:id/quote` | POST, 201; recreate a deleted quote |
| `/api/quotes/:id/waste-controls/:period` | GET and PUT `{ rows: [{ productId, actual }] }`; period `YYYY-MM`; `actual: null` deletes consumption |

Parameters and newly entered catalog/zone numbers accept at most six decimals. The exact workbook 24/7 night fraction (`11/24`) is preserved on unrelated schedule edits. Percentage parameters are fractions (`0.35`). The engine uses unrounded doubles, guards divisors and applies Excel-compatible ceiling only when a whole-person/container/cleaning count is required. Inventory links convert count, volume or mass into containers; purchase costs are informational and do not replace consumption costs.

A quote starts **Revisar**, with `ASSUMPTIONS_NOT_CONFIRMED`. Complete zones still receive preliminary figures. Missing fixture assumptions add review causes without deactivating floor work. Manual edits record their provenance and survive recalculation. Only regeneration discards zone edits. Settings changes increment a database revision, leave existing figures intact, and make calculated quotes stale. Each calculation saves the settings snapshot and input revision that produced it.

The in-process worker starts after migrations and initial-user creation. `QUOTE_WORKER` defaults to `on` (`off` is useful for tests), `QUOTE_WORKER_POLL_MS` defaults to `1000` (100–60000), and `QUOTE_JOB_MAX_ATTEMPTS` defaults to `5` (1–20). One pending job per quote is enforced in SQLite; job priority is generate > regenerate > recalculate. Requests nudge the worker. Startup recovers interrupted jobs. Failures roll back all zone/result writes and retry after 5 seconds with exponential backoff capped at 5 minutes. Exhausted jobs report `calculation.state: failed`; review results count as successful work. Shutdown stops polling before closing SQLite. Each job logs its id, kind, quote id, outcome, elapsed milliseconds and quote status, without settings/results. `db:seed` and `db:reset` drain due jobs synchronously, so the sample quote is already calculated.

Additional errors:

| Status | Message / field |
| --- | --- |
| 409 | `Zone type is in use`, `Schedule is in use`, `Quoting product is in use` — deactivate referenced rows |
| 409 | `The quote has no results yet` |
| 409 | `The measurement no longer exists` (regenerate) |
| 409 | `A quote already exists` |
| 409 | `A quoting record with this name or code already exists` |
| 422 | `Must be less than or equal to the target margin` (`minimumMargin`) |
| 422 | `Inventory unit is not compatible` (`inventoryProductId`) |
| 422 | `Does not exist`, `Must be active` (named reference field) |
| 422 | `Zone does not belong to this quote` (`zones.N.id`) |
| 422 | `Product is not in the purchase plan` (`rows.N.productId`) |
| 400 | `Invalid period; expected YYYY-MM` |

Uploads remain compatible with SPEC-004. Optional `metadata.quoting` contains schedule code, days and traffic; optional room fields contain the selected `locationType` and room-specific traffic, fixed posts and fixture counts. Unknown schedule codes are accepted at upload time, then produce a warning and fall back to server defaults. Measurements expose these inputs and a lightweight joined quote reference, without loading quote results in lists.

Example: edit one zone, preserve the other zones, then request recalculation (`API` includes `/api`, `TOKEN` is the login token):

```sh
curl -sS -H "Authorization: Bearer $TOKEN" "$API/quotes/1" \
  | jq '{zones: [.zones[] | if .position == 0 then .traffic = "high" else . end]}' > /tmp/quote-edit.json
curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data-binary @/tmp/quote-edit.json "$API/quotes/1"
curl -sS -X POST -H "Authorization: Bearer $TOKEN" "$API/quotes/1/recalculate"
```

PUT already enqueues the calculation; the final POST coalesces with that pending job. Poll GET until `calculation.state` is `done` or `failed`.

### Notes for SPEC-005

The executable golden fixtures cover Appendix A.1, A.1b, A.2, A.3 and A.4. Tests also exercise all review causes, 200 seeded random engine cases, migrations/backfill, job rollback/retry/recovery, settings validation, stock conversions, snapshots and quote/measurement lifecycles. The empty quote intentionally retains fixed contract costs; therefore zone-allocation totals are only equal to contract costs when there is an active zone with direct cost.

The workbook file was not included in the project. Numeric defaults and formulas come from the self-contained specification. Source-note helper text uses the field descriptions and cell references supplied in §3.1; verbatim workbook “Origen” prose and source URLs not transcribed into the specification are not fabricated. The editable notes allow an admin to add that provenance. All API [P1] features are implemented.

Disposable database walkthrough completed on 2026-10-16 using `npm run db:reset`, an ephemeral SQLite file, and authenticated HTTP requests:

1. Seed: **Revisar**, exactly `ASSUMPTIONS_NOT_CONFIRMED`, preliminary **251.08 USD**.
2. Confirm assumptions and process its job: **Simulación**, still **251.08 USD**.
3. Set target margin to 40%: stale flag set, old figures retained. Explicit recalculation: **272.000927 USD** (cost **163.200556 USD**).
4. Multipart-upload the SPEC-004 fixture with a fresh client UUID and quoting metadata: a second quote appears and room/default overrides have `app` provenance.
5. Save detergent consumption for `2026-10` and reload: the response and stored consumption are unchanged.

The disposable database was removed afterward. Automated admin screen tests separately render both statuses, all seven tabs, edit/settings/catalog screens and pending/slow/done polling.

The browser walkthrough also ran against a separate disposable database: confirmed assumptions in Editar, observed **Simulación / 251.08 USD**, saved the target margin as **40%**, observed **Parámetros modificados** with the old price, clicked Recalcular and observed **272.00 USD**, then saved **1.5 L** of detergent consumption and verified it remained after reloading. This caught and fixed the singleton parameter editor's post-save redirect; a regression test keeps it on `/quote-parameters/1`.


## Quote documents (SPEC-006)

All routes require a bearer token. Company and per-quote document data use merge updates, independently of engine inputs and the parameters revision.

| Method | Path | Result |
|---|---|---|
| GET, PUT | `/api/quote-document-settings/1` | Singleton issuer, signature, numbering, paper and commercial text settings, and `brandColor` (`#RRGGBB`, stored uppercase, default `#4F46E5`); other ids return 404. |
| GET | `/api/quote-document-settings/1/logo` | The company logo's bytes with its type, `ETag` (sha256) and `Cache-Control: private, no-cache`; 304 on `If-None-Match`; 404 `Logo not found` when there is none. |
| PUT | `/api/quote-document-settings/1/logo` | Replaces the logo with the raw request body (`Content-Type: image/png` or `image/jpeg`, at most 1 MB) and returns its `contentType`, `width`, `height`, `size`, `sha256`, `updatedBy` and `updatedAt`. |
| DELETE | `/api/quote-document-settings/1/logo` | Removes the logo; 204 even when there is none. |
| GET | `/api/quote-document-settings/1/signature` | The electronic signature's certificate: `signerName`, `issuerName`, `serialNumber`, `validFrom`, `validTo`, `certificateSha256`, `size`, `sha256`, `status` (`valid`, `expired` or `unavailable`), `updatedBy`, `updatedAt`; 404 `Signature not found` when there is none. Never the file or its password. |
| PUT | `/api/quote-document-settings/1/signature` | `{ file, password }`: the `.p12` in base64 (at most 64 KB) and its password. Replaces the signature and answers as GET. |
| DELETE | `/api/quote-document-settings/1/signature` | Removes the signature; 204 even when there is none. |
| GET, PUT | `/api/quotes/:id/document` | Readiness, all blockers/warnings, raw client/document data, defaults, resolved Spanish model, hash, revision and filenames. |
| GET | `/api/quotes/:id/document/pdf` | Embedded Poppins PDF, inline; `?download=1` selects attachment. |
| GET | `/api/quotes/:id/document/xlsx` | Literal-value, two-sheet Excel workbook; the same disposition option. |
| POST | `/api/quotes/:id/document/exports` | `{format, contentHash}` registers the previewed content atomically, freezes the number and returns its revision. |
| GET | `/api/quotes/:id/document/exports` | Latest 100 exports, newest first. |

A logo must be an 8-bit, non-interlaced RGB or RGBA PNG, or an RGB JPEG without EXIF metadata, at most 2000 px a side. Anything else is refused before it is stored: 415 for another content type, 413 above 1 MB, and 422 with `errors.logo` for corrupt or unsupported images. PNGs are fully inflated and checked first, because the PDF library decodes them where an error would stop the process. The admin re-encodes every upload in the browser, so its uploads always qualify.

The document model carries the logo's metadata (sha256, type, size) and the colors derived from `brandColor`: bands in the color itself, white or navy text on them by contrast, headings darkened toward navy until they read at 4.5:1 on white, and a 10% tint for rows (`colors.ts`). A new logo or color is a new revision, like any other settings change. Each file request reads the logo once, before rendering, so the document and its bytes always match. Without a logo, the PDF and the workbook print the trade name in its place: installs upgraded from the bundled CleanCode logo show the trade name until a logo is uploaded. The export log stores the logo's metadata, never its bytes. The bytes are a file, `FILES_PATH/logos/<sha256>.png|jpg`; the `quote_document_logo` row keeps only the logo's details, and a row whose file is missing counts as no logo.

Files have `Cache-Control: no-store`, `X-Document-Hash` and `X-Document-Revision` (both exposed through CORS). Fetching a preview does not register an export. A changed hash returns `409 DOCUMENT_CHANGED` without inserting anything. The audit row stores the allow-listed document model, exporter and timestamp. Quote deletion cascades to document data and history.

The pure builder resolves dates, Spanish text, largest-remainder line allocation, VAT in cents, amount in words and optional contract value before either renderer runs. Only the offered price, commercial scope and supplied party data enter files; internal calculations and creator identity are excluded. Each rendering logs only quote id, format, revision, byte count and elapsed milliseconds.

```sh
curl -f -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4000/api/quotes/1/document/pdf?download=1' \
  -o cotizacion.pdf
```

This curl example retrieves bytes only. The admin registers `/document/exports` with the preview hash before saving those exact bytes.

### Notes for SPEC-006

All P1 features are implemented: global line mode, Spanish amount in words, contract value, margin confirmation, quote-list document action and download history. P2 features remain optional future work.

The document model additionally carries `metadata.subject` and `metadata.issueInstant`, resolved by the builder, so renderers never derive the site name or timezone offset. Excel print-title names are the built-in names required by repeated print headers; no custom defined names exist. ExcelJS's missing TypeScript enum entry for Letter is represented by the standard OOXML paper id 1. Assets are Poppins Regular/SemiBold with the OFL license; the former bundled logo's 800-pixel PNG is now the fixture company's logo in `test/fixtures/quote-document/logo.png`.

Regenerate the committed web workbook/model fixtures and the temporary PDF with `node scripts/document-fixture.ts` from `api/`. The test party identities are explicitly fictional fixtures; they are never seeded into company settings. PDF text, metadata, privacy, 100-zone performance, workbook structure/types, routes, rounding, revision and auth checks run in `npm test`.

Dependency notes: the specified ExcelJS 4.4 dependency has deprecated transitive packages, so `npm ci` emits upstream deprecation notices. Its UUID dependency is overridden to compatible v11 to address the published buffer-bounds advisory; the PDF test reader uses patched PDF.js 6. No runtime application warnings are expected from the new feature.


SPEC-006 verification on 2026-10-16 used `npm run db:reset` with `/tmp/spec006/walkthrough.db` (API port 4016; isolated admin port 5176). No normal development database was changed.

1. The initial Documento page showed Revisar, the five missing issuer/payment requirements and both missing client fields, with disabled downloads.
2. Saved fictional issuer data through Empresa y plantilla, completed the client form, and confirmed assumptions through the quote editor. The PDF preview showed `COT-00001`, lines **147.69 / 103.39**, subtotal **251.08**, IVA **37.66**, and total **288.74**. Optional installation/city/contact fields were omitted.
3. Downloaded PDF and Excel through the page; the stored history contains both formats as **Rev. 1**. Reading the saved workbook confirmed both sheets and exactly those numeric line amounts and totals.
4. Authenticated HTTP verification changed the contact: **Rev. 2**, with `-Rev2.pdf`; registered and saved that exact preview response. A subsequent payment-term change made the old hash return **409 DOCUMENT_CHANGED**, with no extra export row. Component tests independently verify that a rejected export saves no blob and refreshes state.

Manual verification limitation: the native browser accessibility driver changed the tab's reported selection without dispatching its React click handler (no XLSX request in the trace); pointer fallback then failed with `noWindowsAvailable`, and desktop viewer automation timed out. The visual Excel-tab and desktop-viewer portions of the manual walkthrough could not be completed with that driver. Automated tests click the actual page's Excel tab, parse the committed API workbook and verify both sheet tabs, merged cells, logo and formatted amounts. The exact ExcelJS browser distribution separately parsed the downloaded workbook successfully. No application feature or P1 item is omitted.

VAT multiplication uses BigInt before integer division, so the largest permitted manual price also retains exact cents. Spanish words cover the specified range and larger safe integers, including “mil millones”, so that valid large prices can still be exported.

## Electronic signature (SPEC-008)

A company may load its Ecuadorian electronic signature, the `.p12` (or `.pfx`) its legal representative signs with in FirmaEC, through `PUT /api/quote-document-settings/1/signature` (the Empresa page). It is optional and never blocks a document. While it can sign, every quote PDF is signed with it (`adbe.pkcs7.detached`, SHA-256, the holder's certificate and its chain, in an invisible signature field) and carries its stamp in the company's acceptance box: a QR code and "Firmado electrónicamente por:" with the holder's name. The QR reads, one line each, `FIRMADO POR`, `RAZON: Cotización {number}`, `LOCALIZACION` (the company's city, when set), `FECHA` (when the PDF was generated, ISO 8601 in `QUOTE_DOCUMENT_TIMEZONE`) and `VALIDAR CON: www.firmadigital.gob.ec`. The workbook is neither signed nor stamped.

- **Reading the file.** node-forge opens the formats Ecuadorian authorities issue (RC2-40 and 3DES with a SHA-1 MAC, which Node's OpenSSL 3 refuses) and today's (AES-256, PBKDF2, SHA-256). The signing key is the one whose certificate may sign, so Banco Central's files, which also hold an encryption key, work. Refusals are 422 `VALIDATION_ERROR` with `errors.file` or `errors.password`: `Must be a PKCS#12 (.p12 or .pfx) file`, `Must be at most 64 KB`, `Wrong password`, `Must contain an RSA private key and its certificate`, `Uses unsupported encryption` (also any file asking for more than 100 000 key-derivation iterations, which forge would compute synchronously), `The certificate has expired`, `The certificate is not valid yet`.
- **Storage.** The `.p12` and its password are sealed together (AES-256-GCM, with a key derived from `JWT_SECRET`) as `FILES_PATH/signatures/<sha256>.sealed`; the `quote_document_signature` row (migration `009`) keeps only the certificate's details. Neither the database nor the files alone reveal the password. As with the logo, a row whose file is missing counts as no signature and `db:reset` deletes the folder. After `JWT_SECRET` changes the signature reads `status: "unavailable"` until it is loaded again.
- **Documents.** The model carries `signature` (holder, certificate hash, reason, location) only while the company signs, so loading, replacing or removing a signature is a new revision, and documents of companies that never sign keep their hash. An expired or unavailable signature leaves the PDF unsigned and adds the warning `SIGNATURE_EXPIRED` or `SIGNATURE_UNAVAILABLE`. The PDF is signed when it is generated; the admin saves the bytes it previewed, so the file carries the preview's time.

Regenerate the test signatures (a test authority, its signer and her `.p12` files, password `clave-de-prueba`) with `node scripts/signature-fixtures.ts`; it needs the `openssl` CLI.

### Notes for SPEC-008

`npm test` checks signed PDFs with Node's own crypto rather than forge: the byte ranges cover the whole file but the signature, the signed digest matches, the signature opens with the holder's key, and the certificate comes from the test authority. On 2026-10-17 a signed fixture quote also passed poppler's `pdfsig` ("Signature is Valid", "Total document signed"; the test authority is, rightly, untrusted), and its QR decoded to the lines above at 300, 150 and 110 dpi. A browser walkthrough on a disposable database (API port 4017, admin port 5177) showed Empresa without a signature, with one (the stamp, holder, issuer, expiry), expired and removed, and the Documento preview with the stamp on the company's line and, once expired, the warning with **Ir a Empresa**. The browser automation can't attach a `.p12` file, so that walkthrough loaded the test signature through the API; the dialog itself is covered by the admin's component tests.
