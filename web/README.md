# Cleaning Inventory Admin

React Admin single-page app for the cleaning products inventory ([SPEC-002](../spec/SPEC-002.md)). Staff use it to manage the catalog, record stock movements, and watch low-stock items on a dashboard.

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

Log in with the API's `ADMIN_EMAIL` / `ADMIN_PASSWORD` (the "Username" field takes the email). The API must allow this app's origin in its `CORS_ORIGIN`.

## Configuration

Vite only exposes `VITE_*` variables to the browser, and it **inlines them at build time**, so changing one requires a rebuild (or a dev-server restart). Never put secrets here.

| Variable | Required | Default | Meaning |
|---|---|---|---|
| `VITE_API_URL` | **yes** | – | API base URL **including `/api`**, e.g. `https://inventory.example.com/api`. A trailing slash is stripped. |
| `VITE_APP_TITLE` | no | `Cleaning Inventory` | App bar and document title |
| `VITE_CURRENCY` | no | `USD` | ISO 4217 code used to display money |
| `PORT` | no | `5173` | Dev/preview server port. Read by `vite.config.ts` and never exposed to the browser. |

If `VITE_API_URL` is missing or not an absolute http(s) URL, the app renders a plain "Missing configuration" page instead of a blank screen.

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

All mutations are pessimistic. Server field errors appear under the matching inputs, and the API's `message` appears in the notification.

## Layout

```
src/
  main.tsx             validates config, renders <App> or the config error page
  App.tsx              <Admin> with resources, dashboard and providers
  config.ts            parseConfig(import.meta.env)
  types.ts             Category, Supplier, Product, StockMovement, Stats (mirrors the API)
  providers/           httpClient (bearer token), authProvider, dataProvider (+ getStats)
  dashboard/           Dashboard, StatCard
  resources/           products, stockMovements, categories, suppliers
  components/          shared fields (quantity, money, delta, chips), validators, movement buttons
  utils/format.ts      quantity, signed delta, currency and date formatting
```

## Notes

- **No `requireAuth` on `<Admin>`.** With React 19 and react-router 7, react-admin 5's `requireAuth` loops between `LogoutOnMount` and `/login` when logged out. Resource views check auth themselves, and the dashboard is wrapped in `<Authenticated>`, so nothing is fetched before `checkAuth` passes.
- **MUI is pinned to v7.** react-admin 5's peer range also allows MUI 9, but react-admin still passes `InputProps`/`inputProps`/`inputRef` to text fields, which MUI 9 no longer accepts, so they leak to the DOM. `@mui/icons-material` is on the same major as `@mui/material`.
- **ESLint instead of oxlint.** The current Vite template ships oxlint. This app uses the ESLint flat config that the template used before, as the spec requires (`eslint.config.js`, `npm run lint` → `eslint .`).
- The dashboard's "Out of stock" link uses the API's `outOfStock` product filter, an addition to the spec's filter whitelist.
