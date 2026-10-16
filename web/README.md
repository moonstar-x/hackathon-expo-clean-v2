# Cleaning Inventory Admin

React Admin single-page app for the cleaning products inventory ([SPEC-002](../spec/SPEC-002.md), user accounts in [SPEC-003](../spec/SPEC-003.md)). Staff use it to manage the catalog, record stock movements, watch low-stock items on a dashboard, and manage who can log in.

Stack: react-admin 5, `ra-data-simple-rest`, MUI 7, React 19, Vite, TypeScript, Vitest.

This app is independent of the API in `../api`. It shares no code with it, talks to it only over HTTP, and can point at any API host through `VITE_API_URL`.

## Quick start

```bash
cd web
nvm use              # optional: Node 24 from .nvmrc
npm ci
cp .env.example .env
npm run dev          # http://localhost:5173 (PORT from .env)
```

The first time, log in with the API's `ADMIN_EMAIL` / `ADMIN_PASSWORD` (the API creates that initial user while it has no users; the "Correo electrónico" field takes the email). Then add everyone else under **Usuarios**. The API must allow this app's origin in its `CORS_ORIGIN`.

The interface is in Spanish, including React Admin/MUI controls, validation and API errors. Dates, numbers and currencies use the `es` locale. Displayed unit names are translated while API identifiers remain unchanged. Existing catalog content is shown as stored. Shared translations live in `src/i18n/`.

## Configuration

Vite only exposes `VITE_*` variables to the browser, and it **inlines them at build time**, so changing one requires a rebuild (or a dev-server restart). Never put secrets here.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `VITE_API_URL` | **yes** | – | API base URL **including `/api`**, e.g. `https://inventory.example.com/api`. A trailing slash is stripped. |
| `VITE_APP_TITLE` | no | `Inventario de limpieza` | App bar and document title |
| `VITE_CURRENCY` | no | `USD` | ISO 4217 code used to display money |
| `PORT` | no | `5173` | Dev/preview server port. Read by `vite.config.ts` and never exposed to the browser. |

If `VITE_API_URL` is missing or not an absolute http(s) URL, the app renders a Spanish configuration error page instead of a blank screen.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint (typescript-eslint, react-hooks, react-refresh) |
| `npm test` | Vitest (jsdom, `fetch` mocked; no `.env` needed) |

## Screens

- **Dashboard:** stat cards (active, low stock, out of stock, stock value), the 10 lowest-stock products with a **Receive** button, and the 10 latest movements. The Low stock and Out of stock cards link to the filtered product list.
- **Products:** list with search, category/supplier/active/hazardous filters and a low-stock toggle (active products by default; low-stock rows are tinted). Create (General / Stock / Safety, with initial quantity), edit (quantity read-only) and show. The show page has **Receive stock / Record usage / Adjust count** buttons and a paginated stock history.
- **Stock movements:** list with product/type/date filters, a create form (labels follow the movement type and the product's current stock is shown), and a read-only show page. Movements cannot be edited or deleted.
- **Categories** and **Suppliers:** list, create, edit, delete with confirmation.
- **Users:** list (search, active filter, last login), create (name, email, password, active), edit (leave the password blank to keep it), delete with confirmation. Every logged-in user can manage users; there are no roles yet. Your own row is marked **Tú**: it cannot be deleted or deactivated, and editing your own name or email updates the app bar immediately.

All mutations are pessimistic. Server field errors appear under the matching inputs, and the API's `message` appears in the notification.

## Layout

```
src/
  main.tsx             validates config, renders <App> or the config error page
  App.tsx              <Admin> with resources, dashboard and providers
  config.ts            parseConfig(import.meta.env)
  types.ts             Category, Supplier, Product, StockMovement, User, Stats (mirrors the API)
  providers/           httpClient (bearer token), authProvider, dataProvider (+ getStats)
  dashboard/           Dashboard, StatCard
  resources/           products, stockMovements, categories, suppliers, users
  components/          shared fields (quantity, money, delta, chips), validators, movement buttons
  utils/format.ts      quantity, signed delta, currency and date formatting
```

## Notes

- **No `requireAuth` on `<Admin>`.** With React 19 and react-router 7, react-admin 5's `requireAuth` loops between `LogoutOnMount` and `/login` when logged out. Resource views check auth themselves, and the dashboard is wrapped in `<Authenticated>`, so nothing is fetched before `checkAuth` passes.
- **MUI is pinned to v7.** react-admin 5's peer range also allows MUI 9, but react-admin still passes `InputProps`/`inputProps`/`inputRef` to text fields, which MUI 9 no longer accepts, so they leak to the DOM. `@mui/icons-material` is on the same major as `@mui/material`.
- **ESLint instead of oxlint.** The current Vite template ships oxlint. This app uses the ESLint flat config that the template used before, as the spec requires (`eslint.config.js`, `npm run lint` → `eslint .`).
- The dashboard's "Out of stock" link uses the API's `outOfStock` product filter, an addition to the spec's filter whitelist.

## Mediciones (SPEC-004)

Mediciones is first in the menu. Its list supports uploader/date/search filters, authenticated thumbnails, metric areas, and confirmed bulk deletion. Edit changes name and notes. Show has Plano (the phone's PNG), 3D (orbit, zoom, reset and furniture toggle), Medidas (summary and expandable room tables), and Archivos (authenticated downloads).

`VITE_API_URL` is the API's `PUBLIC_URL` plus `/api`, including any proxy prefix. Files are fetched through that configured address with the stored bearer token, rather than using the absolute links returned by the server. Images use revocable Blob URLs; immutable file requests are cached by account. A 401 follows the normal logout path.

The 3D viewer loads `three` and `OrbitControls` lazily in a separate bundle. It validates the Swift geometry format, uses column-major transforms and merged render surfaces, and cleans up GPU resources on unmount. A missing WebGL context displays a Spanish fallback. An invalid/newer geometry version does not prevent viewing the PNG or room metrics.

### SPEC-004 notes

All P0 web requirements are implemented and covered by geometry, scene, formatting, file-access and route smoke tests. P2 interactive SVG plan is skipped. Browser automation access was not approved. Interactive WebGL operation and light/dark rendering still need a browser walkthrough with a real GPU; automated jsdom tests cover the fallback.
