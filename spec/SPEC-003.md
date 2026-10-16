# SPEC-003: User accounts and login

| | |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-10-16 |
| **Builds on** | [SPEC-002](SPEC-002.md). Replaces its single-admin authentication (§3 "Auth", §6.4) and removes "multiple user accounts" from its out-of-scope list (§11). |
| **Deliverables** | `api/`: `users` table, `/api/users`, DB-backed login · `web/`: Usuarios screens |

The keywords **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in RFC 2119.

## 1. Summary

An administrator can create, edit, deactivate and delete user accounts, and each user logs in with their own email and password. Login returns a JWT, as before. There are **no roles or permissions** yet: every active user can do everything, including managing users.

## 2. Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Storage | New `users` table (migration `002_users.sql`). | Accounts must be created at runtime, which env vars can't do. |
| Password hashing | Node's built-in `crypto.scrypt`, N=2¹⁴, r=8, p=5 (OWASP's lower-memory setting, ~16 MB and ~150 ms per hash), 16-byte random salt, 64-byte key. Stored as `scrypt$N$r$p$<salt b64>$<key b64>`. | No native dependency (bcrypt and argon2 need prebuilt binaries; `crypto.argon2` isn't in Node 22). The parameters travel with the hash, so the cost can be raised later. |
| First user | While `users` is empty, the server, `db:seed` and `db:reset` create one user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Afterwards those variables are not used for login. | A fresh install, or an upgrade from SPEC-002, logs in with the same credentials as before, and no extra setup command is needed. The variables stay required so this never fails. |
| Token subject | JWT `sub` = user id (string). The user is loaded on every authenticated request. | Deleting or deactivating a user ends their sessions immediately, and renaming an email doesn't break a session. A primary-key lookup in SQLite costs almost nothing. |
| Lockout protection | You cannot delete (409) or deactivate (422) your own account. | There is always at least one active user who can log in. |
| Audit trail | `stock_movements.created_by` stays a plain email (no foreign key). New movements use the user's **current** email. | Deleting a user keeps their history. |

## 3. Data model

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  name          TEXT,
  password_hash TEXT    NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  last_login_at TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);
```

| Field | Type | Rules |
|---|---|---|
| `id` | integer | read-only |
| `email` | string | required, valid email, ≤ 254 chars, trimmed and stored **lowercased**, unique (case-insensitive) |
| `name` | string \| null | ≤ 100 chars; blank becomes `null` |
| `password` | string | **write-only**, never returned. 8–128 chars, not trimmed, Unicode-normalized (NFC) before hashing. Required on create. On update, missing / `null` / `""` keeps the current password. |
| `active` | boolean | default `true` |
| `lastLoginAt` | string \| null | read-only, set on each successful login |
| `createdAt`, `updatedAt` | string | read-only |

SPEC-002 §5.1 conventions apply: unknown and read-only fields are ignored, and `PUT` merges.

## 4. API

### 4.1 Authentication (replaces SPEC-002 §6.4)

- `POST /api/auth/login` `{ email, password }`
  - Looks up the user by email (case-insensitive) and verifies the password with scrypt.
  - An unknown email, a wrong password and an inactive account MUST all return the same `401 INVALID_CREDENTIALS`. An unknown email is verified against a dummy hash so it takes as long as a wrong password.
  - 200 → `{ "token": "<jwt>", "expiresAt": "<ISO>", "user": { "id": 1, "email": "…", "name": null } }`, and sets `lastLoginAt`.
  - Rate limit unchanged: 10 attempts per 15 minutes per IP.
- JWT: HS256, `sub` = `String(user.id)`, `exp` from `JWT_EXPIRES_IN`.
- `requireAuth` verifies the token, loads the user and rejects (`401 UNAUTHORIZED`) when the subject isn't a positive integer, or the user doesn't exist or is inactive. It sets `req.user = { id, email, name }`.
- `GET /api/auth/me` → `{ id, email, name }`.
- SPEC-002 tokens (`sub` = email) are rejected, so everyone logs in once after the upgrade.

### 4.2 `/api/users`

Standard SPEC-002 §6.3 resource (`ra-data-simple-rest`), behind `requireAuth`.

| Content-Range name | Sortable fields | Default sort | Filter keys (besides `id`, `q`) | `q` searches |
|---|---|---|---|---|
| `users` | `id`, `email`, `name`, `active`, `lastLoginAt`, `createdAt`, `updatedAt` | `email ASC` | `active` | `email`, `name` |

| Case | Response |
|---|---|
| Duplicate email (any case) on create or update | 409 `CONFLICT`, `errors.email` = `A user with this email already exists` |
| `DELETE` your own account | 409 `CONFLICT`, `You cannot delete your own account` |
| `PUT` `active: false` on your own account | 422 `VALIDATION_ERROR`, `errors.active` = `You cannot deactivate your own account` |
| Unknown id | 404 `NOT_FOUND`, `User <id> not found` |

### 4.3 Configuration

`ADMIN_EMAIL` and `ADMIN_PASSWORD` stay required (now 8–128 chars) and keep the production placeholder check. They now define the **initial user** only (§2). No new variables.

## 5. Admin UI (`web/`)

- **Session storage** (`inventory.auth`): `{ token, expiresAt, userId, email, name }`. A stored session without `userId` (saved before this change) counts as logged out. `getIdentity()` → `{ id: userId, fullName: name || email }`.
- **Menu:** Usuarios is added last (icon `People`).
- **List:** Name (with a "Tú" chip on your own row), Email, Active, Last login ("Nunca" when null), Created. Search (`q`) and an Active filter. Your own row cannot be selected for bulk delete.
- **Create:** Name, Email, Password (`PasswordInput`, required, 8–128, `autoComplete="new-password"`), Active (default on).
- **Edit:** the same fields. The password field is labelled "Nueva contraseña" and may be left blank to keep the current one. On your own account, Active is disabled and there is no delete button. Saving your own account updates the stored identity so the app bar shows the new name immediately.
- All mutations are pessimistic, and API messages are translated to Spanish (SPEC-002 §7.4).

## 6. Tests

**API:** password hashing (format, salt, cost read from the hash, NFC, malformed hashes never match); login against DB users (case-insensitive email, `sub` = id, `lastLoginAt`); tokens for missing users, without `sub`, and old email-subject tokens → 401; user CRUD and validation; duplicate email (409); password kept on blank update and changed when sent; the hash never appears in responses; deactivating or deleting a user ends their sessions; history survives deletion; `createdBy` follows an email change; self-delete and self-deactivate are refused; list filters, search and sort; `ensureInitialUser` runs only on an empty table.

The test helper creates the initial user with a cheap scrypt cost (`N=2¹⁰`) so every test can log in quickly. Users created through the API use the production cost.

**Web:** login stores `userId`/`name`; identity falls back to the email; legacy sessions are rejected; `updateStoredUser`; new translations; Spanish smoke renders of `/users`, `/users/create`, and edit for another user and for yourself.

## 7. Out of scope (future work)

- Roles and permissions (e.g. only admins manage users), per-resource access control.
- Self-service password change with the current password, password reset by email, forced change on first login.
- Ending existing sessions when a password changes (e.g. a per-user token version). Today, deactivate the user to cut them off immediately.
- Account lockout after repeated failures (beyond the per-IP rate limit), MFA, SSO.
