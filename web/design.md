# Design guide: Inventario de limpieza

This admin shares the **CleanCode** design system with the reception admin (`hackathon-expo-clean/client`): the same theme, assets, page anatomy and component kit, for a different job. `src/theme.ts` is the source of truth for every visual value; this guide says how to use it, which component to reach for, and how a new screen is put together. When the two disagree, the code wins and this file gets fixed.

## 1. Brand

The mark is a **squeegee whose blade holder is a curly brace `{`**: code is the tool that cleans. Beside it, a monoline wordmark: "clean" in navy, "code" in indigo (sky on dark). Source kit: `expoclean/CleanCode-logo-final/` (`brand.md`, every SVG and PNG size).

### Files in this app

| Where it shows | File |
|---|---|
| AppBar, light mode | `src/assets/brand/logo-horizontal.svg` (phones: `logo-icon.svg`) |
| AppBar, dark mode | `src/assets/brand/logo-horizontal-inverse.svg` (phones: `logo-icon-inverse.svg`) |
| Sign-in page | `STACKED_LOGO` path data in `src/constants/brand.ts`, drawn stroke by stroke |
| Browser tab | `public/favicon.svg`, `public/favicon.ico` |
| Home screen / PWA | `public/apple-touch-icon-180.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` |

Always use the SVGs where the tool supports them; they stay sharp at any size.

### Colors

| Name | Hex | Role |
|---|---|---|
| Navy | `#0F172A` | "clean", text on light, dark surfaces (paper in dark mode) |
| Navy deep | `#0A1022` | Dark-mode page background, sign-in page |
| Indigo | `#4F46E5` | Primary on light: actions, links, the active menu item |
| Indigo deep | `#312E81` | In the kit for deep indigo surfaces; no screen uses it yet |
| Sky | `#38BDF8` | Primary on dark only: never on white, it is too faint |
| White | `#FFFFFF` | Paper in light mode, "clean" on dark |
| Mist | `#EEF2FF` | Brand soft background (cards, avatars); in the kit, not used by a screen yet |
| Slate | `#CBD5E1` | Secondary text on navy (sign-in page), secondary in dark mode |

Contrast: navy on white 17.9:1, indigo on white 6.3:1, sky on navy 8.3:1, indigo on mist 5.6:1. All pass WCAG AA.

These live in `BRAND` (`src/constants/brand.ts`). **No hex value is written anywhere else**: components read the theme palette, and only brand-fixed surfaces (the sign-in page, which is navy in both modes) read `BRAND`.

### Logo rules

- Clear space around the logo at least the height of the "c" in the wordmark; a quarter of its width around the icon alone.
- Horizontal logo at least 200 px wide, the icon at least 32 px. The AppBar is the one deliberate exception (`LOGO_HEIGHT`, 32 px tall): at 200 px it outweighed everything else in the bar.
- Don't recolor it outside this palette or use the Expo Clean event colors (lime green, teal) on it.
- Don't stretch, squash or re-rotate the squeegee (its −14° tilt is part of the mark), add shadows, outlines, gradients or shine, change the gap to the wordmark, retype the wordmark, or place it on a busy photo without a solid panel.

## 2. Tokens: reading `src/theme.ts`

`theme.ts` builds a light and a dark theme from the same parts (typography, shape, a shadow scale, component overrides) and adds MUI's Spanish locale. `<Admin theme darkTheme>` gets both; the AppBar's toggle switches between them and react-admin remembers the choice.

### Palette

| Token | Light | Dark |
|---|---|---|
| `primary.main` | Indigo `#4F46E5` | Sky `#38BDF8` |
| `secondary.main` | Navy `#0F172A` | Slate `#CBD5E1` |
| `background.default` / `.paper` | `#F8FAFC` / White | Navy deep / Navy |
| `text.primary` / `.secondary` | Navy / navy at 64% | white at 88% / slate at 72% |
| `divider` | navy at 12% | slate-400 at 18% |
| `success`, `warning`, `error`, `info` | MUI's defaults | MUI's dark defaults |

Use the tokens, never the values:

```tsx
<Typography sx={{ color: 'text.secondary' }} />                      // a palette path
<Box sx={{ bgcolor: (theme: Theme): string => alpha(theme.palette.warning.main, 0.08) }} />  // derived
```

Where a prop is typed without the theme (DataTable's and SimpleList's `rowSx`), read it with `useTheme()` and pass a plain value; see `lowStockRowSx` in `src/styles/products.ts`.

### Type

- **Poppins**, self-hosted through `@fontsource/poppins`, weights **400, 500, 600, 700** in the latin and latin-ext subsets (`src/main.tsx`). Load a new weight there before using it, or the browser substitutes the nearest one.
- Headings are bold and slightly tight (`h1`–`h3` 700, `h4`–`h6` 600, negative letter spacing); body text has 1.55 line height; buttons are 600 and never uppercase.
- The page title is `PageHeader`'s `<h1>` (24 px on phones, 27 px up). Card titles are `h6`.
- Numbers that change in place (stat values, the clock) get fixed-width digits: `fontVariantNumeric: 'tabular-nums'`, or `FixedDigits` for Poppins, which has no tabular figures.

### Shape and depth

| Radius | Used by |
|---|---|
| 8 | Chips, menu items, list items, tooltips |
| 10 | Buttons, inputs, alerts, the StatBar (`shape.borderRadius`) |
| 12 | Paper, menus, popovers, autocomplete lists |
| 14 | Cards |
| 16 | Dialogs |

Surfaces are flat: cards have a hairline divider border and a near-invisible shadow. The navy-tinted shadow scale is for things that float (menus, popovers, dialogs, toasts).

### Component overrides worth knowing

- **Inputs** are filled by default, with a soft fill, hairline border and a 3 px primary focus ring (red when in error).
- **DataTable** headers are frosted (blurred, semi-opaque) so sticky labels stay legible over scrolled rows; tables scroll inside their card instead of stretching the page.
- **Switches** are compact pills in the primary color.
- **Menu** items show a muted icon, and the active one is primary. A section label (`SectionLabel`) groups them.
- **Links** are underlined on hover only, so tables full of references stay calm. This one was added for this app.
- **Focus**: buttons and icon buttons show a 3 px accent ring on keyboard focus; the skip link ("Ir al contenido") appears on the first Tab.
- `MuiUseMediaQuery` reads the viewport on the first render (`noSsr`). `ResponsiveSwitch` depends on it, so only one of its views ever renders and fetches.

### Breakpoints

MUI's defaults: `sm` 600, `md` 900, `lg` 1200.

- **`md`** is the main one. Below it, lists become cards, the AppBar keeps only the logo icon, the title and the avatar, and the clock moves into the user menu.
- **`sm`**: toolbar buttons become icons with tooltips, a long AppBar title slides (marquee), and dialogs go full screen.

## 3. Page anatomy

```
AppBar  logo · page title (marquee on phones) · clock, theme, refresh · user menu
Menu    Inicio | INVENTARIO Productos, Movimientos | CATÁLOGO Categorías, Proveedores | ADMINISTRACIÓN Usuarios
Page    PageHeader: eyebrow over an h1, optional badge, actions row
        content: a list, a column of cards, or a form card
```

- **Every page starts with `PageHeader`.** Its eyebrow is the menu section on lists and create pages ("Inventario"), the kind of record on edit pages ("Editar producto"), or the record's key on detail pages ("SKU PAP-BAG-30", a movement's date). The AppBar title is react-admin's own `<Title>`, kept as context once the heading scrolls away.
- **Lists**: `PageHeader` over a `ResponsiveSwitch`.
  - From `md`: `<List>` with a `<DataTable>`, `AppPagination` and a `ResultsToolbar` (result count on the left; filters, columns, create and export on the right).
  - Below `md`: `<InfiniteList>` with a `<SimpleList sx={listRowSx()}>`, whose rows are a `PrimaryRow` title (badge top-right) over `MetaRow` lines, and a compact `ResultsToolbar` with icon buttons and a `SortButton`.
  - Both layouts share one filter list and stay synced with the URL. The dashboard links straight to filtered lists (`productListLink`).
- **Detail pages**: `<Show actions={<Header />} component="div" emptyWhileLoading>` around a `Stack` of cards with `ribbonGutterSx`.
  - The first card carries a `Ribbon` (stock status, movement type) and a `StatBar` of the record's key numbers.
  - The next card holds the fields: a `Section` grid of `<Labeled>` fields.
  - Related records come last, in their own card, again through a `ResponsiveSwitch`.
- **Forms**: `<Create>` / `<Edit>` with `actions={<CreateHeader />}` / `actions={<EditHeader />}` and `sx={formPageSx(FORM_MAX_WIDTH)}`.
  - Inside is a `SimpleForm` with `toolbar={<FormToolbar withDelete />}`: Save on the left, a pessimistic Delete that asks first on the right.
  - Long forms split into `Section`s with a `SectionDivider` between them, laid out on MUI `Grid` (two columns from `md`, see `ProductForm`).
- **Sign-in**: a navy split screen whose logo draws itself, then wipes its pane clean. It always uses the dark theme.

## 4. Component kit

| Component | Use it for | Key props |
|---|---|---|
| `PageHeader` | Every page's heading | `eyebrow`, `title`, `badge?`, `actions?` |
| `CreateHeader` / `EditHeader` | The heading of a create or edit page, passed to `actions` | `eyebrow?` (key), `title?` (key), `actions?` |
| `ResponsiveSwitch` | One view below `md`, another above | `mobile`, `desktop` |
| `Ribbon` | A status hanging off a card's corner (card needs `ribbonCardSx`) | `color` (palette key or CSS), `size`, `variant`, `side` |
| `Section` / `SectionDivider` | A titled block of fields on a `Grid`; the gap between blocks | `title`, `hint?`, `action?` |
| `FormToolbar` | Every form's toolbar | `withDelete?` |
| `AppPagination` | Desktop list pagination (10, 25, 50, 100 rows) | react-admin `PaginationProps` |
| `SearchFilter` | A list's search box, level with labeled filters | `placeholder` (key) |
| `QuickFilter` | A chip-only filter, optionally exclusive with another | `source`, `label`, `excludes?` |
| `ConfirmButton` | An action that asks first, in a dialog | `confirmContent`, `onConfirm` |
| `ActionsMenu` | Several actions behind one button | `label`, children receive `handleClose` |
| `CopyFieldWrapper` | A labeled value with a copy button | `source`, `label?`, `field?` |
| `ExpandMore` | The chevron of an expanding card or row | `expand` |
| `ResponsiveShowTabs` / `ResponsiveTabbedFormTabs` | Tabs that scroll on phones | react-admin tab props |
| `list/OutlinedBadge` | Status and flags as outlined chips in a tone | `label`, `tone`, `dense?` |
| `list/PrimaryRow`, `list/MetaRow` | SimpleList title and detail lines (spans only) | `end?` / `icon?` |
| `list/ResultsToolbar`, `list/ListTotal` | A list's actions with its result count | `total` (smart_count key), `compact?` |
| `list/StatBar` | A strip of label-over-value numbers; wraps on phones | `items` |
| `fields/*` | Quantities with units, money, movement deltas and reasons, status badges | `source` |

Tones (`styles/list.ts`, `toneAccent`) are shared by badges: stock **out** red and **low** orange; movement **IN** green, **OUT** red, **ADJUSTMENT** blue (SPEC-002 §7). Ribbon colors use the palette keys in `constants/components.ts`.

## 5. Adding a resource

1. Types in `src/types/api.ts`, values (sort, page size, choices) in `src/constants/<resource>.ts`.
2. Labels under `resources.<resource>.fields` and copy under `app.<resource>` in `src/i18n/es.ts`, including `total` (`'1 x |||| %{smart_count} xs'`) and `search`.
3. `src/components/<resource>/List/`: `DesktopList`, `MobileList`, `DesktopActions`, `MobileActions`, the shared `<resource>Filters`, and the mobile row parts.
4. `src/components/<resource>/Form/<Resource>Form.tsx`, and `Show/` if it has a detail page.
5. Thin page shells in `src/resources/<resource>/` (`<Resource>List` is `PageHeader` plus `ResponsiveSwitch`; the others are `<Create>`, `<Edit>`, `<Show>` with their header) and an `index.ts` whose default export is the `ResourceProps`.
6. `<Resource name="…" {...resource} />` in `App.tsx`, and a `Menu.ResourceItem` in its section of `components/menu/AppMenu.tsx`.
7. Add the new screens to `tests/components/app/SpanishUi.test.tsx`.

Only columns the API can sort by may sort (`disableSort` the rest; the API answers 400 otherwise). Mutations stay pessimistic.

## 6. Copy and translation

- Spanish only (`APP_LOCALE = 'es'`), addressing the user as **tú**. Sentence case everywhere; labels name things the way the warehouse does ("Existencias", "Nivel de reposición").
- Field labels come from `resources.<resource>.fields`, so fields, inputs, filters and columns agree without a `label` prop. Everything else lives under `app.*`.
- Pass translation keys to react-admin components (they translate). Translate yourself for components that don't, such as `PageHeader`.
- Interpolate, never concatenate; counts use `smart_count` plurals.
- Buttons say what they do and keep that name through the flow: "Registrar movimiento" saves a "Movimiento de inventario registrado".
- Errors say what failed: API errors are translated in `src/i18n/apiErrors.ts`.

## 7. Motion and accessibility

- One orchestrated moment: the sign-in logo draws itself. Everything else moves only in response to the user (120–200 ms on hover, focus, open). `prefers-reduced-motion` turns the sign-in animation off.
- Keyboard: every control has a visible focus ring; the skip link leads past the menu; the user menu and dialogs trap focus as MUI does.
- Status is never color alone: badges and ribbons carry words, and deltas carry their sign.

## 8. Code conventions

```
src/
  App.tsx  Layout.tsx  theme.ts  main.tsx  config.ts
  assets/brand/   logos
  components/     the kit at the root; appBar/ menu/ login/ list/ fields/ dashboard/; one folder per resource
  constants/      fixed values (brand, components, one file per resource)
  hooks/  i18n/  providers/  styles/ (typed sx objects)  types/ (every interface)  utils/
  resources/      thin page shells, plus each resource's ResourceProps
tests/
  lib/            logic, in node (jsdom where a test needs storage)
  components/     screens and components, in jsdom, with renderWithAdmin
```

- One component per file, written as `const Name = (props: NameProps): ReactElement => …` with `export default`.
- Every variable, parameter and return type is written out, and `any` is an error. ESLint enforces both with type-checked rules.
- Props interfaces live in `types/`, `sx` objects in `styles/`, magic values in `constants/`.
- Checks: `npm run lint && npm run typecheck && npm test && npm run build`.

## 9. Where this admin differs from the reception admin

- **Sign-in** takes an email and a password (react-admin's `username` / `password`), not a pasted token. The page design is the same.
- **Lists** keep their filters in the URL: the dashboard deep-links into them. The reception admin keeps them in memory, since its filters can hold phone numbers.
- **No roles**: the user menu shows the name and email. There is no connection chip, because sign-in is always required.
- **Additions**:
  - `CreateHeader`, `EditHeader` and `FormToolbar`.
  - Links underlined on hover only.
  - `SearchFilter` translates its placeholder and is wide enough for it.
  - `StatBar` wraps on phones.
  - `listRowSx` pads the row's button instead of both the row and the button, so tinted rows fill their width.
  - The Poppins weights the theme uses (500, 700) are loaded.
- **Left out** (nothing here needs them): `AutoSaveButton`/`useAutoSave`, the in-memory store and the no-retry query client (both were for reasons specific to the reception admin), the CSP nonce cache, `ConnectionChip`.
- **PWA**: the same hand-written worker, scoped to `/` and caching only the page and Vite's hashed `/assets/`; the API is on another origin and always goes to the network.
