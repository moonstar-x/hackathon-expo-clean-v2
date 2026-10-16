# SPEC-002: Cleaning Products Inventory (API + Admin UI)

| | |
|---|---|
| **Status** | Draft |
| **Date** | 2026-10-16 |
| **Deliverables** | `api/`: REST backend (Node.js + Express) · `admin/`: web UI (React Admin + Vite) |
| **Audience** | An implementing agent. Every requirement here is meant to be implemented as written; where a choice was made on the user's behalf it is listed in §3. |

The keywords **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in RFC 2119.

---

## 1. Summary

A cleaning company needs to know which cleaning products it has, how much of each is on hand, and when to reorder. This project delivers:

1. **`api/`**: a small ERP-style inventory backend. It stores categories, suppliers, products and an append-only ledger of **stock movements** (receipts, usage, count adjustments). A product's on-hand quantity changes only through movements, so every change is auditable.
2. **`admin/`**: a React Admin single-page app for staff to manage the catalog, record stock movements, and watch low-stock items on a dashboard.

The two services are **independent**. Each has its own `package.json`, lockfile, `.env` and README, and they share no code. They communicate only over HTTP, and each can be installed, run, tested and deployed without the other.

## 2. Goals and non-goals

### Goals
- CRUD for categories, suppliers and products.
- Record stock movements (`IN`, `OUT`, `ADJUSTMENT`). The server keeps product quantities consistent and never lets stock go negative.
- Show low-stock and out-of-stock products, plus total stock value.
- Simple single-admin authentication.
- All runtime configuration comes from environment variables, with `.env` files for local development.
- Automated tests for the API, plus type-checking, lint and build checks for the admin.

### Non-goals
See §11. In short, this release excludes multiple warehouses, multiple users or roles, purchase/sales orders, invoicing, costing methods, lot/expiry tracking, i18n and containerization.

## 3. Decisions and assumptions

| Topic | Decision | Rationale |
|---|---|---|
| Runtime | Node.js **24 LTS** (minimum 22). Each service has `.nvmrc` with `24` and `"engines": {"node": ">=22"}`. | Current LTS line. |
| API framework | **Express 5** (`express@^5`), JavaScript **ES modules**, no build step. | Express 5 forwards rejected promises from async handlers to the error middleware natively. A "simple backend" doesn't need a TypeScript build. |
| Database | **SQLite** via `better-sqlite3`, with the file path set by env. | No extra infrastructure. Synchronous transactions make stock updates atomic. Postgres is listed as future work. |
| Validation | `zod` for env config and request bodies. | One library for both jobs. |
| Auth | One admin account defined by env vars. Login returns a **JWT** (HS256, `jsonwebtoken`), sent as `Authorization: Bearer`. | This is the smallest real auth that still protects the data. Users and roles are out of scope. |
| API ↔ UI contract | The API implements the **`ra-data-simple-rest`** HTTP convention (§6.3). The admin uses that provider off the shelf, wrapped only to add the auth header. | Plain REST that any client can use, and it needs no custom data provider code. |
| Admin stack | **react-admin 5.x** + `ra-data-simple-rest` 5.x, **Vite** (latest stable), **TypeScript**, React version as required by react-admin 5. | The user requested React Admin and Vite. TS is the Vite/react-admin default. |
| Quantities | Decimals allowed, max **3** decimal places (e.g. 2.5 L). Money: `unitCost` max **4** decimals, `stockValue` rounded to **2**. | Cleaning chemicals are often measured in fractional litres or kilograms. |
| Currency | Display-only, from admin env `VITE_CURRENCY` (default `USD`). | The API stores plain numbers. |
| Language | UI text in English. | i18n is future work. |
| Package manager | **npm**. | Default, no extra tooling. |
| Tests | **Vitest** in both services. The API also uses `supertest`. | One test runner across the repo. |

## 4. Repository layout

```
/
├── README.md                 # what the project is, how to run each service (links to service READMEs)
├── .gitignore                # node_modules, .env, dist, api/data/*.db*, coverage
├── spec/
│   └── SPEC-002.md
├── api/
│   ├── .env.example
│   ├── .nvmrc
│   ├── README.md             # setup, env vars, endpoint reference with curl examples
│   ├── package.json
│   ├── eslint.config.js
│   ├── vitest.config.js
│   ├── migrations/
│   │   └── 001_init.sql
│   ├── src/
│   │   ├── server.js         # entry: load config, open DB, migrate, listen, graceful shutdown
│   │   ├── app.js            # createApp({ db, config }) → express app (no listen; used by tests)
│   │   ├── config.js         # loadConfig(env) → validated, typed config object (throws on error)
│   │   ├── db/
│   │   │   ├── connection.js # openDatabase(path) with pragmas
│   │   │   ├── migrate.js    # runs migrations/*.sql in order, tracked in schema_migrations
│   │   │   └── seed.js       # seed data (§6.10)
│   │   ├── lib/
│   │   │   ├── errors.js     # HttpError + subclasses / factory helpers
│   │   │   ├── listQuery.js  # parse sort/range/filter (§6.3)
│   │   │   └── numbers.js    # round(n, decimals), decimal-places validation
│   │   ├── middleware/
│   │   │   ├── auth.js       # requireAuth
│   │   │   ├── errorHandler.js
│   │   │   └── notFound.js
│   │   └── modules/
│   │       ├── auth/         # router.js
│   │       ├── categories/   # router.js, repository.js, schemas.js
│   │       ├── suppliers/
│   │       ├── products/
│   │       ├── stockMovements/
│   │       └── stats/
│   ├── scripts/              # db-migrate.js, db-seed.js, db-reset.js
│   └── test/
└── admin/
    ├── .env.example
    ├── .nvmrc
    ├── README.md
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig*.json
    ├── eslint.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx           # <Admin> with resources, dashboard, providers
        ├── config.ts         # reads + validates import.meta.env
        ├── vite-env.d.ts     # ImportMetaEnv typings for VITE_* vars
        ├── types.ts          # Category, Supplier, Product, StockMovement, Stats
        ├── providers/
        │   ├── httpClient.ts
        │   ├── authProvider.ts
        │   └── dataProvider.ts
        ├── dashboard/
        ├── resources/
        │   ├── products/
        │   ├── stockMovements/
        │   ├── categories/
        │   └── suppliers/
        └── utils/format.ts   # quantity, currency, date formatting
```

There is **no** root `package.json` and no npm workspaces. `admin/` MUST NOT import anything from `api/`, and vice versa.

---

## 5. Domain model

### 5.1 Conventions (apply to every resource)

- `id`: positive integer, assigned by the server.
- `createdAt` / `updatedAt`: ISO 8601 UTC strings with milliseconds (`new Date().toISOString()`), set by the server.
- The API uses **camelCase** JSON. The DB uses **snake_case** columns. Repositories map between them.
- Booleans are JSON `true`/`false` in the API and `INTEGER 0/1` in SQLite.
- Strings are trimmed. For nullable fields, an empty string after trimming is stored as `null`. For required fields, an empty string fails validation.
- Read-only fields (`id`, `createdAt`, `updatedAt`, and anything marked *read-only* below) and unknown fields in request bodies are **silently ignored**, not rejected. React Admin sends the full record on update, so rejecting them would break the UI.
- Numbers must be finite JSON numbers (numeric strings are rejected), `>= 0` unless stated otherwise, and `<= 1_000_000_000`.
- **Rounding:** use one helper, `round(n, d) = Math.round((n + Number.EPSILON) * 10**d) / 10**d`. Apply it after **every** arithmetic operation on quantities (d=3) and money (d=2 for `stockValue`) so that float error never builds up. Example: `0.1 + 0.2` must be stored as `0.3`.
- A value with more decimal places than allowed is a validation error (422). It is not silently rounded.

### 5.2 Category

| Field | Type | Rules |
|---|---|---|
| `id` | integer | read-only |
| `name` | string | required, 1–100 chars, unique (case-insensitive) |
| `description` | string \| null | ≤ 500 chars |
| `createdAt`, `updatedAt` | string | read-only |

### 5.3 Supplier

| Field | Type | Rules |
|---|---|---|
| `id` | integer | read-only |
| `name` | string | required, 1–150 chars, unique (case-insensitive) |
| `contactName` | string \| null | ≤ 150 chars |
| `email` | string \| null | valid email, ≤ 254 chars |
| `phone` | string \| null | ≤ 50 chars |
| `notes` | string \| null | ≤ 1000 chars |
| `createdAt`, `updatedAt` | string | read-only |

### 5.4 Product

| Field | Type | Rules |
|---|---|---|
| `id` | integer | read-only |
| `sku` | string | required, 1–50 chars, `^[A-Za-z0-9._-]+$`, stored **uppercased**, unique |
| `name` | string | required, 1–150 chars |
| `description` | string \| null | ≤ 1000 chars |
| `categoryId` | integer | required, must reference an existing category |
| `supplierId` | integer \| null | if set, must reference an existing supplier |
| `unit` | enum | required: `unit`, `box`, `pack`, `roll`, `pair`, `L`, `mL`, `gal`, `kg`, `g`. Cannot be changed once the product has any stock movement (422 on `unit`). |
| `quantity` | number | **read-only**. On-hand stock, ≥ 0, ≤ 3 decimals. Changed only by stock movements. |
| `reorderLevel` | number | required on create (UI default 0), ≥ 0, ≤ 3 decimals |
| `unitCost` | number | optional, default 0, ≥ 0, ≤ 4 decimals. Cost per one `unit`. |
| `location` | string \| null | ≤ 100 chars (e.g. "Warehouse A / Shelf 3") |
| `hazardous` | boolean | default `false` (corrosive or toxic chemicals) |
| `sdsUrl` | string \| null | Safety Data Sheet link. Must be an `http(s)://` URL, ≤ 500 chars. |
| `active` | boolean | default `true`. Use `false` to archive discontinued products. |
| `isLowStock` | boolean | **read-only, computed**: `quantity <= reorderLevel` |
| `stockValue` | number | **read-only, computed**: `round(quantity * unitCost, 2)` |
| `createdAt`, `updatedAt` | string | read-only |

**Create-only field:** `initialQuantity` (number, optional, ≥ 0, ≤ 3 decimals). If it is > 0, the server creates the product **and** an `IN` movement for that amount (`reason: "Initial stock"`) in a single transaction. Then `quantity` equals `initialQuantity`. On update, `initialQuantity` is ignored.

Example product (response body):

```json
{
  "id": 7,
  "sku": "DIS-BLEACH-5",
  "name": "Sodium hypochlorite bleach 5%",
  "description": "General-purpose disinfectant, sold in 5 L jugs",
  "categoryId": 1,
  "supplierId": 2,
  "unit": "L",
  "quantity": 40,
  "reorderLevel": 20,
  "unitCost": 1.35,
  "location": "Warehouse A / Shelf 2",
  "hazardous": true,
  "sdsUrl": "https://example.com/sds/bleach.pdf",
  "active": true,
  "isLowStock": false,
  "stockValue": 54,
  "createdAt": "2026-10-16T14:03:11.512Z",
  "updatedAt": "2026-10-16T14:03:11.512Z"
}
```

### 5.5 Stock movement

Movements are an **append-only ledger**. They cannot be updated or deleted. To correct a mistake, record a new movement.

| Field | Type | Rules |
|---|---|---|
| `id` | integer | read-only |
| `productId` | integer | required, must reference an existing product |
| `type` | enum | required: `IN` (received/purchased), `OUT` (used/consumed/discarded), `ADJUSTMENT` (physical count) |
| `quantity` | number | required, ≤ 3 decimals. For `IN`/`OUT`: the amount moved, **> 0**. For `ADJUSTMENT`: the **counted on-hand quantity**, **≥ 0**. |
| `delta` | number | **read-only**. Signed change applied to stock: `IN` → `+quantity`; `OUT` → `−quantity`; `ADJUSTMENT` → `quantity − previousQuantity` (may be 0). |
| `balanceAfter` | number | **read-only**. Product quantity right after this movement. |
| `reason` | string \| null | ≤ 255 chars (e.g. "Monthly restock", "Used at Office Tower job") |
| `reference` | string \| null | ≤ 100 chars (e.g. PO number, work-order number) |
| `createdBy` | string | **read-only**. Email of the authenticated user. |
| `createdAt` | string | read-only |

Movements on inactive products are allowed.

### 5.6 Invariants (MUST always hold and MUST be covered by tests)

1. `product.quantity >= 0`.
2. `product.quantity == round(SUM(delta) of its movements, 3)`.
3. For every movement, `balanceAfter` equals the running sum of `delta` up to and including that movement, when movements are ordered by `id`.
4. A failed request never leaves a partial write. Product creation with an initial movement, and movement creation with its product update, each happen inside a single DB transaction.

---

## 6. API service (`api/`)

### 6.1 Stack and dependencies

- Runtime deps: `express@^5`, `better-sqlite3`, `zod`, `jsonwebtoken`, `cors`, `helmet`, `express-rate-limit`, `pino`, `pino-http`, `dotenv`.
- Dev deps: `vitest`, `supertest`, `eslint`, `@eslint/js`, `globals`.
- `"type": "module"` in `package.json`.

### 6.2 Configuration

`src/config.js` exports `loadConfig(env = process.env)`. It validates `env` with zod and returns a frozen config object. `server.js` calls `dotenv.config()` (real environment variables take precedence over `.env`) and then `loadConfig()`. If any value is invalid, the process MUST exit with code 1 and print **every** invalid or missing variable by name. Tests build their config by passing an object straight to `loadConfig`, not by touching `process.env`.

| Variable | Required | Default | Rules / meaning |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `4000` | integer 1–65535 |
| `DATABASE_PATH` | no | `./data/inventory.db` | SQLite file path, relative to `api/`. `:memory:` is allowed (used by tests). Parent dir is created if missing. |
| `CORS_ORIGIN` | **yes** | – | Comma-separated list of allowed origins, e.g. `http://localhost:5173`. |
| `JWT_SECRET` | **yes** | – | ≥ 32 chars |
| `JWT_EXPIRES_IN` | no | `8h` | Any duration string accepted by `jsonwebtoken` (`30m`, `8h`, `7d`) |
| `ADMIN_EMAIL` | **yes** | – | valid email |
| `ADMIN_PASSWORD` | **yes** | – | ≥ 8 chars |
| `LOG_LEVEL` | no | `info` | pino level (`fatal`…`trace`, `silent`) |

When `NODE_ENV=production`, startup MUST also fail if `JWT_SECRET` or `ADMIN_PASSWORD` still equals the placeholder value from `.env.example`.

`api/.env.example` (committed; `.env` is git-ignored):

```dotenv
# HTTP
PORT=4000
NODE_ENV=development
# Comma-separated list of origins allowed to call the API (the admin UI URL)
CORS_ORIGIN=http://localhost:5173

# Storage
DATABASE_PATH=./data/inventory.db

# Auth: the single admin account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-please
# At least 32 characters. Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=replace-with-a-long-random-string-of-32-plus-chars
JWT_EXPIRES_IN=8h

LOG_LEVEL=info
```

### 6.3 HTTP conventions

**Base path.** All resource endpoints live under `/api`. The health check is at `/health`.

**Content type.** Request and response bodies are `application/json`. The JSON body limit is 100 kB.

**List query protocol** (compatible with `ra-data-simple-rest` 5.x). Every collection endpoint `GET /api/<resource>` accepts three optional query params, each a **JSON-encoded** string:

| Param | Format | Default | Meaning |
|---|---|---|---|
| `sort` | `["<field>","ASC"\|"DESC"]` | resource default (§6.6) | `field` must be in the resource's sortable whitelist. Text sorts are case-insensitive. Ties are always broken by `id ASC`. |
| `range` | `[start, end]` | `[0, 24]` | Inclusive, zero-based row indexes. `start >= 0`, `end >= start`, `end - start + 1 <= 1000`. |
| `filter` | JSON object | `{}` | Keys must be in the resource's filter whitelist (§6.6). Every resource also supports `id` (integer or array of integers, used by `getMany`) and `q` (case-insensitive substring search; an empty string is ignored). Multiple keys are combined with AND. Array values mean "in". |

Example: `GET /api/products?sort=["name","ASC"]&range=[0,24]&filter={"categoryId":3,"lowStock":true}`

**List response.**
- Body: a JSON **array** of records.
- Header `Content-Range: <resource> <start>-<end>/<total>`, e.g. `products 0-24/319`. Here `end` is `start + returnedCount - 1`. If no rows are returned, send `products */<total>`. `total` is the count of all rows matching the filter, ignoring `range`.
- CORS MUST expose this header (`Access-Control-Expose-Headers: Content-Range`). Without it, React Admin cannot read the total.

**Single-record endpoints.**

| Operation | Request | Success |
|---|---|---|
| getOne | `GET /api/<resource>/:id` | 200, record |
| create | `POST /api/<resource>` | 201, created record |
| update | `PUT /api/<resource>/:id` | 200, updated record. **Merge semantics:** fields absent from the body keep their current value. The merged result is validated as a whole. |
| delete | `DELETE /api/<resource>/:id` | 200, the deleted record as it was before deletion |

A non-integer or non-positive `:id`, or an id that does not exist, returns **404**.

`LIKE` search input MUST escape `%`, `_` and the escape character itself.

**Error format.** Every non-2xx response has this body:

```json
{
  "message": "Human-readable summary shown in the UI",
  "code": "VALIDATION_ERROR",
  "errors": { "sku": "SKU already exists", "categoryId": "Category 99 does not exist" }
}
```

`errors` is optional. When present, it maps **field names to one message string each**. React Admin shows these next to the matching form inputs. The top-level `message` appears in the notification toast.

| Status | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON body; `sort`/`range`/`filter` that is not valid JSON or has the wrong shape; unknown sort field or filter key |
| 401 | `UNAUTHORIZED` | Missing, malformed, invalid or expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password at login |
| 404 | `NOT_FOUND` | Unknown record or route |
| 405 | `METHOD_NOT_ALLOWED` | `PUT`/`DELETE` on stock movements |
| 409 | `CONFLICT` | Unique constraint (`errors` names the field); deleting a record that is still referenced |
| 409 | `INSUFFICIENT_STOCK` | `OUT` larger than on-hand quantity (`errors.quantity` set) |
| 422 | `VALIDATION_ERROR` | Body fails validation, or a referenced id does not exist (`errors` populated) |
| 429 | `RATE_LIMITED` | Too many login attempts |
| 500 | `INTERNAL_ERROR` | Anything unexpected. In production, the message is generic and no stack trace is sent. The error is always logged. |

### 6.4 Authentication

- `POST /api/auth/login`, body `{ "email": string, "password": string }`.
  - The email is compared case-insensitively against `ADMIN_EMAIL`. The password is compared against `ADMIN_PASSWORD` in **constant time**: hash both values with SHA-256, then compare the hashes with `crypto.timingSafeEqual`.
  - 200 → `{ "token": "<jwt>", "expiresAt": "<ISO>", "user": { "email": "admin@example.com" } }`
  - 401 `INVALID_CREDENTIALS` on any mismatch. The response MUST NOT reveal which field was wrong.
  - Rate-limited to **10 requests per 15 minutes per IP** (`express-rate-limit`). The limiter is created inside `createApp`, so each test app starts with a fresh limiter.
- JWT: HS256, signed with `JWT_SECRET`, payload `{ sub: <email> }`, `exp` from `JWT_EXPIRES_IN`.
- `GET /api/auth/me` (authenticated) → `{ "email": "<sub>" }`.
- Every `/api/*` route except `/api/auth/login` requires `Authorization: Bearer <token>`. The `requireAuth` middleware sets `req.user = { email }`.
- `/health` is public.

### 6.5 Endpoint reference

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | – | `200 {"status":"ok","db":"ok"}` after a `SELECT 1`. If the DB check fails: `503 {"status":"error","db":"error"}`. |
| POST | `/api/auth/login` | – | §6.4 |
| GET | `/api/auth/me` | ✔ | §6.4 |
| GET, POST | `/api/categories` | ✔ | list / create |
| GET, PUT, DELETE | `/api/categories/:id` | ✔ | |
| GET, POST | `/api/suppliers` | ✔ | |
| GET, PUT, DELETE | `/api/suppliers/:id` | ✔ | |
| GET, POST | `/api/products` | ✔ | POST accepts `initialQuantity` |
| GET, PUT, DELETE | `/api/products/:id` | ✔ | `quantity` in PUT is ignored |
| GET, POST | `/api/stock-movements` | ✔ | |
| GET | `/api/stock-movements/:id` | ✔ | |
| PUT, DELETE | `/api/stock-movements/:id` | ✔ | Always `405 METHOD_NOT_ALLOWED` |
| GET | `/api/stats` | ✔ | §6.8 |

Any other path returns a 404 in the error format. (In Express 5, register a final `app.use((req, res) => …)` handler; do not use a bare `*` route pattern.)

### 6.6 Resource rules

| Resource | Content-Range name | Sortable fields | Default sort | Filter keys (besides `id`, `q`) | `q` searches |
|---|---|---|---|---|---|
| categories | `categories` | `id`, `name`, `createdAt`, `updatedAt` | `name ASC` | – | `name`, `description` |
| suppliers | `suppliers` | `id`, `name`, `contactName`, `email`, `createdAt`, `updatedAt` | `name ASC` | – | `name`, `contactName`, `email` |
| products | `products` | `id`, `sku`, `name`, `categoryId`, `supplierId`, `quantity`, `reorderLevel`, `unitCost`, `stockValue`, `active`, `createdAt`, `updatedAt` | `name ASC` | `categoryId`, `supplierId`, `unit`, `active`, `hazardous`, `lowStock` | `sku`, `name`, `description` |
| stock-movements | `stock-movements` | `id`, `createdAt`, `productId`, `type`, `quantity`, `delta` | `createdAt DESC` | `productId`, `type`, `createdBy`, `createdAt_gte`, `createdAt_lte` | `reason`, `reference` |

Filter semantics:
- `lowStock: true` → `quantity <= reorder_level`. `lowStock: false` → `quantity > reorder_level`.
- `active`, `hazardous`: boolean equality.
- `productId`, `categoryId`, `supplierId`, `type`, `unit`: equality, or "in" when the value is an array.
- `createdAt_gte` / `createdAt_lte`: inclusive bounds. They accept a full ISO datetime or a date `YYYY-MM-DD`. A date-only value means `T00:00:00.000Z` for `_gte` and `T23:59:59.999Z` for `_lte`. Invalid dates → 400.

Delete rules (check in the application, then rely on `ON DELETE RESTRICT` as a backstop):
- **Category**: 409 `CONFLICT` if any product references it. Message: `Category "<name>" is used by N product(s)`.
- **Supplier**: 409 if any product references it.
- **Product**: 409 if it has any stock movements. Message: `Product has stock history; set it inactive instead`.

Uniqueness (409 `CONFLICT`, with `errors.<field>`): category `name`, supplier `name`, product `sku`. Detect it with a pre-check or by catching `SQLITE_CONSTRAINT_UNIQUE`. Either way, return the 409 shape.

Referenced ids that don't exist (`categoryId`, `supplierId`, `productId` in a request body) → 422 with `errors.<field>`.

### 6.7 Recording a stock movement (`POST /api/stock-movements`)

Run all of the following inside one `db.transaction(...)`:

1. Validate the body (§5.5). On failure → 422.
2. Load the product. If it doesn't exist → 422 `errors.productId`.
3. Let `prev = product.quantity`.
   - `IN`: `delta = q`
   - `OUT`: `delta = −q`. If `round(prev − q, 3) < 0` → **409 `INSUFFICIENT_STOCK`**, message `Insufficient stock: requested <q> <unit>, available <prev> <unit>`, plus `errors.quantity` with the same text. Nothing is written.
   - `ADJUSTMENT`: `delta = round(q − prev, 3)`
4. `balanceAfter = round(prev + delta, 3)`.
5. Insert the movement with `createdBy = req.user.email` and `createdAt = now`.
6. Update `products.quantity = balanceAfter` and `updated_at = now`.
7. Respond 201 with the movement.

Product creation with `initialQuantity > 0` reuses this same function (type `IN`, reason `"Initial stock"`) inside the product-creation transaction.

### 6.8 Stats (`GET /api/stats`)

```json
{
  "products": { "total": 18, "active": 17, "lowStock": 4, "outOfStock": 1 },
  "stockValue": 1234.56,
  "movementsLast30Days": { "IN": 12, "OUT": 30, "ADJUSTMENT": 2 }
}
```

- `total`: all products. `active`: `active = 1`.
- `lowStock`: active products with `quantity <= reorder_level` (out-of-stock products are included).
- `outOfStock`: active products with `quantity = 0`.
- `stockValue`: `round(SUM(quantity * unit_cost), 2)` over active products.
- `movementsLast30Days`: count of movements per type with `created_at >= now − 30 days`. Every type key is always present (0 if none).

### 6.9 Database and migrations

- `openDatabase(path)` sets `PRAGMA foreign_keys = ON`, plus `PRAGMA journal_mode = WAL` for file databases.
- Migration runner: files in `api/migrations/` named `NNN_description.sql` run in lexical order. Each file runs inside a transaction and is recorded in `schema_migrations(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`. Files that have already been applied are skipped. `server.js` runs pending migrations on startup. `npm run db:migrate` runs them on demand.

`migrations/001_init.sql`:

```sql
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  description TEXT,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE suppliers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  notes        TEXT,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);

CREATE TABLE products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sku           TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  name          TEXT    NOT NULL,
  description   TEXT,
  category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  supplier_id   INTEGER          REFERENCES suppliers(id)  ON DELETE RESTRICT,
  unit          TEXT    NOT NULL CHECK (unit IN ('unit','box','pack','roll','pair','L','mL','gal','kg','g')),
  quantity      REAL    NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level REAL    NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  unit_cost     REAL    NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  location      TEXT,
  hazardous     INTEGER NOT NULL DEFAULT 0 CHECK (hazardous IN (0, 1)),
  sds_url       TEXT,
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);

CREATE TABLE stock_movements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type          TEXT    NOT NULL CHECK (type IN ('IN','OUT','ADJUSTMENT')),
  quantity      REAL    NOT NULL CHECK (quantity >= 0),
  delta         REAL    NOT NULL,
  balance_after REAL    NOT NULL CHECK (balance_after >= 0),
  reason        TEXT,
  reference     TEXT,
  created_by    TEXT    NOT NULL,
  created_at    TEXT    NOT NULL
);
CREATE INDEX idx_movements_product ON stock_movements(product_id, created_at);
CREATE INDEX idx_movements_created ON stock_movements(created_at);
```

Sorting by the computed `stockValue` uses the expression `quantity * unit_cost`.

### 6.10 Seed data

`npm run db:seed` seeds **only if the `products` table is empty**. Otherwise it prints a message and exits 0. `npm run db:reset` deletes the DB file (plus its `-wal`/`-shm` files), migrates, then seeds. All seeded stock MUST be created through the §6.7 movement function so the invariants hold. Use `createdBy = ADMIN_EMAIL`.

Seed at least:
- **Categories (7):** Disinfectants; Detergents & Degreasers; Floor Care; Glass & Surface Cleaners; Paper & Disposables; Personal Protective Equipment; Tools & Equipment.
- **Suppliers (3, fictional):** "Acme Cleaning Supplies", "Sparkle Chemicals Co.", "PaperWorks Ltd." Give each a contact name, email and phone.
- **Products (≥ 15):** spread across all categories and several units. Examples: bleach 5% (L, hazardous), quaternary ammonium disinfectant (L, hazardous), neutral floor cleaner (L), heavy-duty degreaser (L, hazardous), glass cleaner (L), floor wax (gal), toilet paper (roll), paper towels (pack), 30-gal trash bags (box), nitrile gloves M (box), safety goggles (pair), microfiber cloths (pack), mop heads (unit), spray bottles 1 L (unit), powder detergent (kg). Give every product a realistic `unitCost` and `reorderLevel`.
- **Movements:** an `IN` with initial stock for every product, then some `OUT` usage movements with job references (e.g. `WO-1042`), then one `ADJUSTMENT`. Afterwards, **at least 3 active products must be low stock and at least 1 must be out of stock**, so the dashboard has data to show.

### 6.11 Middleware, logging, security, shutdown

Order inside `createApp`: `helmet()` → `cors({ origin: config.corsOrigins, exposedHeaders: ['Content-Range'], allowedHeaders: ['Content-Type','Authorization'], methods: ['GET','POST','PUT','DELETE'] })` → `pino-http` (level from config; `silent` in tests) → `express.json({ limit: '100kb' })` → routes → 404 handler → error handler.

- The error handler maps `HttpError`s and zod errors to §6.3. A zod error becomes 422 with `errors` built from issue paths: first message per field, nested paths joined with `.`. A JSON body parse error becomes 400.
- Never log the `Authorization` header or passwords (configure pino `redact`).
- `server.js` handles `SIGINT`/`SIGTERM` by calling `server.close()`, closing the DB, then exiting 0.

### 6.12 npm scripts (`api/package.json`)

| Script | Command |
|---|---|
| `dev` | `node --watch src/server.js` |
| `start` | `node src/server.js` |
| `test` | `vitest run` |
| `lint` | `eslint .` |
| `db:migrate` | `node scripts/db-migrate.js` |
| `db:seed` | `node scripts/db-seed.js` |
| `db:reset` | `node scripts/db-reset.js` |

### 6.13 Required API tests

Each test file creates an isolated app: `createApp({ db: openDatabase(':memory:') (migrated), config: loadConfig({...testEnv}) })`. Tests MUST NOT depend on each other or on a `.env` file. At minimum:

1. **Config:** missing `JWT_SECRET`, `ADMIN_EMAIL` and `CORS_ORIGIN` → the thrown error names all three. A short `JWT_SECRET` is rejected. Production with placeholder values is rejected.
2. **Health:** 200 without auth.
3. **Auth:** login succeeds (email case-insensitive). Wrong password → 401 `INVALID_CREDENTIALS`. Protected route with no token, a garbage token, or an expired token → 401. `/api/auth/me` returns the email. The 11th login attempt in a window → 429.
4. **List protocol:** correct `Content-Range` (including the empty `*/0` case and the last partial page). `range` size > 1000 → 400. Invalid JSON in `sort` → 400. Unknown sort field → 400. Unknown filter key → 400. `filter={"id":[1,3]}` returns exactly those records. `q` search is case-insensitive and treats `%`/`_` literally. The CORS response exposes `Content-Range`.
5. **CRUD** for categories, suppliers and products, including merge semantics on PUT. Read-only and unknown fields in a PUT body are ignored (sending `"quantity": 999` does not change quantity). Empty strings in nullable fields become `null`.
6. **Validation:** missing required fields → 422 with `errors` per field. SKU is uppercased. Bad `unit`, bad `sdsUrl`, bad email, too many decimals → 422. A non-existent `categoryId` → 422 `errors.categoryId`.
7. **Conflicts:** duplicate SKU (in different case) → 409 `errors.sku`. Deleting a category that has products → 409. Deleting a product with movements → 409. Deleting a product without movements → 200.
8. **Movements:** `IN` increases stock. `OUT` decreases it. `OUT` larger than stock → 409 `INSUFFICIENT_STOCK` and nothing changes. `ADJUSTMENT` sets stock to the counted value with the correct signed `delta` (including `delta = 0`). `quantity <= 0` for `IN`/`OUT` → 422. `PUT`/`DELETE` → 405. `createdBy` equals the token's email. Date-range filters are inclusive, and date-only `_lte` covers the whole day.
9. **Decimals:** `IN 0.1` then `IN 0.2` → quantity `0.3` exactly. `initialQuantity` creates one `IN` movement with reason "Initial stock". `unit` change is rejected after movements exist.
10. **Invariants (§5.6):** after a random sequence of ≥ 50 valid and invalid movements, invariants 1–3 hold for every product.
11. **Stats:** the numbers match a known fixture, and all three type keys are present.
12. **Seed:** seeding a fresh DB yields ≥ 3 low-stock and ≥ 1 out-of-stock active products, and the invariants hold. Seeding again is a no-op.

---

## 7. Admin service (`admin/`)

### 7.1 Stack

Scaffold with `npm create vite@latest admin -- --template react-ts`. Then add `react-admin@^5`, `ra-data-simple-rest@^5` and `@mui/icons-material` (the major version must match the MUI version react-admin depends on). Dev deps: `vitest`, `jsdom`. Keep the ESLint setup from the Vite template.

### 7.2 Configuration

Vite exposes only `VITE_*` variables to the browser, and it **inlines them at build time**. Changing them requires a rebuild. The admin env MUST NOT contain secrets.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `VITE_API_URL` | **yes** | – | Base URL of the API **including `/api`**, e.g. `http://localhost:4000/api`. No trailing slash (strip one if present). |
| `VITE_APP_TITLE` | no | `Cleaning Inventory` | Shown in the app bar and `<title>` |
| `VITE_CURRENCY` | no | `USD` | ISO 4217 code for `Intl.NumberFormat` |
| `PORT` | no | `5173` | Dev/preview server port. Read in `vite.config.ts` via `loadEnv(mode, process.cwd(), '')`. Not exposed to the client. |

`admin/.env.example`:

```dotenv
# Base URL of the inventory API, including the /api prefix
VITE_API_URL=http://localhost:4000/api
VITE_APP_TITLE=Cleaning Inventory
VITE_CURRENCY=USD
# Dev server port (not exposed to the browser)
PORT=5173
```

`src/config.ts` reads and validates these values. If `VITE_API_URL` is missing or is not an absolute http(s) URL, the app MUST render a plain error page ("Missing configuration: VITE_API_URL…") instead of a blank screen or a crash.

### 7.3 Providers

**`httpClient.ts`:** wraps `fetchUtils.fetchJson`. It reads the token from `localStorage` and passes `user: { authenticated: true, token: 'Bearer <token>' }` when a token is present.

**`dataProvider.ts`:** `simpleRestProvider(config.apiUrl, httpClient)`, extended with a custom method `getStats(): Promise<Stats>` that calls `GET {apiUrl}/stats`.

**`authProvider.ts`:** stores `{ token, expiresAt, email }` under the `localStorage` key `inventory.auth`. Wrap every `localStorage` access in try/catch.

| Method | Behaviour |
|---|---|
| `login({ username, password })` | `POST {apiUrl}/auth/login` with `{ email: username, password }`. On success, store the auth data. On 401, reject with the API's `message`. |
| `logout()` | Remove the stored auth data and resolve. |
| `checkAuth()` | Reject if there is no token or `expiresAt` is in the past. |
| `checkError(error)` | On status 401, clear the stored auth data and reject (this logs the user out). Resolve otherwise, including on 403. |
| `getIdentity()` | `{ id: email, fullName: email }` |
| `getPermissions()` | Resolve `undefined` |

The default React Admin login page is fine. Its "Username" field holds the admin email.

### 7.4 Resources and screens

Menu order: Dashboard, Products, Stock movements, Categories, Suppliers. Each entry has an icon from `@mui/icons-material`.

**Global rules:**
- **All mutations are pessimistic.** Use `mutationMode="pessimistic"` on every `<Edit>`, and on every delete and bulk-delete button. React Admin only shows server-side field errors (the `errors` object) in pessimistic mode. An inventory system also must not show "deleted" before the server confirms.
- Server field errors MUST appear under the matching inputs, and the top-level `message` in a notification. (This works out of the box when the API follows §6.3 and mutations are pessimistic.)
- Quantities are shown with their unit and at most 3 decimals (`12.5 L`, `3 box`). Money uses `Intl.NumberFormat(undefined, { style: 'currency', currency: VITE_CURRENCY })`. Dates use the browser locale.
- Client-side validation mirrors §5 (required fields, max lengths, `min={0}` on numbers). The server stays authoritative.
- Lists keep the default React Admin export button (CSV).

**Products**
- *List:* columns are SKU, Name, Category (ReferenceField → name), Quantity (with unit), Reorder level, Unit cost, Stock value, a status chip ("Out of stock" red when `quantity = 0`, "Low stock" orange when `isLowStock`, nothing otherwise) and Active. Filters: search (`q`, always shown), Category, Supplier, Active, Hazardous, Low-stock toggle (`lowStock`). The default filter is `active: true`. Low-stock rows get a subtle highlight. Clicking a row opens Show. Bulk delete is **disabled** (most products have history and would fail with 409).
- *Create:* SKU, Name, Description (multiline), Category (ReferenceInput + AutocompleteInput, required), Supplier (optional), Unit (SelectInput), Initial quantity (`initialQuantity`, default 0), Reorder level (default 0), Unit cost (default 0), Location, Hazardous, SDS URL, Active (default true). Grouped into sections: General / Stock / Safety. After saving, redirect to Show.
- *Edit:* same as Create **without** Initial quantity. Quantity is shown read-only with the note "Change stock by recording a movement".
- *Show:* every field, with `sdsUrl` as a link opening in a new tab. Three action buttons open the movement create form prefilled through `CreateButton`'s `state={{ record: { productId, type } }}`: **Receive stock** (`IN`), **Record usage** (`OUT`), **Adjust count** (`ADJUSTMENT`). Below the details, a "Stock history" `ReferenceManyField` (`reference="stock-movements"`, `target="productId"`, sorted `createdAt DESC`, paginated) shows Date, Type, Quantity, Delta, Balance after, Reason, Reference and By.

**Stock movements**
- *List:* columns are Date, Product (ReferenceField → `sku — name`), Type chip (IN green, OUT red, ADJUSTMENT blue), Quantity, Delta (signed: `+10 L` green, `−3 L` red, `0` grey), Balance after, Reason, Reference and Created by. Filters: Product (AutocompleteInput using `q`), Type, From date (`createdAt_gte`), To date (`createdAt_lte`) and search (`q`). Default sort is `createdAt DESC`. No bulk actions.
- *Create:* Product (AutocompleteInput, filtered to `active: true`, required), Type (RadioButtonGroupInput with the labels "Receive (IN)", "Use (OUT)", "Count adjustment"), Quantity (required, `min={0}`), Reason and Reference. The quantity label and helper text change with the type: "Quantity received" / "Quantity used" / "Counted quantity on hand". Once a product is selected, the form SHOULD show "Current stock: X unit" under the product field. After saving, redirect to `products/<productId>/show`. That page MUST show the new quantity without a manual refresh (invalidate cached `products` queries on success if needed).
- *Show:* read-only details. There is **no** Edit view and **no** delete button.

**Categories:** List (Name, Description), Create/Edit (Name, Description), delete with confirmation. If the category is in use, the 409 message appears as a notification.

**Suppliers:** List (Name, Contact, Email as EmailField, Phone), Create/Edit (all fields), delete with confirmation.

### 7.5 Dashboard

Data comes from `dataProvider.getStats()` (via `useDataProvider` and react-query `useQuery`) and from standard `useGetList` calls.

1. **Stat cards:** Active products, Low stock, Out of stock, Stock value (currency). The Low stock and Out of stock cards link to the product list with the matching filter applied.
2. **Low-stock table:** up to 10 active products with `lowStock: true`, sorted `quantity ASC`, showing SKU, Name, Quantity/Reorder level, and a "Receive" button (same prefill as on the product Show page).
3. **Recent movements:** the latest 10 movements (`createdAt DESC`), with a link to the full list.

Loading states use React Admin's loading components. If the API is unreachable, the dashboard shows an error message instead of crashing.

### 7.6 npm scripts (`admin/package.json`)

| Script | Command |
|---|---|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |
| `typecheck` | `tsc -b --noEmit` (or the equivalent for the template's tsconfig layout) |
| `lint` | `eslint .` |
| `test` | `vitest run` |

### 7.7 Required admin tests (Vitest, `fetch` mocked)

1. `authProvider.login` posts `{ email, password }` to `${apiUrl}/auth/login` and stores the token. It rejects with the API's message on 401.
2. `checkAuth` rejects when there is no token and when the token is expired. It resolves when the token is valid.
3. `checkError` rejects and clears storage on 401. It resolves on 500.
4. `httpClient` sends `Authorization: Bearer <token>` when logged in and no such header when logged out.
5. `config.ts` reports a missing or invalid `VITE_API_URL`.
6. Formatting helpers: quantity with unit and ≤ 3 decimals, currency, signed delta.

---

## 8. Independence requirements

1. Each service installs and runs alone: `cd api && npm ci && npm run dev`, and `cd admin && npm ci && npm run dev`. Neither command needs anything from the other folder.
2. No shared source files, no symlinks, no root-level `package.json` or workspaces. Shared concepts (field names, enums) are duplicated on purpose. The admin's `types.ts` mirrors §5.
3. Every environment-specific value (ports, URLs, secrets, DB path, CORS origins, currency) comes from the environment. Hard-coded `localhost` URLs MUST NOT appear in source, only in `.env.example` files and docs.
4. The API is fully usable with `curl` while the admin isn't running. The admin can point at any API host just by changing `VITE_API_URL` and rebuilding.
5. If the API is down, the admin still loads, lets the user reach the login page, and shows a readable network error on login. It never renders a blank page.

## 9. Implementation plan

Work through these milestones in order. Each one must leave `npm test` and `npm run lint` green for the service it touches.

1. **Repo scaffolding:** root `README.md` and `.gitignore`, `api/` and `admin/` skeletons with `.nvmrc`, `.env.example` and READMEs.
2. **API foundation:** `config.js`, `createApp`, `/health`, error handler, 404, logging, test harness. Then tests for config and health.
3. **Persistence:** connection, migration runner, `001_init.sql`.
4. **Auth:** login, JWT middleware, `/auth/me`, rate limit. Then auth tests.
5. **List protocol:** `listQuery.js` (sort/range/filter parsing and SQL building with bound parameters only, never string-interpolated values) and the Content-Range helper. Then tests.
6. **Categories and suppliers:** CRUD, uniqueness and delete rules. Then tests.
7. **Products:** CRUD, computed fields, `initialQuantity`, unit lock, delete rule. Then tests.
8. **Stock movements:** §6.7 transaction, 405s, filters. Then movement, decimal and invariant tests.
9. **Stats and seed:** `/api/stats`, `db:seed`, `db:reset`. Then tests.
10. **Admin foundation:** config validation, providers, `<Admin>` shell, login. Then provider tests.
11. **Admin resources:** categories, suppliers, products (list, create, edit, show), stock movements (list, create, show).
12. **Admin dashboard and polish:** stat cards, low-stock table, recent movements, formatting helpers. Then tests.
13. **Docs and final verification:** service READMEs (setup, env table, scripts, endpoint reference with curl examples for login, list with params, create product, record movement), then run the full §10 checklist.

## 10. Acceptance criteria (definition of done)

**Automated, all MUST pass:**

```bash
cd api   && npm ci && npm run lint && npm test
cd admin && npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

**Manual end-to-end walkthrough, all MUST behave as described:**

1. `cd api && cp .env.example .env && npm run db:reset && npm run dev`. The server logs that it is listening on `PORT`.
2. `curl -s localhost:4000/health` → `{"status":"ok","db":"ok"}`.
3. `curl -s localhost:4000/api/products` → 401 in the error format.
4. Log in with curl and capture the token. Then `GET /api/products?range=[0,4]` returns 5 seeded products with header `Content-Range: products 0-4/<total>`.
5. Create a category, then a product in it with `initialQuantity: 10`. `quantity` is 10 and one `IN` movement exists.
6. `OUT 4` → balance 6. `OUT 7` → 409 `INSUFFICIENT_STOCK`, quantity still 6. `ADJUSTMENT 5` → `delta: -1`, quantity 5.
7. `DELETE` that product → 409. `PUT` it with `{"active": false}` → 200.
8. `cd admin && cp .env.example .env && npm run dev`, then open `http://localhost:5173`. The login page appears. Bad credentials show an error. Good credentials land on the dashboard with non-zero Low stock and Out of stock cards.
9. Products list: filtering by category and the low-stock toggle work, the search box works, and pagination totals are correct.
10. Create a product with a duplicate SKU. The SKU field shows the server's error inline.
11. On a product's Show page, click **Record usage**. The form opens prefilled. Enter more than the on-hand quantity: the quantity field shows the insufficient-stock error. Enter a valid amount: you are redirected to the product, which shows the new quantity and the new history row without a refresh.
12. Try to delete a category that has products. A notification explains why it can't be deleted, and the category is still listed.
13. Stop the API. The admin shows a readable error rather than a blank page. Restart it, and the admin recovers after a reload.
14. Change `PORT` in `api/.env` and `VITE_API_URL` in `admin/.env` to another port, and restart both. Everything works with no code change.

## 11. Out of scope (future work)

- Multiple warehouses, sites or vehicles, and transfers between them.
- Multiple user accounts, roles and permissions, password reset.
- Purchase orders, supplier price lists, sales, invoicing, accounting integration.
- Inventory costing (FIFO, weighted average). `unitCost` is a single manually maintained value.
- Lot numbers, expiry dates, barcode/QR scanning.
- Spanish (or any other) UI translation. React Admin i18n providers can add this later.
- PostgreSQL support, Docker images, CI pipelines, deployment configuration.
- Runtime (post-build) configuration for the admin, e.g. loading `/config.json`.
- OpenAPI document generation.
