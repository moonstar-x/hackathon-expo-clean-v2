# Cleaning Inventory Admin

React Admin single-page app for the cleaning products inventory ([SPEC-002](../spec/SPEC-002.md), user accounts in [SPEC-003](../spec/SPEC-003.md)). Staff use it to manage the catalog, record stock movements, watch low-stock items on a dashboard, and manage who can log in.

Stack: react-admin 5, `ra-data-simple-rest`, MUI 7, React 19, Vite, TypeScript, Vitest.

This app is independent of the API in `../api`. It shares no code with it, talks to it only over HTTP, and can point at any API host through `VITE_API_URL`.

It shares the **CleanCode** design system, component kit and folder layout with the reception admin (`hackathon-expo-clean/client`). **[design.md](design.md)** is the guide: brand, theme tokens, page anatomy, the component kit, how to add a resource, and the code conventions.

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
| `npm run typecheck` | `tsc -b --noEmit` (app, Vite config and tests) |
| `npm run lint` | ESLint: type-checked typescript-eslint, react-hooks, explicit types everywhere, no `any` |
| `npm test` | Vitest, both projects (`fetch` mocked; no `.env` needed) |
| `npm run test:unit` | `tests/lib`: providers, config, formatting, i18n, utilities |
| `npm run test:components` | `tests/components`: every screen in Spanish, and the shared components, in jsdom |
| `npm run test:coverage` | Both projects with V8 coverage |

## Screens

Every screen opens with a heading (section over title) under the app bar. Below 900 px wide, lists turn into cards that load more as you scroll and the toolbars turn into icons. The sign-in page is the CleanCode navy split screen with the email and password form.

- **Dashboard:** stat cards (active, low stock, out of stock, stock value), the 10 lowest-stock products with a **Receive** button, and the 10 latest movements. The Low stock and Out of stock cards link to the filtered product list.
- **Products:** list with search, category/supplier/active/hazardous filters and a low-stock toggle (active products by default; low-stock rows are tinted). Create (General / Stock / Safety, with initial quantity), edit (quantity read-only) and show. The show page has **Receive stock / Record usage / Adjust count** buttons and a paginated stock history.
- **Stock movements:** list with product/type/date filters, a create form (labels follow the movement type and the product's current stock is shown), and a read-only show page. Movements cannot be edited or deleted.
- **Categories** and **Suppliers:** list, create, edit, delete with confirmation.
- **Users:** list (search, active filter, last login), create (name, email, password, active), edit (leave the password blank to keep it), delete with confirmation. Every logged-in user can manage users; there are no roles yet. Your own row is marked **Tú**: it cannot be deleted or deactivated, and editing your own name or email updates the app bar immediately.

All mutations are pessimistic. Server field errors appear under the matching inputs, and the API's `message` appears in the notification.

## Layout

```
src/
  main.tsx             fonts, config check, renders <App> or the config error page, registers the service worker
  App.tsx              <Admin>: providers, theme, layout, sign-in page, dashboard, resources
  Layout.tsx  theme.ts the CleanCode layout (AppBar + sectioned menu) and theme
  components/          the shared kit, appBar/, menu/, login/, list/, fields/, dashboard/, one folder per resource
  constants/ types/ styles/ hooks/ utils/ i18n/ providers/
  resources/           thin page shells and each resource's ResourceProps
tests/                 lib/ (logic) and components/ (screens), with renderWithAdmin; fixtures/
public/                icons, manifest.webmanifest and sw.js
```

See [design.md §8](design.md#8-code-conventions) for what goes where.

## Notes

- **No `requireAuth` on `<Admin>`.** With React 19 and react-router 7, react-admin 5's `requireAuth` loops between `LogoutOnMount` and `/login` when logged out. Resource views check auth themselves, and the dashboard is wrapped in `<Authenticated>`, so nothing is fetched before `checkAuth` passes.
- **MUI is pinned to v7.** react-admin 5's peer range also allows MUI 9, but react-admin still passes `InputProps`/`inputProps`/`inputRef` to text fields, which MUI 9 no longer accepts, so they leak to the DOM. `@mui/icons-material` is on the same major as `@mui/material`.
- **ESLint instead of oxlint.** The current Vite template ships oxlint. This app uses the ESLint flat config that the template used before, as the spec requires (`eslint.config.js`, `npm run lint` → `eslint .`).
- The dashboard's "Out of stock" link uses the API's `outOfStock` product filter, an addition to the spec's filter whitelist.
- **Installable (PWA).** `public/manifest.webmanifest` and `public/sw.js`, registered by production builds only (dev keeps Vite's HMR). The worker caches just the page and Vite's content-hashed `/assets/`; API calls go to another origin and always hit the network. Try it with `npm run build && npm run preview`.

## Mediciones (SPEC-004)

Mediciones is first in the menu, and its screens are built on the CleanCode kit like the others ([design.md §3](design.md#3-page-anatomy)):

- **List:** a table from `md` and cards below it, each led by the plan's thumbnail. Search (name, notes, uploader's email), Subido por, and the scan date range; newest upload first; bulk delete asks first.
- **Show:** the scan date over the name, then a summary (total area, rooms, outer dimensions, notes, and a note when the phone couldn't join the rooms), four tabs, and the details of the upload. **Plano** is the phone's PNG on white paper, opening full size in a new tab. **3D** orbits, zooms, resets and toggles the furniture, with a legend naming each room's floor color. **Medidas** has a card per room with its walls, doors, windows, openings and objects in tables that open from the card. **Archivos** downloads each file under the API's name.
- **Edit:** the name and the notes.

`VITE_API_URL` is the API's `PUBLIC_URL` plus `/api`, including any proxy prefix. Files are fetched through that configured address with the stored bearer token, rather than using the absolute links returned by the server. Images use revocable Blob URLs; immutable file requests are cached by account. A 401 follows the normal logout path.

The 3D viewer loads `three` and `OrbitControls` lazily in a separate bundle. It validates the Swift geometry format, uses column-major transforms and merged render surfaces, and cleans up GPU resources on unmount. It builds the scene once per geometry: the furniture toggle and the light/dark theme change it in place, so the camera stays put, and it draws only while something changes. A missing WebGL context displays a Spanish fallback. An invalid/newer geometry version does not prevent viewing the PNG or room metrics.

### SPEC-004 notes

All P0 web requirements are implemented and covered by geometry, scene, formatting, file-access, component and route smoke tests. P2 interactive SVG plan is skipped. The screens were walked through in Chrome with a real GPU, in light and dark mode and at phone width: orbit, zoom, reset, the furniture toggle, editing, and the uploader filter. Downloads are covered by tests rather than the walkthrough.

Deviations from §6:

- **Resumen** (WEB-MEAS-1) is the summary card above the tabs, visible from every tab, rather than a second copy inside Medidas.
- **Subido por** filters by account (the API's `userId` filter) through a search-as-you-type list of users. `createdBy` only matches a whole email, case aside, and misses uploads made before an email change. The date filters read **Escaneada desde / hasta**, since the list has two dates.
- A room's detected type shows only when its name doesn't already say it ("Sala comedor" gets "Sala"; "Cocina" doesn't get "Cocina" again).
- On a portrait stage (a phone), the starting camera backs off by the aspect ratio so the whole model fits; elsewhere it is 1.6 × the largest side, as WEB-3D-2 says.
- The contract fixture lives in `tests/fixtures/`, with the other test code, rather than `src/measurements/__fixtures__/`.

## Cotizaciones (SPEC-005)

The menu adds Cotizaciones and Configuración de cotización: Parámetros, Tipos de zona, Horarios, Productos de cotización and Equivalencias de tipos. Settings remain separate from inventory. Parameters are grouped by the workbook sections, percentage inputs convert to fractions without float drift, source notes can be edited, and catalog references use searchable selectors. Product screens display net container/unit/solution prices and effective stock. Equivalences include a Sin equivalencia filter and a small edit page.

Quotes open from their list or the measurement's Cotización action. The detail provides Resumen, Zonas, Oferta técnica, Plan de compras, Tarifa plana, Control de mermas and Supuestos. It shows preliminary figures and translated review causes, per-field source chips, staffing, negotiation limits, consumption/purchases and the saved settings snapshot. Pending calculations poll every second and show a slow-calculation notice after a minute. Errors offer Recalcular. Changed settings show Parámetros modificados without changing stored figures.

Editar saves pessimistically, records manual inputs and returns to Show. Zone cards support adding, removing and reordering, nullable missing inputs, sanitary assumptions and the simulation review gate. Regenerar asks before replacing zone edits from the original measurement. Waste control previews the API's calculation as consumption is entered and persists by month. Measurement deletion preserves the quote.

Quote contracts live in `src/types/quotes.ts`; Spanish labels, enum names, causes, warnings and screen text live in `src/i18n/quotes.ts`. Money uses `VITE_CURRENCY`; percentages, hours, FTE, quantities and surfaces use Spanish formatting. Tests cover percentage conversion, all issue codes, Appendix A.4, status chips, polling and list/show/edit/settings smoke renders. All web [P1] features are implemented using a dedicated equivalence edit page (inline editing is optional). The optional [P2] stacked bar and snapshot-change highlighting are omitted.
