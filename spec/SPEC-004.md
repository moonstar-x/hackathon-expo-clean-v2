# SPEC-004: Public API URL, mobile login, and measurement upload

| | |
|---|---|
| **Status** | Draft, ready for implementation |
| **Date** | 2026-10-16 |
| **Builds on** | [SPEC-001](SPEC-001.md) (RoomScanner iOS app), [SPEC-002](SPEC-002.md) (API and admin UI), [SPEC-003](SPEC-003.md) (user accounts) |
| **Supersedes** | SPEC-001 goal G5 ("no accounts, no network"), the "Accounts, cloud sync, any networking, and the `api/` backend" item of its §2.2, and the "no network calls" and "Scans stay on your device" privacy items of its §12. SPEC-002 §11 "deployment configuration", for the public URL and proxy settings only. |
| **Deliverables** | `api/`: `PUBLIC_URL`, `TRUST_PROXY`, `/api/measurements` with file storage · `mobile/`: API configuration, login, upload queue · `web/`: Mediciones screens with the floor plan, a 3D view and the measurements |

The keywords **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in RFC 2119.

---

## 0. Instructions for the implementing agent

1. The code lives in `api/`, `web/` and `mobile/`. SPEC-001 and SPEC-002 call the last two `ios-client/` and `admin/`; those names are out of date.
2. The three parts stay independent (SPEC-002 §8): no shared code, no symlinks. The upload contract (§4) is duplicated in each one on purpose, and a shared JSON fixture (§7) keeps the copies consistent.
3. Priorities work as in SPEC-001: **[P0]** required, **[P1]** expected (list anything you skip), **[P2]** optional. A requirement without a tag is [P0]. Record deviations and skipped items in `mobile/NOTES.md` for the app, and in the "Notes" section of `api/README.md` or `web/README.md` for the services.
4. All UI text is in Spanish and follows the existing conventions: on iOS, semantic keys in `Localizable.xcstrings` used through the generated symbols; on the web, `src/i18n/`, which also translates API messages.
5. Assume no LiDAR device is available. Everything in this spec except the capture itself MUST work in the iOS Simulator: logging in to an API running on the Mac, and uploading the DEBUG sample location (SPEC-001 §13.3, HOME-9).
6. Follow the order in §9, and check §10 before you call the work done.

---

## 1. Summary

Today RoomScanner keeps scans on the phone, and the API and admin UI know nothing about them. After this change:

1. The API has a **public URL**, set by `PUBLIC_URL`. This is the address where the API can be reached from the Internet. Clients are configured with it, and the API uses it to build absolute links.
2. The iPhone app **requires login** against the API, using the same accounts as the admin UI (SPEC-003).
3. When a scan is saved, the app **uploads the measurement** to the API: the dimensions, the floor plan, the data for the 3D model, and the raw RoomPlan capture. Uploads wait in a queue and retry, so scanning still works without a connection.
4. The admin UI gets a **Mediciones** section with a list and a detail screen that shows the floor plan, an interactive 3D view, and every measurement.

**Terminology.** SPEC-001 calls a saved scan a *location*. The API and the admin UI call the uploaded copy a *measurement* (*medición*). One location becomes one measurement.

```
 RoomScanner (iPhone)                        API at PUBLIC_URL                        Admin UI (web)
 ────────────────────                        ─────────────────                        ──────────────
 Login ─────────── POST /api/auth/login ──►  users (SPEC-003)
 Scan ▸ Save (Core Data, as before)
 Upload queue ──── POST /api/measurements ─► measurements + measurement_files (SQLite)
                   (multipart, idempotent)              ▲
                                                        └── GET /api/measurements[/:id[/files/:kind]] ── Mediciones
```

---

## 2. Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Public URL | One API variable, `PUBLIC_URL`: the base URL where clients reach the API (where `/health` lives). The app's `API_BASE_URL` is set to the same value. The admin's `VITE_API_URL` is `PUBLIC_URL` + `/api`. | One value to copy into each client. Behind a proxy or tunnel the API can't work out its own public address from the request, and it needs that address to return links that work from outside. |
| Reverse proxies | New `TRUST_PROXY` variable, passed to Express's `trust proxy` setting. | Reaching the API from the Internet means TLS in a proxy or a tunnel. Without this setting, every client shares the proxy's IP in the login rate limiter. |
| Mobile login | Required before the app can be used. It uses the same accounts and the same endpoint as the web (SPEC-003 §4.1). No new auth endpoints. | Every uploaded measurement has an author, and the existing account system is reused. |
| Token storage on iOS | Keychain, with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. | A token is a credential. UserDefaults is plain text and gets backed up. |
| Session lifetime | Unchanged: `JWT_EXPIRES_IN` (default 8 h). No refresh tokens. When the token expires, the app asks for the password again, and no local data is lost. | The API doesn't change. Operators who want longer sessions on the phone can raise `JWT_EXPIRES_IN`, which also affects the web. |
| Upload transport | One `multipart/form-data` request per measurement: a JSON `metadata` field plus file parts. It's parsed with `multer` 2.x, in memory, on that route only. | The upload is atomic: either the whole measurement is stored or nothing is. The files are binary and far larger than the 100 kB JSON limit, which stays in place for every other route. |
| Idempotency | The phone sends its `Location.id` (a UUID) as `clientId`, which is unique on the server. Sending the same `clientId` again returns the stored record (200) instead of creating a copy. | A retry after a lost response MUST NOT duplicate the measurement. |
| File storage | BLOBs in a `measurement_files` table in the same SQLite database. | One transaction covers the record and its files, deletes cascade, a backup is still a single file, and tests keep using `:memory:`. Lists never read the BLOB table. Object storage is future work. |
| Sync direction | One way, from phone to server, once per scan. Later edits on the phone (rename, rebuild, delete) aren't synced, except rename [P2]. Deleting on the phone never deletes on the server. | The server holds the shared record. Two-way sync is a separate project. |
| Floor plan on the web | The PNG rendered by the phone, which is the same image as the app's floor plan export. | It matches the app exactly, and no 2D renderer has to be ported. An interactive SVG plan is [P2]. |
| 3D on the web | Rebuilt from the `ScanGeometry` JSON with three.js, following SPEC-001 §9.2. When the device can export a USDZ from RoomPlan, it's uploaded too and offered as a download. | Browsers can't display USDZ. The geometry is always available, including in the Simulator, but USDZ export needs a device. |
| Units on the server and web | Metric only, with Spanish (`es`) number formatting. | The app's unit setting is a display preference. Stored values are in meters (SPEC-001 §5.1). |
| Visibility | Every active user can see, rename and delete every measurement. | This matches the rest of the system (SPEC-003 has no roles yet). |
| Ownership on the phone | Each scan records the account that was logged in when it was captured, and it's uploaded only with that account's session. | On a shared phone, one person's scan can't be uploaded under someone else's name. |

---

## 3. Public URL and reverse proxies (`api/`)

### 3.1 Configuration

New rows for the SPEC-002 §6.2 table (`src/config.js`):

| Variable | Required | Default | Rules / meaning |
|---|---|---|---|
| `PUBLIC_URL` | **in production** | `http://localhost:<PORT>` | The base URL where clients reach this API, for example `https://roomscanner-api.example.com`. It MUST be an absolute `http(s)` URL with no query, fragment or credentials. A trailing slash is stripped. A path is allowed (`https://example.com/roomscanner`) when a proxy serves the API under a prefix and strips that prefix before forwarding. With `NODE_ENV=production`, the variable is required and MUST use `https`. |
| `TRUST_PROXY` | no | `false` | Express's `trust proxy` setting. Accepts `false`, `true`, a hop count (`1` for one proxy or tunnel), or a comma-separated list of addresses, subnets, or the names `loopback`, `linklocal` and `uniquelocal`. |
| `UPLOAD_MAX_FILE_MB` | no | `50` | The largest single file accepted by `POST /api/measurements`, as an integer from 1 to 500. |

- `loadConfig` returns `publicUrl` (a string with no trailing slash), `trustProxy` (the parsed value) and `uploadMaxFileBytes`. Invalid values are reported together with every other config problem (SPEC-002 §6.2).
- `src/lib/publicUrl.js` exports `publicUrlFor(config, path)`, which joins `config.publicUrl` and an absolute path (`/api/...`) without doubling or dropping a slash. Every absolute URL the API returns MUST be built with it.
- `createApp` calls `app.set('trust proxy', config.trustProxy)` before registering any middleware.
- `server.js` includes the public URL in the "listening" log line.
- `CORS_ORIGIN` doesn't change and is unrelated to `PUBLIC_URL`: it lists the origins of browser apps (the admin UI), not the API's own address. The iOS app isn't a browser, so CORS doesn't apply to it.

`api/.env.example` gains:

```dotenv
# Public address of this API, as clients on the Internet reach it (no /api suffix).
# The iPhone app's API_BASE_URL is this same value; the admin's VITE_API_URL is this value + /api.
# Required, and must be https, when NODE_ENV=production.
PUBLIC_URL=http://localhost:4000
# Set when the API runs behind a reverse proxy or tunnel: the number of proxy hops (usually 1).
TRUST_PROXY=false
# Largest single file accepted by POST /api/measurements, in MB.
UPLOAD_MAX_FILE_MB=50
```

The test helper (`test/helpers.js`) sets `PUBLIC_URL: 'https://api.test'`, so tests can check the absolute URLs.

### 3.2 Reaching the API from a phone (README)

`api/README.md` gets a "Public URL" section that explains:

- **Production:** put the API behind HTTPS (a reverse proxy or a hosting platform), set `PUBLIC_URL` to that address, and set `TRUST_PROXY=1`.
- **Development:** a phone can't reach `localhost` on the Mac. There are two options:
  - **Tunnel (recommended):** `cloudflared tunnel --url http://localhost:4000` (or `ngrok http 4000`) prints an `https://…` address. Set `PUBLIC_URL` to it and `TRUST_PROXY=1`, restart the API, and put the same address in the app's `Config/API.local.xcconfig` (§5.1). Quick-tunnel addresses change every time the tunnel starts.
  - **Local network:** `PUBLIC_URL=http://<mac-name>.local:4000`. This works only when the phone is on the same Wi-Fi network (§5.2).
- **Simulator:** it can use `http://localhost:4000` directly.

### 3.3 Tests (`test/config.test.js`, `test/publicUrl.test.js`)

- `PUBLIC_URL` defaults to `http://localhost:<PORT>` outside production, is required in production, and is rejected in production when it uses `http://`. A trailing slash is stripped. A query string, a fragment, credentials, or an `ftp://` URL is rejected.
- `TRUST_PROXY` accepts `false`, `true`, `1` and `loopback, 10.0.0.0/8`. It rejects `-1` and arbitrary text.
- `publicUrlFor` joins correctly with and without a path prefix.
- With `TRUST_PROXY=1`, the login rate limiter counts two different `X-Forwarded-For` addresses separately.

---

## 4. Measurements API (`api/`)

### 4.1 Data model

`migrations/003_measurements.sql`:

```sql
CREATE TABLE measurements (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id           TEXT    NOT NULL UNIQUE,          -- lowercased UUID from the phone (Location.id)
  name                TEXT    NOT NULL,
  notes               TEXT,
  scanned_at          TEXT    NOT NULL,
  room_count          INTEGER NOT NULL CHECK (room_count >= 1),
  total_floor_area    REAL    NOT NULL CHECK (total_floor_area >= 0),
  is_area_approximate INTEGER NOT NULL CHECK (is_area_approximate IN (0, 1)),
  footprint_width     REAL,
  footprint_length    REAL,
  is_merged           INTEGER NOT NULL CHECK (is_merged IN (0, 1)),
  geometry_version    INTEGER NOT NULL,
  rooms_json          TEXT    NOT NULL,                 -- the validated `rooms` array (§4.2)
  app_version         TEXT,
  device_model        TEXT,
  user_id             INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by          TEXT    NOT NULL,                 -- the uploader's email at upload time
  created_at          TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL
);
CREATE INDEX idx_measurements_created ON measurements(created_at);
CREATE INDEX idx_measurements_scanned ON measurements(scanned_at);
CREATE INDEX idx_measurements_user    ON measurements(user_id);

CREATE TABLE measurement_files (
  measurement_id INTEGER NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  kind           TEXT    NOT NULL CHECK (kind IN ('geometry','floorPlan','thumbnail','model','csv','raw')),
  content_type   TEXT    NOT NULL,
  size           INTEGER NOT NULL,
  sha256         TEXT    NOT NULL,                      -- lowercase hex
  data           BLOB    NOT NULL,
  created_at     TEXT    NOT NULL,
  PRIMARY KEY (measurement_id, kind)
);
```

- `user_id` and `created_by` follow the SPEC-003 audit rule: deleting a user keeps their measurements, and `createdBy` keeps their email.
- Queries on `measurements` select their columns explicitly. Only the file download endpoint (§4.5) reads `measurement_files.data`.

### 4.2 Measurement record

The response shape for list, getOne, create, update and delete:

```json
{
  "id": 12,
  "clientId": "6f1c2d0e-9a4b-4c1e-8d2f-3b5a7c9e1f00",
  "name": "Apartamento",
  "notes": null,
  "scannedAt": "2026-10-16T18:20:11.000Z",
  "roomCount": 2,
  "totalFloorArea": 34,
  "isAreaApproximate": false,
  "footprint": { "width": 8.5, "length": 4 },
  "isMerged": true,
  "geometryVersion": 1,
  "rooms": [
    {
      "id": "0b7e5f2a-1c3d-4e5f-8a9b-0c1d2e3f4a5b", "index": 0, "name": "Sala", "type": "livingRoom",
      "floorArea": 20, "isFloorApproximate": false, "perimeter": 18, "ceilingHeight": 2.5,
      "wallCount": 4, "doorCount": 2, "windowCount": 1, "openingCount": 0, "objectCount": 2
    }
  ],
  "appVersion": "1.0 (1)",
  "deviceModel": "iPhone16,1",
  "userId": 1,
  "createdBy": "admin@example.com",
  "files": {
    "geometry":  { "url": "https://api.example.com/api/measurements/12/files/geometry",  "contentType": "application/json", "size": 48211 },
    "floorPlan": { "url": "https://api.example.com/api/measurements/12/files/floorPlan", "contentType": "image/png", "size": 913554 },
    "thumbnail": { "url": "https://api.example.com/api/measurements/12/files/thumbnail", "contentType": "image/png", "size": 8120 }
  },
  "createdAt": "2026-10-16T18:21:40.120Z",
  "updatedAt": "2026-10-16T18:21:40.120Z"
}
```

| Field | Rules |
|---|---|
| `name` | Writable. Required, 1–100 chars, trimmed. |
| `notes` | Writable. ≤ 1000 chars; blank becomes `null`. Only the web sets it. |
| `roomCount`, `totalFloorArea`, `isAreaApproximate` | Read-only, **computed by the server** from `rooms` at upload time: the number of rooms, `round(Σ (floorArea ?? 0), 3)`, and whether any room's floor is approximate. |
| `files` | Read-only. One entry per stored file, keyed by kind (§4.3). Kinds that weren't uploaded are left out. `url` is absolute and built with `publicUrlFor`. |
| Everything else | Read-only, set at upload time from `metadata` (§4.3). Lengths and areas are stored rounded to 3 decimals with the SPEC-002 rounding helper (`src/lib/numbers.js`). |

### 4.3 Upload: `POST /api/measurements`

The request is `multipart/form-data` and goes through `requireAuth`. Authentication runs before the body is read, so anonymous uploads are never buffered. The global `express.json` parser ignores multipart bodies, so it doesn't need to change.

**Parts**

| Name | Kind | Required | Stored content type | Check |
|---|---|---|---|---|
| `metadata` | field (a part without `filename`) containing JSON | yes | — | ≤ 1 MB, valid JSON, matches the schema below |
| `geometry` | file | yes | `application/json` | Valid UTF-8 JSON: an object with an integer `version` equal to `metadata.geometryVersion`, and a `rooms` array whose `id`s are exactly the `metadata.rooms` ids (case-insensitive, any order) |
| `floorPlan` | file | yes | `image/png` | Starts with the PNG signature `89 50 4E 47 0D 0A 1A 0A` |
| `thumbnail` | file | no | `image/png` | PNG signature |
| `model` | file | no | `model/vnd.usdz+zip` | Starts with `50 4B 03 04` (a zip archive) |
| `csv` | file | no | `text/csv; charset=utf-8` | Valid UTF-8 |
| `raw` | file | no | `application/json` | Valid UTF-8 JSON |

The server sets the stored content type from the kind and ignores the one the client sends. Each part may appear at most once. Any other part name is a 400.

**`metadata` schema** (zod, with the error conventions of SPEC-002 §6.3; nested paths are joined with `.`, as in `rooms.0.name`):

| Field | Rules |
|---|---|
| `clientId` | Required UUID string, stored lowercased |
| `name` | Required, 1–100 chars, trimmed |
| `scannedAt` | Required ISO 8601 datetime, stored as `toISOString()` |
| `footprint` | `{ width, length }` (numbers ≥ 0) or `null` |
| `isMerged` | Required boolean |
| `geometryVersion` | Required integer ≥ 1 |
| `rooms` | Required array of 1–100 items |
| `rooms[].id` | Required UUID, unique within the array |
| `rooms[].index` | Required integer. Across the array, the indexes are exactly `0…n−1`. |
| `rooms[].name` | Required, 1–100 chars, trimmed |
| `rooms[].type` | `bedroom`, `bathroom`, `kitchen`, `livingRoom`, `diningRoom` or `null` |
| `rooms[].floorArea` | Number ≥ 0, or `null` when the area is unknown (SPEC-001 §6.2) |
| `rooms[].isFloorApproximate` | Required boolean |
| `rooms[].perimeter` | Required number ≥ 0 |
| `rooms[].ceilingHeight` | Number ≥ 0 or `null` |
| `rooms[].wallCount`, `doorCount`, `windowCount`, `openingCount`, `objectCount` | Required integers ≥ 0 |
| `appVersion`, `deviceModel` | Optional, ≤ 50 chars; blank becomes `null` |

Numbers follow SPEC-002 §5.1 (finite, ≤ 1 000 000), with one difference: values with extra decimals are **rounded** to 3 decimals instead of rejected, because the phone measures in `Float`. Unknown fields are ignored.

**Processing**

1. Parse the multipart body with `multer.memoryStorage()` and these limits: `fileSize` = `UPLOAD_MAX_FILE_MB`, `fields: 1`, `files: 6`, `parts: 7`, `fieldSize: 1 MB`.
2. Validate `metadata`, then every file. Collect all problems into a single 422 whose `errors` are keyed by field: the `metadata` path, or the part name for files (for example `errors.floorPlan = "Must be a PNG image"`, `errors.geometry = "Required"`).
3. If the `clientId` already exists:
   - If the same user uploaded it (`user_id` equals `req.user.id`), answer **200** with the stored record. Nothing changes, and the new files are discarded.
   - Otherwise, answer **409 `CONFLICT`** with `errors.clientId = "This measurement was uploaded by another user"`.
4. Otherwise, in one transaction, insert the measurement (`user_id = req.user.id`, `created_by = req.user.email`) and one `measurement_files` row per file, with its size and SHA-256.
5. Answer **201** with the record and `Location: <publicUrlFor('/api/measurements/<id>')>`.

If two identical uploads race, the `UNIQUE` constraint settles it: catch `SQLITE_CONSTRAINT_UNIQUE` on `client_id` and answer as in step 3.

**New error cases** (add them to the error table in `api/README.md`):

| Status | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | A malformed multipart body, an unknown part name, a part sent twice, or `metadata` that isn't valid JSON |
| 413 | `PAYLOAD_TOO_LARGE` | A file larger than `UPLOAD_MAX_FILE_MB`, or `metadata` larger than 1 MB. `errors.<part>` names the part. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `POST /api/measurements` with a body that isn't `multipart/form-data` |

The error handler maps multer's `MulterError` codes: `LIMIT_FILE_SIZE` and `LIMIT_FIELD_VALUE` become 413. `LIMIT_UNEXPECTED_FILE`, `LIMIT_PART_COUNT`, `LIMIT_FILE_COUNT`, `LIMIT_FIELD_COUNT` and any other multipart error become 400.

### 4.4 List, get, update and delete

Otherwise, `measurements` is a standard SPEC-002 §6.3 resource:

| Content-Range name | Sortable fields | Default sort | Filter keys (besides `id`, `q`) | `q` searches |
|---|---|---|---|---|
| `measurements` | `id`, `name`, `scannedAt`, `roomCount`, `totalFloorArea`, `createdBy`, `createdAt`, `updatedAt` | `createdAt DESC` | `userId`, `createdBy`, `scannedAt_gte`, `scannedAt_lte` | `name`, `notes`, `createdBy` |

- `scannedAt_gte` and `scannedAt_lte` behave like `createdAt_gte` and `createdAt_lte` on stock movements (SPEC-002 §6.6).
- `PUT /api/measurements/:id` takes JSON (through `express.json`, 100 kB) and changes only `name` and `notes`, with merge semantics. Everything else in the body is ignored.
- `DELETE /api/measurements/:id` deletes the record and, through the cascade, its files. It returns the record as it was before deletion.

### 4.5 Files: `GET /api/measurements/:id/files/:kind`

This endpoint requires authentication, like every `/api` route.

- 200 with the bytes, plus `Content-Type` (the stored type), `Content-Length`, `ETag: "<sha256>"`, and `Cache-Control: private, max-age=31536000, immutable` (files never change after upload).
- An `If-None-Match` header that matches the ETag gets a 304 with no body.
- `Content-Disposition` is `inline` by default and `attachment` with `?download=1`. The file name is `<base><suffix>`:
  - `base` is the measurement name with every character that isn't a letter, digit, space, `-` or `_` removed, and spaces turned into `-`. If nothing is left, use `medicion-<id>`.
  - The suffix depends on the kind: `geometry` → `.geometria.json`, `floorPlan` → `-plano.png`, `thumbnail` → `-miniatura.png`, `model` → `.usdz`, `csv` → `-medidas.csv`, `raw` → `.roomplan.json`.
  - Use Express's `res.attachment()` (or the `content-disposition` package) so that non-ASCII names such as `Habitación` survive as `filename*=UTF-8''…`.
- An unknown measurement, an unknown kind, or a kind that wasn't uploaded for that measurement gets a 404 `NOT_FOUND`.

### 4.6 Middleware changes

- **CORS:** add `Content-Disposition` and `Location` to `exposedHeaders`.
- **Helmet:** keep the default `Cross-Origin-Resource-Policy: same-origin`. It blocks an `<img src>` that points at the API from the admin's origin, which is why the admin downloads files with `fetch` (§6.3). Don't relax it.
- **Logging:** never log request bodies or file contents. Each upload logs one line with the measurement id, the `clientId`, the file kinds, and the total bytes.

### 4.7 Sample measurement in the seed [P1]

`db:seed` and `db:reset` also insert one measurement, "Apartamento de ejemplo", **when the `measurements` table is empty**. This check is independent of the products check. The measurement belongs to the initial user. Its files come from `api/src/db/fixtures/sample-measurement/`:

- `geometry.json`: the §7 fixture
- `metadata.json`: the matching metadata
- `floor-plan.png` and `thumbnail.png`: exported from the app's DEBUG sample location, for example with the floor plan share item (SPEC-001 §7.7.4) in the Simulator

This gives the admin screens data to show without a LiDAR device.

### 4.8 Tests (`test/measurements.test.js`)

These use the §7 fixture and a small valid PNG built inside the test.

1. An upload with every required part returns 201. The `Location` header and every `files.*.url` start with the test `PUBLIC_URL`. `roomCount`, `totalFloorArea` (34) and `isAreaApproximate` are computed, and `createdBy` is the caller.
2. Each file downloads byte for byte, with the right `Content-Type`, `ETag` and `Content-Disposition`. `If-None-Match` returns 304. `?download=1` returns `attachment`. A non-ASCII name is encoded correctly.
3. Uploading the same `clientId` again as the same user returns 200 with the same `id`, and there is still only one row. The same upload by another user returns 409.
4. A missing `geometry` or `floorPlan` returns a 422 that names the part. A JPEG sent as `floorPlan` returns 422. Geometry room ids that don't match `metadata.rooms` return 422. A geometry `version` that differs from `geometryVersion` returns 422.
5. `metadata` that isn't JSON returns 400. Schema errors return 422 with paths such as `rooms.0.name`. Duplicate room ids, or a gap in `index`, return 422.
6. A file over the limit (`UPLOAD_MAX_FILE_MB=1`) returns 413. An unknown part returns 400. A JSON body returns 415. A request without a token returns 401.
7. The list protocol works: sorting, the `scannedAt` range, `q`, `createdBy`, `userId`, and `Content-Range`.
8. `PUT` changes only `name` and `notes`. `DELETE` leaves no `measurement_files` rows behind.
9. Deleting the uploader keeps the measurement, with `userId: null` and the same `createdBy`.
10. **[P1]** Seeding a fresh database creates exactly one measurement, with `geometry`, `floorPlan` and `thumbnail` files. Seeding again adds nothing.

---

## 5. Mobile app (`mobile/`)

### 5.1 API base URL

- **CFG-1** A build setting, `API_BASE_URL`, holds the API's `PUBLIC_URL`.
  - It's defined in a new, committed `Config/API.xcconfig` with the value `http:/$()/localhost:4000` for the Simulator. The file ends with `#include? "API.local.xcconfig"`, a gitignored file for local overrides, following the pattern of `Config/Signing.xcconfig`.
  - `project.yml` takes one config file per configuration, so add `Config/App.xcconfig`, which includes `Signing.xcconfig` and `API.xcconfig`, and point `configFiles` at it.
  - Add `Config/API.local.xcconfig` to `mobile/.gitignore`.

  > **Gotcha:** `//` starts a comment in `.xcconfig` files. Write URLs as `https:/$()/host`. Otherwise the value is cut off after `https:`.

- **CFG-2** `Info.plist` (through `project.yml`) gets `APIBaseURL = $(API_BASE_URL)`. An `AppConfiguration` type reads it once at launch and requires an absolute `http` or `https` URL, stripping any trailing slash. The app appends `/api/...` and `/health` itself.
- **CFG-3** If the value is missing or invalid, the app shows a full-screen `ContentUnavailableView` ("Falta la configuración del servidor", with the key name and the invalid value) instead of the login screen. It never crashes.
- **CFG-4 [P1, DEBUG only]** In Settings, a **Servidor** row lets you replace the URL at runtime (stored in `UserDefaults`) or reset it to the build value. **Probar conexión** calls `GET /health` and shows "Conectado" or the error. Changing the server signs you out.
- **CFG-5** Release builds show the server's host, read-only, in Settings and in the login screen's footer.

### 5.2 App Transport Security and the local network

- **NET-1** No `NSAllowsArbitraryLoads`. Internet hosts MUST use `https`.
- **NET-2** Set `NSAppTransportSecurity` → `NSAllowsLocalNetworking = YES`, so that `http://localhost` (Simulator) and `http://<mac-name>.local` (a device on the same Wi-Fi) work. Verify both. If either host form is still blocked, document the form that works in the README and in NOTES.md.
- **NET-3 [P1]** Add `NSLocalNetworkUsageDescription`: "RoomScanner se conecta a un servidor de tu red local para iniciar sesión y subir mediciones." iOS asks for this permission the first time the app connects to a local network address.

### 5.3 Architecture additions

```
RoomScanner/
├── Networking/                     # the only code that uses URLSession
│   ├── AppConfiguration.swift      # CFG-2
│   ├── APIClient.swift             # base URL, bearer token, JSON coding, error mapping
│   ├── APIError.swift
│   ├── MultipartBodyWriter.swift   # streams a multipart body into a temporary file
│   └── KeychainStore.swift
├── Session/
│   ├── Session.swift               # { token, expiresAt, user: { id, email, name } }, Codable
│   └── SessionStore.swift          # @Observable @MainActor: restore, login, logout, session loss
├── Sync/
│   ├── UploadPayloadBuilder.swift  # location → metadata + files (§5.8)
│   └── UploadQueue.swift           # @Observable @MainActor: runs uploads one at a time
└── Features/
    ├── Root/RootView.swift         # configuration error, login, or Home (§5.6)
    └── Login/LoginView.swift
```

- RoomPlan stays confined as SPEC-001 §4.1 requires. `UploadPayloadBuilder` may call `USDZExporter` and `RoomPlanCoding`, which already wrap it.
- `APIClient` decodes the API's error body `{ message, code, errors }` into `APIError.server(status:code:message:)`. It maps 401 to `.unauthorized` and `URLError`s to `.network`. JSON dates are ISO 8601 with fractional seconds.
- JSON calls use a 30 s request timeout. Uploads use a 60 s request timeout and a 15 min resource timeout.
- `APIClient`, `KeychainStore` and `SessionStore` are injected (through protocols or closures), so tests run with fakes and a `URLProtocol` stub instead of a live server.

### 5.4 Session and Keychain

- **SES-1** The session (`token`, `expiresAt`, `user`) is stored as JSON in one Keychain generic-password item: service = the bundle ID, account = `session`, accessibility `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`. The token is never stored anywhere else.
- **SES-2** At launch, a stored session whose `expiresAt` is more than 60 s away is used right away, without a network round trip, so the app opens offline. Then, in the background, `GET /api/auth/me` refreshes the stored name and email. A 401 there counts as session loss (SES-4). Network errors are ignored.
- **SES-3** At launch, an expired session is deleted and the login screen opens with the last email filled in. The email is stored in `UserDefaults` under `lastLoginEmail` (it isn't a secret).
- **SES-4** **Session loss:** when any API call other than login returns 401, the app deletes the session and shows the login screen. Local data and the upload queue are kept, and uploads resume after the same user logs in again. The login screen MUST NOT replace an open capture flow: if one is on screen, the login screen appears once it closes.
- **SES-5** **Logout** (in Settings) asks for confirmation. If this account has measurements that haven't been uploaded, the dialog says: "Tienes N mediciones sin subir. Se subirán cuando vuelvas a iniciar sesión con esta cuenta." Logging out deletes the Keychain item, stops any upload in progress (that location goes back to pending), and shows the login screen. There's no server call, because JWTs are stateless.

### 5.5 Login screen

```
┌──────────────────────────────────┐
│                                  │
│            [app icon]            │
│           RoomScanner            │
│  Inicia sesión para guardar y    │
│  subir tus mediciones.           │
│                                  │
│  Correo electrónico              │
│  ┌────────────────────────────┐  │
│  └────────────────────────────┘  │
│  Contraseña                      │
│  ┌────────────────────────────┐  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │       Iniciar sesión       │  │
│  └────────────────────────────┘  │
│                                  │
│    Servidor: api.example.com     │
└──────────────────────────────────┘
```

- **LOGIN-1** The email field uses `.textContentType(.username)` and `.keyboardType(.emailAddress)`, with no autocapitalization or autocorrection. The password field is a `SecureField` with `.textContentType(.password)`. Return in the email field moves to the password field, and Return in the password field submits. Password AutoFill works.
- **LOGIN-2** The button stays disabled until both fields have text. While the request runs, the button shows a `ProgressView` and the fields are disabled.
- **LOGIN-3** The app sends `POST /api/auth/login` with `{ email, password }`, with the email trimmed. On 200 it stores the session (SES-1) and `lastLoginEmail`, clears the password, and shows Home.
- **LOGIN-4** Errors appear under the button, in Spanish, with the same wording as the admin UI:

  | Case | Message |
  |---|---|
  | 401 `INVALID_CREDENTIALS` | Correo electrónico o contraseña incorrectos. |
  | 429 `RATE_LIMITED` | Demasiados intentos de inicio de sesión. Inténtalo más tarde. |
  | Network error or timeout | No se puede conectar con el servidor. Comprueba la conexión e inténtalo de nuevo. |
  | Anything else | No se pudo iniciar sesión (error <status>). |

- **LOGIN-5** The footer shows the server's host (CFG-5). The screen supports light and dark mode, Dynamic Type and VoiceOver, and it scrolls when the keyboard is visible.

### 5.6 Root view

`RootView` replaces `HomeView` as the `WindowGroup` content and shows:

1. the CFG-3 screen if the configuration is invalid;
2. `LoginView` if there's no session;
3. `HomeView` if there's a session, with its navigation unchanged. The upload queue starts at this point (§5.8).

The launch cleanup of empty drafts (SPEC-001 §10.2) still runs, and so does SYNC-8.

### 5.7 Core Data changes

Add a **second model version**, `RoomScanner 2.xcdatamodel`, and make it current in `.xccurrentversion`. Don't edit version 1: existing stores would no longer open, and the SPEC-001 persistence layer fails soft, so the app would start with no data. All the changes below are compatible with lightweight migration (new attributes that are optional or have defaults).

New `Location` attributes:

| Attribute | Type | Optional | Default | Notes |
|---|---|---|---|---|
| `syncStatusRaw` | String | no | `localOnly` | `localOnly`, `pending`, `uploading`, `uploaded` or `failed`. Expose it as `var syncStatus: SyncStatus`. |
| `ownerUserID` | Integer 64 | no | `0` | The API user id of the account that captured the scan. `0` means none (scans saved before this spec). |
| `ownerEmail` | String | yes | | For display ("Pertenece a ana@example.com") |
| `remoteID` | Integer 64 | no | `0` | The API's measurement `id`. `0` means not uploaded. |
| `uploadedAt` | Date | yes | | |
| `lastUploadError` | String | yes | | The last error message shown to the user |
| `uploadAttempts` | Integer 16 | no | `0` | Reset on success and on manual retry |
| `lastUploadAttemptAt` | Date | yes | | Used by the backoff (SYNC-6) |

`LocationRepository` gains the matching operations (the signatures are the agent's choice):

- set the owner when a draft is created;
- mark a location pending, uploading, uploaded (with `remoteID` and `uploadedAt`), or failed (with the message and the attempt count);
- list the IDs of the locations that are ready to upload for a given user;
- reset `uploading` to `pending`.

### 5.8 Upload pipeline

**What's uploaded.** `UploadPayloadBuilder` builds every part from the store, never from in-memory capture state:

| Part | Source | Notes |
|---|---|---|
| `metadata` | `Location`, plus `RoomMetrics` and `LocationMetrics` applied to the decoded `ScanGeometry` | `clientId` = `Location.id`. `name`. `scannedAt` = `createdAt`. `footprint` = `LocationMetrics.footprint`, or `null`. `isMerged` = `merged != nil`. `geometryVersion` = `geometry.version`. `rooms` in geometry order, each with its name from the `Room` row (default name per SPEC-001 §6.5 if the row is missing), `floorArea`, `isFloorApproximate`, `perimeter`, `ceilingHeight`, and the counts of the room's own walls, doors, windows, openings and objects. `appVersion` = `"<CFBundleShortVersionString> (<CFBundleVersion>)"`. `deviceModel` from `utsname().machine`. |
| `geometry` | `LocationPayload.geometryJSON` | Sent as stored |
| `floorPlan` | `FloorPlanImageRenderer.exportPNG`, with metric units and the room names | The same image as the floor plan share item |
| `thumbnail` | `Location.thumbnailPNG` | Left out when it's nil |
| `model` [P1] | `USDZExporter.export`, when `USDZExporter.canExport` is true | Device only, so it's left out in the Simulator and when there's nothing to export. If the export fails, the part is left out and the error is logged; the upload continues. |
| `csv` [P1] | `MeasurementsCSV.make` | |
| `raw` [P1] | `loadRawData` | `{ "format": "roomplan-raw", "version": 1, "structure": <CapturedStructure JSON or null>, "rooms": [ { "id": "<UUID>", "capturedRoom": <CapturedRoom JSON> } ] }`. The stored JSON is embedded as JSON values, not as strings. Rooms without raw data are left out, and the whole part is left out when nothing remains. |

`MultipartBodyWriter` streams the body into a temporary file. It uses the boundary `RoomScanner-<UUID>` and CRLF line endings, and every file part has `Content-Disposition: form-data; name="…"; filename="…"` and a `Content-Type`. The file is sent with `URLSession.upload(for:fromFile:)` and deleted afterwards, whatever the outcome. PNG rendering runs on the main actor. Building the JSON, the CSV and the USDZ, and writing the file, run off the main actor.

**Sync states**

```
                save, or finish a draft (owner = current user)
                                  │
 localOnly ── manual "Subir" ──►  ▼
 (older scans)                 pending ◄──────────── transient error (with backoff)
                     ▲            │                                   ▲
         manual "Reintentar"  the queue picks it                      │
                     │            ▼                                   │
                  failed ◄── uploading ───────────────────────────────┘
          (permanent error)       │       401: session loss, back to pending
                                  ▼
                              uploaded (remoteID, uploadedAt)
```

- **SYNC-1** Finishing a location sets it to `pending` (when it has an owner) and starts the queue. A location is finished by the Save sheet (SAVE-4) or by "Finish with N rooms" on a draft (SPEC-001 §7.7.5). The DEBUG "Add sample location" action (HOME-9) also sets the owner to the current user and `pending`, so uploads can be tested in the Simulator. The owner is set from the current session when the draft is created, which happens when the first room completes. Drafts are never uploaded.
- **SYNC-2** The queue uploads one location at a time: complete locations in `pending` whose `ownerUserID` is the current user, oldest first. It runs at launch (after the session is restored), after login, when the app becomes active, after SYNC-1, on a manual retry, and **[P1]** when `NWPathMonitor` reports that the network is back. Without a session it does nothing.
- **SYNC-3** Response handling:

  | Response | Result |
  |---|---|
  | 201 or 200 | `uploaded`, with `remoteID` = `id` and `uploadedAt` = now. The error is cleared. |
  | 401 | Stays `pending`. Session loss (SES-4). The queue stops. |
  | Network error, timeout, 408, 429 or 5xx | Stays `pending`, with `lastUploadError` set and `uploadAttempts` increased. Retried later (SYNC-6). |
  | 409 | `failed`: "Otra cuenta ya subió esta medición." |
  | 400, 413, 415, 422 or any other 4xx | `failed`, with the server's `message` (and the first field error, if there is one) |
  | Building the payload fails (for example, the geometry can't be decoded) | `failed`, with a Spanish message |

- **SYNC-4** Manual **Subir** (on `localOnly`) and **Reintentar** (on `failed`, or on `pending` with an error) set the owner to the current user if it's `0`, reset the attempts, set `pending`, and run the queue right away, ignoring the backoff. A location owned by another account can't be uploaded from this session.
- **SYNC-5 [P1]** While an upload runs, the app requests background time with `UIApplication.beginBackgroundTask`, so the upload can finish when the user leaves the app.
- **SYNC-6 [P1]** Automatic retries wait `min(30 s × 2^(attempts − 1), 30 min)` after `lastUploadAttemptAt`.
- **SYNC-7** A location can be deleted on the phone while it's queued or uploading. If its upload then succeeds, the missing location is ignored. Deleting an uploaded location doesn't touch the server, and its delete confirmation says so: "Se eliminará de este dispositivo. La copia subida al servidor se conserva."
- **SYNC-8** At launch, locations left in `uploading` (because the app was killed) go back to `pending`.
- **SYNC-9 [P2]** Renaming an uploaded location sends `PUT /api/measurements/<remoteID>` with `{ name }`. This is best effort, with no retries.

### 5.9 UI changes

- **UI-1 Home row:** after the existing details, a sync indicator: an SF Symbol whose VoiceOver label is added to the row's combined label.

  | State | Symbol | Label |
  |---|---|---|
  | `pending` | `arrow.up.circle` | Pendiente de subir |
  | `uploading` | `arrow.up.circle.fill` | Subiendo |
  | `uploaded` | `checkmark.circle.fill` (green) | Subido |
  | `failed` | `exclamationmark.triangle.fill` (orange) | Error al subir |
  | `localOnly` | `iphone` | Solo en este dispositivo |
  | Owned by another account | `person.crop.circle.badge.exclamationmark` | De otra cuenta |

  Drafts keep their "Incomplete" badge (HOME-2) and have no sync indicator.
- **UI-2 Detail:** below the header, a one-line status, with an action where one applies: "Pendiente de subir" (with the last error and **Reintentar** when there is one), "Subiendo…", "Subido el <fecha>", "No se pudo subir: <mensaje>" with **Reintentar**, "Solo en este dispositivo" with **Subir**, or "Pertenece a <email>" with no action.
- **UI-3 Settings:**
  - a **Cuenta** section with the user's name and email and **Cerrar sesión** (SES-5);
  - a **Sincronización** section with the number of measurements waiting to upload and **Subir ahora**;
  - the server (CFG-4, CFG-5).

  The about line `settingsStoredOnDevice` becomes "Los escaneos se guardan en este dispositivo y se suben al servidor de tu organización."
- **UI-4** `NSCameraUsageDescription`, in both `project.yml` and `Info.plist`, becomes "RoomScanner usa la cámara y el escáner LiDAR para medir habitaciones y crear planos. Las mediciones se suben al servidor de tu organización."
- **UI-5** Every new string is a semantic key with a Spanish value in `Localizable.xcstrings`, used through the generated symbols. Run `scripts/sync-strings.sh` after command-line builds.

### 5.10 Privacy manifest

`PrivacyInfo.xcprivacy` declares the data the app now sends to the organization's server. Both types are linked to the user, not used for tracking, and declared with the App Functionality purpose:

- `NSPrivacyCollectedDataTypeEmailAddress` (login);
- `NSPrivacyCollectedDataTypeOtherUserContent` (scans).

Tracking stays `false`, and the UserDefaults required-reason entry stays.

### 5.11 Tests (Swift Testing, Simulator)

| Suite | Cases |
|---|---|
| `AppConfigurationTests` | A valid URL is accepted. A trailing slash is stripped. A missing, relative or `ftp://` value is rejected. |
| `APIClientTests` (`URLProtocol` stub) | Login sends the JSON body and decodes the session. Authenticated calls send the bearer header. An error body becomes `APIError.server` with its message. 401 becomes `.unauthorized`. No connection becomes `.network`. |
| `SessionStoreTests` (in-memory Keychain fake) | Login stores the session. Restore keeps a valid session and drops an expired one. A 401 from `/me` clears it. Logout clears it and keeps `lastLoginEmail`. |
| `MultipartBodyWriterTests` | Exact bytes for a field part and a file part. The boundary never appears in the content. The body ends with `--<boundary>--\r\n`. |
| `UploadPayloadBuilderTests` | For `SampleGeometry.twoRoomApartment()`: 2 rooms, areas 20.0 and 14.0, footprint 8.5 × 4.0, `isMerged` true, and the right counts per room. Room names come from the `Room` rows. `floorPlan` and `thumbnail` are PNGs. There's no `model` part in the Simulator. |
| `UploadQueueTests` (stub server, in-memory store) | 201 gives `uploaded` with `remoteID`. A 200 replay gives `uploaded`. 401 leaves the location `pending` and clears the session. 500 and no connection leave it `pending` with an error and a counted attempt. 422 gives `failed` with the message. Only the current user's locations are sent. Drafts are never sent. The SYNC-8 reset works. |
| `LocationRepositoryTests` | The new sync operations. A store created with model version 1 opens with version 2, keeps its locations, and they read as `localOnly` with owner `0`. |
| `ContractFixtureTests` | The committed §7 fixture decodes with `ScanGeometry.decode`, and its metrics match the values the API tests expect (a total area of 34.0). |

---

## 6. Admin UI: Mediciones (`web/`)

### 6.1 Dependencies

Add `three` and `@types/three` (latest versions). Import `OrbitControls` from `three/addons/controls/OrbitControls.js`. Load the 3D viewer with `React.lazy`, so three.js stays out of the main bundle.

### 6.2 Types

`src/types.ts` mirrors §4.2 with `Measurement`, `MeasurementRoom`, `MeasurementFile` and `MeasurementFileKind`.

A new `src/measurements/geometry.ts` mirrors the JSON that Swift's `JSONEncoder` produces for `ScanGeometry` (SPEC-001 §5.2):

- `SIMD2/3/4<Float>` values are arrays: `[x, z]`, `[x, y, z]` and `[x, y, z, w]`.
- `Transform` is `{ c0, c1, c2, c3 }`, the **columns** of the matrix. `new THREE.Matrix4().fromArray([...c0, ...c1, ...c2, ...c3])` reads them in the right (column-major) order.
- Optional values (`merged`, `detectedType`, `labelPosition`, `isOpen`) are left out when they're nil. Treat `null` the same way.
- `parseGeometry(json)` validates the parts of the shape that the web uses, and throws a typed error for anything else, including a `version` above 1 ("unsupported version").
- Helpers ported from SPEC-001 §5.2 and §6.2: choosing the render source (the merged surfaces when present, otherwise every room's surfaces), the plan segment of a surface, an object's footprint, and bounds.

### 6.3 Authenticated files

The API serves files only with a bearer token, and Helmet's CORP header blocks a plain `<img src>` from another origin. So:

- `fileUrl(apiUrl, id, kind)` builds `<VITE_API_URL>/measurements/<id>/files/<kind>`. The admin uses its own configured API URL instead of `files.*.url`, so it keeps working when it reaches the API at an address other than `PUBLIC_URL` (for example `localhost` in development).
- `useMeasurementFile(id, kind)` fetches a file with the stored token, like `httpClient`: as a `Blob` for images and downloads, or as JSON for the geometry. The result is cached with react-query, with `staleTime: Infinity` because files never change. A 401 logs the user out like any other request (react-admin's `useLogoutIfAccessDenied`).
- `<AuthenticatedImage>` turns the Blob into an object URL and revokes it on unmount.
- `downloadMeasurementFile(id, kind)` fetches the file with `?download=1` and saves the Blob under the name from `Content-Disposition`.

### 6.4 Resource, list and edit

- Register `<Resource name="measurements">` with list, show and edit views. The menu label is "Mediciones" and the icon is `ViewInAr`. It goes **first** in the menu. `recordRepresentation` is the name.
- **List** (`Datagrid`, like the existing resources):
  - Columns: Miniatura (a 48 × 48 `AuthenticatedImage` of the thumbnail, or a placeholder icon), Nombre, Habitaciones, Superficie total (`≈ 34,0 m²` when approximate), Fecha del escaneo, Subido por, Fecha de subida.
  - Filters: search (`q`, always shown), Subido por (`createdBy`), Desde and Hasta (`scannedAt_gte`, `scannedAt_lte`).
  - Default sort: `createdAt DESC`. Clicking a row opens Show. Bulk delete asks for confirmation and is pessimistic.
- **Edit:** Nombre and Notas only. It's pessimistic and returns to Show after saving.

### 6.5 Show

```
Mediciones › Apartamento                                       [Editar] [Eliminar]
34,0 m² · 2 habitaciones · 16 oct 2026, 13:20
Subido por admin@example.com el 16 oct 2026, 13:21 · iPhone16,1 · RoomScanner 1.0 (1)
[ PLANO | 3D | MEDIDAS | ARCHIVOS ]
┌────────────────────────────────────────────────────────────────────────────────┐
│                                  tab content                                   │
└────────────────────────────────────────────────────────────────────────────────┘
```

The header shows the name, the summary line, the upload line, and the notes when there are any. When `isMerged` is false and there's more than one room, a banner says: "Las habitaciones no se pudieron unir, así que se muestran tal como se escanearon." Below the header is a `TabbedShowLayout` with four tabs.

#### Plano

- **WEB-PLAN-1** The `floorPlan` PNG, scaled to the tab's width (at most 75vh high), on a white surface in both themes, because the image is drawn for white. Clicking it opens the full-size image in a new tab (using the object URL).
- **WEB-PLAN-2 [P2]** An interactive SVG plan drawn from the geometry (SPEC-001 §9.1), with zoom and pan.

#### 3D

- **WEB-3D-1** A three.js view of the geometry. A pure `buildScene(geometry, { showObjects })` function returns a `THREE.Group`, so it can be tested without WebGL. It follows SPEC-001 §9.2:

  | Element | Geometry | Material |
  |---|---|---|
  | Wall | `BoxGeometry(w, h, 0.10)`, matrix from `transform`, `matrixAutoUpdate = false` | `#DBDBDB`, opaque |
  | Door | `BoxGeometry(w, h, 0.14)` | `rgb(158,110,71)` |
  | Window | `BoxGeometry(w, h, 0.14)` | `rgb(158,209,255)`, opacity 0.5 |
  | Opening | Not rendered | |
  | Object | `BoxGeometry(w, h, d)` | Opacity 0.9, colored by group as in `ObjectCategory.group`: furniture `rgb(140,158,184)`, appliance `rgb(158,173,158)`, fixture `rgb(184,168,148)` |
  | Floor | `ShapeGeometry` of the polygon points `(x, −z)`, rotated −π/2 about X, at y = the room's lowest wall base | The room tint, with the same palette as `SceneBuilder.roomTint` on iOS (blue, green, orange, purple, …) |

  Everything sits in one group whose matrix is the plan rotation, with columns `(c, 0, s, 0)`, `(0, 1, 0, 0)`, `(−s, 0, c, 0)` and `(0, 0, 0, 1)`, where `c = cos(planRotation)` and `s = sin(planRotation)`. This is the same matrix as `GeometryMath.planRotationMatrix`, so the model starts square to the screen, like the plan.
- **WEB-3D-2** A perspective camera with a 45° FOV looks at the center of the bounding box from the direction `(1, 1.2, 1)`, at 1.6 × the largest extent. `OrbitControls` orbits around that center, with `maxPolarAngle` just under 90° so the camera can't go below the floor. Use an ambient light and a directional light. The background follows the MUI theme (light or dark).
- **WEB-3D-3** Two buttons: **Restablecer vista**, and **Mobiliario**, which shows or hides the objects. The canvas fills the tab's width, is at least 420 px high, and follows resizes (`ResizeObserver`). With `prefers-reduced-motion`, damping is off.
- **WEB-3D-4** On unmount, dispose of the renderer, the controls, the geometries and the materials. Without WebGL (including in jsdom), show "Tu navegador no puede mostrar la vista 3D." instead of crashing. If the geometry can't be loaded, or has a newer version, show an error message in this tab; the Plano tab keeps working.

#### Medidas

- **WEB-MEAS-1** **Resumen:** total floor area, number of rooms, footprint (`8,50 × 4,00 m`), and scan date.
- **WEB-MEAS-2** One card per room, in `index` order, from `record.rooms`: the name and type, the floor area (with `≈` when approximate, `—` when unknown), the perimeter and the ceiling height. Under these, collapsible tables built from the `geometry.rooms` entry with the same `id`:
  - **Paredes (n):** `Pared 1: 3,42 × 2,51 m` (length × height)
  - **Puertas (n):** width × height, with "abierta" for open doors
  - **Ventanas (n)** and **Aberturas (n):** width × height
  - **Objetos (n):** the category, then W × D × H

  If the geometry isn't available, show the room metrics on their own with a note.
- **WEB-MEAS-3** Numbers use the `es` locale: lengths `3,42 m` (2 decimals), areas `12,4 m²` (1 decimal), sizes `2,10 × 0,90 × 0,85 m`. Room types and object categories use the app's Spanish names:

  | Room type | Name |
  |---|---|
  | `bedroom` | Dormitorio |
  | `bathroom` | Baño |
  | `kitchen` | Cocina |
  | `livingRoom` | Sala |
  | `diningRoom` | Comedor |
  | `null` | — |

  | Category | Name | Category | Name |
  |---|---|---|---|
  | `storage` | Almacenamiento | `dishwasher` | Lavavajillas |
  | `refrigerator` | Refrigerador | `table` | Mesa |
  | `stove` | Estufa | `sofa` | Sofá |
  | `bed` | Cama | `chair` | Silla |
  | `sink` | Lavabo | `fireplace` | Chimenea |
  | `washerDryer` | Lavadora/Secadora | `television` | Televisor |
  | `toilet` | Inodoro | `stairs` | Escaleras |
  | `bathtub` | Bañera | `other` or unknown | Objeto |
  | `oven` | Horno | | |

#### Archivos

- **WEB-FILES-1** One row per stored file, with a Spanish label (Plano (PNG), Miniatura (PNG), Geometría (JSON), Modelo 3D (USDZ), Medidas (CSV), Datos de RoomPlan (JSON)), its size in KB or MB with `es` formatting, and a **Descargar** button (§6.3). Under Modelo 3D, a note says: "Se abre con Vista rápida en iPhone, iPad y Mac."

### 6.6 i18n and errors

- Add `resources.measurements.name`: "Medición |||| Mediciones", and the field labels: `roomCount` Habitaciones, `totalFloorArea` Superficie total, `scannedAt` Fecha del escaneo, `createdBy` Subido por, `createdAt` Fecha de subida, `notes` Notas, and `scannedAt_gte` / `scannedAt_lte` Desde / Hasta.
- `src/i18n/apiErrors.ts` translates the new API messages that can reach the admin, including the 409 `clientId` conflict and the 413 and 415 errors.

### 6.7 Tests (Vitest)

- `geometry.test.ts`, with the §7 fixture: parsing; rejecting a newer version; render-source selection (merged surfaces or per-room surfaces); the plan segment of a rotated wall; an object's footprint.
- `buildScene.test.ts`: the mesh count equals walls + doors + windows + objects + floors; objects are hidden when `showObjects` is false; the group's matrix equals the plan rotation; a wall mesh's world position equals the translation of its transform.
- Formatting: lengths, areas and sizes in `es`; room-type and category names, with `Objeto` for unknown categories.
- `fileUrl` and the file fetcher: the bearer token is sent, `?download=1` is added for downloads, and 401 is handled.
- Smoke renders, like `spanish-ui.smoke.test.tsx`, of `/measurements`, `/measurements/1/show` (every tab; the 3D tab shows the WebGL fallback in jsdom), and `/measurements/1` (edit), with a mocked data provider and `fetch`.

---

## 7. Contract fixture

`two-room-apartment.geometry.json` is `SampleGeometry.twoRoomApartment()` encoded with `JSONEncoder` and `.sortedKeys`. Generate it once (for example with a temporary Swift test that prints the JSON) and commit **identical** copies to:

- `mobile/RoomScannerTests/Fixtures/` (XcodeGen bundles it as a test resource)
- `api/test/fixtures/`
- `api/src/db/fixtures/sample-measurement/geometry.json`
- `web/src/measurements/__fixtures__/`

The sample uses random UUIDs, so the IDs are fixed when the fixture is generated, and tests compare metrics instead of re-encoding the sample. The expected values are: 2 rooms, floor areas of 20.0 and 14.0 m², a total of 34.0 m², a footprint of 8.5 × 4.0 m, 2.5 m walls, and `merged` present.

Also commit a matching `metadata.json` (the field the phone would send) next to the API fixture, and the same file next to the seed geometry. Document how to regenerate the fixtures in `mobile/README.md`.

---

## 8. Documentation

- **Root `README.md`:** the repository now has three parts. Add `mobile/` to the table and a short paragraph about measurements from the iPhone. Add a "Run with a phone" section: start the API, start a tunnel, set `PUBLIC_URL` and `TRUST_PROXY`, set `API_BASE_URL` in `mobile/Config/API.local.xcconfig`, build to the device, log in, scan, and open Mediciones in the admin.
- **`api/README.md`:** the new variables, the "Public URL" section (§3.2), the measurement endpoints and errors, and a curl example that uploads the fixture. In curl, `-F 'name=<file'` sends a file's contents as a field and `-F 'name=@file'` sends a file:

  ```bash
  curl -s -X POST $API/api/measurements -H "Authorization: Bearer $TOKEN" \
    -F 'metadata=<test/fixtures/metadata.json' \
    -F 'geometry=@test/fixtures/two-room-apartment.geometry.json;type=application/json' \
    -F 'floorPlan=@src/db/fixtures/sample-measurement/floor-plan.png;type=image/png'
  ```

- **`web/README.md`:** the Mediciones screens, the three.js dependency, and `VITE_API_URL` = `PUBLIC_URL` + `/api`.
- **`mobile/README.md`:** the API configuration (`API_BASE_URL`, the `$()` workaround, the local override), login, uploads, and the extended device checklist (§10). Remove "No accounts, no network" from the introduction.
- **`mobile/NOTES.md`:** deviations and anything left unverified.
- Don't edit the earlier specs. The header of this spec states what it supersedes.

---

## 9. Implementation order

| Milestone | Contents | Check |
|---|---|---|
| **M1 API: public URL** | `PUBLIC_URL`, `TRUST_PROXY`, `UPLOAD_MAX_FILE_MB`, `publicUrlFor`, `trust proxy`, startup log, `.env.example`, tests | `npm run lint && npm test` |
| **M2 Contract fixture** | The §7 fixture and `metadata.json`, generated from the sample and copied | Files committed |
| **M3 API: measurements** | Migration, upload, list/get/update/delete, files endpoint, errors, CORS headers, tests, seed [P1], README | `npm run lint && npm test` |
| **M4 Web** | Types, geometry helpers, file access, list, edit, show tabs, 3D viewer, i18n, tests, README | `lint`, `typecheck`, `test`, `build` |
| **M5 Mobile: configuration and login** | xcconfig files, `AppConfiguration`, ATS, `APIClient`, Keychain, `SessionStore`, `RootView`, `LoginView`, the Settings account section, tests | Log in from the Simulator to the API on `localhost` |
| **M6 Mobile: upload** | Model version 2 and migration, repository operations, payload builder, multipart writer, queue, UI indicators, privacy texts and manifest, tests | The DEBUG sample location appears in the admin |
| **M7 Docs and verification** | READMEs, NOTES.md, §10 | Everything in §10 |

Commit at the end of each milestone.

---

## 10. Definition of Done

**Automated checks. All MUST pass:**

```bash
cd api    && npm ci && npm run lint && npm test
cd web    && npm ci && npm run lint && npm run typecheck && npm test && npm run build
cd mobile && xcodegen generate && xcodebuild -project RoomScanner.xcodeproj -scheme RoomScanner \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=latest' build test
```

The iOS build has no new warnings.

**Manual walkthrough on the Mac and the Simulator:**

1. In `api/`: `npm run db:reset && npm run dev`. The log shows the public URL, and `curl -s localhost:4000/health` returns `ok`.
2. Upload the fixture with the README's curl example. The response is 201, with a `Location` header and `files.*.url` values under `PUBLIC_URL`. Repeat it: the response is 200 with the same `id`.
3. In the admin, Mediciones lists that measurement (and the seeded sample, [P1]). On its Show page:
   - Plano shows the image.
   - 3D orbits, zooms, resets and toggles furniture, in light and dark mode.
   - Medidas shows 34,0 m² and both rooms with their walls, doors, windows and objects.
   - Archivos downloads each file under a sensible name.

   Edit the name, then delete the measurement.
4. In the Simulator, with `API_BASE_URL = http:/$()/localhost:4000`, the app opens on the login screen. A wrong password shows the inline error, and the right credentials open Home. After a relaunch, you're still logged in.
5. Use DEBUG → Add sample location. The row goes from Pendiente to Subiendo to Subido, and the measurement appears in the admin with its plan, 3D view and measurements.
6. Stop the API and add another sample. It stays Pendiente with an error. Start the API and bring the app back to the foreground: the sample uploads.
7. Deactivate your user in the admin, then trigger an upload. The app returns to the login screen and the location stays Pendiente. Reactivate the user and log in: the location uploads.
8. Cerrar sesión with a pending upload shows the warning.
9. Change `PUBLIC_URL` and restart the API. New `files.*.url` values follow it, and the admin keeps working.

**Manual, on a LiDAR device.** Add these steps to `mobile/README.md`, and record anything you couldn't run in `NOTES.md`:

10. Through a tunnel (§3.2), log in, scan two rooms and save. The upload completes, and the admin shows the plan, the 3D view, the measurements, and a USDZ that opens in Quick Look.
11. Turn on Airplane Mode before saving. The scan is kept and uploads when the connection returns.
12. **[P1]** Send the app to the background right after saving. The upload still completes.

---

## 11. Out of scope (future work)

- Two-way sync: downloading server measurements to the phone, syncing later edits (except rename, [P2]), and deleting on the server from the phone.
- Refresh tokens, per-client token lifetimes, "remember me", and unlocking the app with Face ID.
- Roles, or per-user visibility of measurements.
- Object storage (S3 and similar), CDN delivery, signed file URLs, and reclaiming disk space after deletes (`VACUUM`).
- Server-side processing of the raw RoomPlan data (merging again, re-rendering), format conversions (USDZ to glTF), and PDF reports.
- Linking measurements to inventory products, clients or jobs.
- Background `URLSession` uploads that continue after the app is terminated.
- Docker, CI and hosting configuration. SPEC-002 §11 still applies, except for `PUBLIC_URL` and `TRUST_PROXY`.

---

## 12. Risks and open questions

| Risk | Mitigation |
|---|---|
| BLOBs make the SQLite file grow quickly: a USDZ and the raw data can each be several MB. | `UPLOAD_MAX_FILE_MB` caps each file. Files live in their own table, so lists stay fast. Object storage is future work. |
| Measurements upload as soon as they're saved, possibly over cellular data. | Acceptable for this version. A "Wi-Fi only" setting is an easy follow-up. |
| ATS and local network rules differ between `localhost`, `.local` names and raw IP addresses. | NET-2 and NET-3: verify and document what works. Tunnels avoid the problem. |
| With 8-hour tokens, phone users type their password every day. | No data is ever lost, and `JWT_EXPIRES_IN` can be raised. |
| The web's 3D view is a port of the SceneKit code and can drift from the app. | The same rules (the §6.5 table), the shared fixture, and the `buildScene` tests. |
| Quick-tunnel addresses change every time, so `PUBLIC_URL` and the app's URL have to be updated together. | Documented in §3.2. In DEBUG builds, the server override (CFG-4) avoids a rebuild. |

**Open questions** (none of them block this spec):

1. Should deleting or renaming on the phone also change the server copy?
2. Should only the uploader, or an admin role, be able to delete a measurement?
3. Should a measurement belong to a client or a job, linking it to the inventory side of the system?
