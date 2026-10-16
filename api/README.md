# Cleaning Inventory API

REST backend for the cleaning products inventory ([SPEC-002](../spec/SPEC-002.md)). It stores categories, suppliers, products and an append-only ledger of **stock movements**. A product's on-hand quantity changes only through movements, so every change is auditable.

Stack: Node.js 24 (≥ 22), Express 5, SQLite (`better-sqlite3`), zod, JWT auth. Plain JavaScript ES modules with no build step.

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

Every setting comes from environment variables. `src/server.js` loads `api/.env` with dotenv, and real environment variables take precedence over the file. Invalid or missing values stop the process with exit code 1, and **every** problem is listed by variable name.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `test` or `production` |
| `PORT` | no | `4000` | HTTP port (1–65535) |
| `DATABASE_PATH` | no | `./data/inventory.db` | SQLite file, relative to `api/`. `:memory:` is allowed. The parent directory is created if missing. |
| `CORS_ORIGIN` | **yes** | – | Comma-separated origins allowed to call the API, e.g. `http://localhost:5173` |
| `JWT_SECRET` | **yes** | – | At least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | `8h` | Token lifetime (`30m`, `8h`, `7d`, …) |
| `ADMIN_EMAIL` | **yes** | – | Email of the single admin account |
| `ADMIN_PASSWORD` | **yes** | – | At least 8 characters |
| `LOG_LEVEL` | no | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent` |

With `NODE_ENV=production`, startup also fails if `JWT_SECRET` or `ADMIN_PASSWORD` still has its `.env.example` placeholder value.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start with `node --watch` (restarts on change) |
| `npm start` | Start the server |
| `npm test` | Run the Vitest suite (in-memory SQLite; no `.env` needed) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply pending `migrations/NNN_*.sql` files |
| `npm run db:seed` | Seed demo data, only if there are no products yet |
| `npm run db:reset` | Delete the DB file (plus `-wal`/`-shm`), migrate and seed |

Migrations also run automatically on startup. `SIGINT`/`SIGTERM` close the HTTP server and the database before the process exits.

## HTTP conventions

- Resources live under `/api`. The health check is `GET /health` (public).
- JSON in, JSON out. The body limit is 100 kB. Responses use camelCase.
- Every `/api/*` route except `POST /api/auth/login` needs `Authorization: Bearer <token>`.
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
| 409 | `CONFLICT` | Duplicate name or SKU; deleting a record that is still referenced |
| 409 | `INSUFFICIENT_STOCK` | `OUT` larger than the quantity on hand |
| 422 | `VALIDATION_ERROR` | Invalid body, or a referenced id that does not exist |
| 429 | `RATE_LIMITED` | More than 10 login attempts per 15 minutes per IP |
| 500 | `INTERNAL_ERROR` | Unexpected error (details hidden in production) |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{"status":"ok","db":"ok"}`, or 503 if the DB check fails |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, expiresAt, user: { email } }` |
| GET | `/api/auth/me` | `{ email }` |
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
  -H 'Content-Type: application/json' -d '{"name":"Kitchen"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')

curl -s -X POST $API/api/products -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{
  \"sku\": \"kit-degr-1\", \"name\": \"Kitchen degreaser\", \"categoryId\": $CATEGORY_ID,
  \"unit\": \"L\", \"reorderLevel\": 5, \"unitCost\": 3.2, \"hazardous\": true, \"initialQuantity\": 10
}"
# → 201 {"id":18,"sku":"KIT-DEGR-1",...,"quantity":10,"stockValue":32,...}

# Record usage
curl -s -X POST $API/api/stock-movements -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":18,"type":"OUT","quantity":4,"reason":"Used at Office Tower job","reference":"WO-1042"}'
# → 201 {"type":"OUT","quantity":4,"delta":-4,"balanceAfter":6,...}

# Too much → 409 INSUFFICIENT_STOCK, nothing changes
curl -s -X POST $API/api/stock-movements -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":18,"type":"OUT","quantity":7}'

# Physical count
curl -s -X POST $API/api/stock-movements -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"productId":18,"type":"ADJUSTMENT","quantity":5,"reason":"Monthly count"}'
# → delta -1, balanceAfter 5

# Archive instead of delete (products with history cannot be deleted)
curl -s -X PUT $API/api/products/18 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"active":false}'

curl -s $API/api/stats -H "Authorization: Bearer $TOKEN"
```

## Project layout

```
src/
  server.js        entry point: env → config → DB → migrate → listen; graceful shutdown
  app.js           createApp({ db, config }) → Express app (used by tests)
  config.js        loadConfig(env) → frozen config, or a ConfigError listing every problem
  db/              connection (pragmas), migration runner, seed data
  lib/             errors, list protocol (sort/range/filter → bound SQL), rounding, zod helpers, CRUD router
  middleware/      requireAuth, error handler, 404
  modules/<name>/  router.js, repository.js (SQL + snake_case ↔ camelCase), schemas.js (zod)
migrations/        NNN_description.sql, applied in order and tracked in schema_migrations
scripts/           db-migrate, db-seed, db-reset
test/              Vitest + supertest; each file builds its own in-memory app
```

## Notes and additions to the spec

- **CORS allows the `Range` request header.** `ra-data-simple-rest` sends `Range: <resource>=<start>-<end>` on every `getList`. It is not a CORS-safelisted header, so without it the browser preflight fails. The header is accepted and ignored; paging uses the `range` query parameter.
- **`outOfStock` product filter** (`true` → `quantity = 0`, `false` → `quantity > 0`). The admin dashboard's "Out of stock" card links to this filtered list.
- Login tokens are only accepted while their `sub` matches the current `ADMIN_EMAIL`, so changing the admin email invalidates old sessions.
- `better-sqlite3` ships prebuilt binaries for macOS, Linux and Windows, so `npm ci` does not need a compiler. npm 11 may print an "install scripts not covered by allowScripts" warning, which is safe to ignore.
