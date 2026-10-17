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

The one exception is the 3D view of a measurement: its walls, doors, windows, furniture and room tints match the iPhone app's SceneKit scene, not this theme, so a model looks the same on the phone and here. They live in `SCENE_COLORS` and `ROOM_TINTS` (`src/constants/measurements.ts`), with the room legend that names each tint.

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
- Numbers that change in place (the clock) and columns of numbers (table cells, the dashboard's changes) get fixed-width digits: `fontVariantNumeric: 'tabular-nums'`, or `FixedDigits` for Poppins, which has no tabular figures. A big standalone figure (a stat card's value, the stock on hand) keeps proportional figures, which read tighter at that size.
- Labels of figures and fields are 13 px, weight 500, `text.secondary`, sentence case: no uppercase micro-labels.

### Shape and depth

| Radius | Used by |
|---|---|
| 8 | Chips, menu items, list items, tooltips |
| 10 | Buttons, inputs, alerts, filter pills, icon tiles (`shape.borderRadius`) |
| 12 | Paper, menus, popovers, autocomplete lists |
| 14 | Cards |
| 16 | Dialogs |

Surfaces are flat: cards have a hairline divider border and a near-invisible shadow. The navy-tinted shadow scale is for things that float (menus, popovers, dialogs, toasts).

### Component overrides worth knowing

- **Inputs** are filled by default, with a soft fill, hairline border and a 3 px primary focus ring (red when in error).
- **DataTable** headers are frosted (blurred, semi-opaque) so sticky labels stay legible over scrolled rows. The table's scroller clips the rows to the card's rounded corners; the list card itself is not clipped, because react-admin's bulk-actions bar slides up out of it (over the results toolbar) when rows are selected.
- **Wide tables** widen the page from `md` up, and the window scrolls sideways with its scrollbar in view, rather than losing their last columns at the card's edge (`styles/layout.ts`, `RaList`). Below `md` the lists are cards and the shell keeps to the screen.
- **Filter bars** put every control on one line at `FILTER_CONTROL_HEIGHT` (50 px): the search box (magnifier first, wide enough for its placeholder), labeled selects and inputs, and yes-only filters as `ToggleFilter` pills. The "remove filter" button stays quiet until pointed at.
- **Chips** keep MUI's label color: the theme no longer forces `text.primary`, which put navy text on filled orange and green chips. Status is shown with `OutlinedBadge` anyway.
- **Switches** are compact pills in the primary color. In a form `Section`, a switch's line is as tall as an input so it sits level with the inputs beside it.
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
Menu    Inicio, Mediciones, Cotizaciones | INVENTARIO Productos, Movimientos | CATÁLOGO Categorías, Proveedores
        | CONFIGURACIÓN DE COTIZACIÓN Parámetros, Empresa y plantilla, Tipos de zona, Horarios, Productos de cotización,
        Equivalencias
        | ADMINISTRACIÓN Usuarios
Page    PageHeader: eyebrow over an h1, optional badge, actions row
        content: a list, a grid of section cards, or a form card, always the page's full width
```

- **Every page starts with `PageHeader`**, the quote screens included. Its eyebrow is the menu section on lists and create pages ("Inventario"), the kind of record on edit pages ("Editar producto"), or the record's key on detail pages ("SKU PAP-BAG-30", a movement's date). The AppBar title is react-admin's own `<Title>`, kept as context once the heading scrolls away.
- **Lists**: `PageHeader` over a `ResponsiveSwitch`.
  - From `md`: `<List>` with a `<DataTable>`, `AppPagination` and a `ResultsToolbar` (result count on the left; filters, columns, create and export on the right).
  - Below `md`: `<InfiniteList>` with a `<SimpleList sx={listRowSx()}>`, whose rows are a `PrimaryRow` title (badge top-right) over `MetaRow` lines, and a compact `ResultsToolbar` with icon buttons and a `SortButton`.
  - Both layouts share one filter list and stay synced with the URL. The dashboard links straight to filtered lists (`productListLink`).
  - Every list has an `EmptyState`: as the `<List>`/`<InfiniteList>` `empty` (`variant="page"`) it says what goes in the list (`app.empty.<resource>`) with the resource's icon and a way to add the first one; as the `<DataTable>`/`<SimpleList>` `empty` it says nothing matches the filters and offers "Borrar filtros". A list with default filters passes them as `defaultFilters` (Productos' `active: true`).
- **Dashboard**: four `StatCard`s of one shape (label and icon tile, value, hint), each a link filling its card; then "Por reponer" (products at or below their reorder line, with a small `StockMeter` and "Recibir") beside "Movimientos recientes" (type icon, product, signed change, time). Both panels show five rows of one height, so they end level; skeleton rows while loading, a compact `EmptyState` when empty.
- **Detail pages**: `<Show actions={<Header />} component="div" emptyWhileLoading>` around a `Grid` of `ShowSection` cards spanning the page (`detailPageSx`); cards side by side (`lg` 8 + 4) end level. A single view: tabs only where each tab is a tool of its own (Mediciones, Cotizaciones).
  - The record's status is a header badge, the same `OutlinedBadge` the lists use (stock status, movement type, "Inactivo").
  - The first section holds what the page is opened for, as `KeyFigures`: the product's stock on hand with its `StockMeter` against the reorder line, a movement's quantity, change and resulting stock.
  - The fields sit on a `DetailGrid` of `<Labeled>` fields; long ones take the row (`wideFieldSx`). Yes/no values read "Sí"/"No" (`YesNoField`).
  - Related records come last, in their own card, again through a `ResponsiveSwitch`; a table in a card sits inset from its sides, as it does from the title above it.
  - A detail page keeps to the screen below `md` as the lists do (`RaShow` in the theme), and a card of wide tables keeps their width out of the page at any size (`contain: inline-size`): a table wider than its card scrolls inside it. On phones a quote's tables are one card per row.
  - A note about a whole card of figures rides on it as a ribbon along its foot ("Precio mínimo: no bajar de aquí."), not as an alert between cards. Where a tab has nothing to show yet, its card says what is missing and where to set it, with a button to go there.
- **Measurement pages** (Mediciones, SPEC-004) follow the same anatomy, with these differences:
  - The list's eyebrow is "RoomScanner", where measurements come from, since Mediciones sits outside the menu sections. Its rows lead with a thumbnail of the plan (`leftIcon` on phones: `leftAvatar` crops to a circle).
  - The detail page puts the views before the fields: a Resumen section (`KeyFigures` of area, rooms, dimensions and the quote's state, the notes, the unjoined-rooms note), then a card of tabs (Plano, 3D, Medidas, Archivos), then Detalles. Seeing the space is what a measurement is opened for.
  - The list's Cotización column is the quote's state as a badge linking to it (`QuoteStatusCell`), or "Crear cotización"; neither opens the row. The page header has "Ver cotización" or "Crear cotización".
  - The plan and the model each get a framed stage with their actions above it. The plan sits on white paper in both themes, because the phone draws it for white; the thumbnails are the same paper, small.
  - `<TabbedShowLayout.Tab>` labels each child through `<Labeled>`, so each tab's content goes in `TabContent label={false}`, and `measurementTabsSx` lets it fill the tab.
- **A quote's Documento** (SPEC-006, `/quotes/:id/document`, a custom route) follows the detail-page anatomy without `<Show>`: the header's eyebrow links back to the quote, its title is the document number and revision ("Nueva revisión" as a blue badge once it changed since the last download), and its actions are the two downloads. Below, "Datos del documento" (the client and the document, in `Section`s, Save at its foot) sits beside the preview (`lg` 4 + 8), whose card holds the warnings, or what is missing with a link to fix each, before the PDF and Excel tabs; the download history closes the page. The list's Documento column and the quote header open it (`DocumentButton`).
- **Forms**: `<Create>` / `<Edit>` with `actions={<CreateHeader />}` / `actions={<EditHeader />}` and `sx={formPageSx}`: the card spans the page, and on desktop the toolbar stays at the bottom of the screen while a long form scrolls.
  - Inside is a `SimpleForm` with `toolbar={<FormToolbar withDelete />}`: Save on the left, a pessimistic Delete that asks first on the right. When saving needs a word, it goes beside Save as the toolbar's `note`, once (the quoting parameters and catalogs: existing quotes don't change until recalculated).
  - Fields go in titled `Section`s (with a one-line `hint`) and a `SectionDivider` between them, each field a `<Grid size={{ xs: 12, md: … }}>` cell sized by what it holds (codes and numbers 4, names 6 to 8, long text 12) with its input `fullWidth`. The section's grid drops the inputs' own margins so a row lines up.
  - A name beside a long note goes in `FieldsBesideNote`: the short inputs stacked in the left half, the note in the right one as tall as they are (Proveedor, Categoría, Medición), so the name is never cut short above a full-width note.
  - A form may show what it will do beside the inputs: the movement form previews the product's stock now and after the movement.
  - `TabbedForm` (with `ResponsiveTabbedFormTabs`) only when one page is too long: the 44 quoting parameters (one tab per group, tabs not in the URL) and the quote editor (case data, zones). A parameters tab that mixes topics has titled sections (`PARAMETER_TABS`); a tab about one topic has one untitled `Section` whose hint introduces it. Units sit inside the inputs as adornments, and the helper line is only the value's source.
- **Sign-in**: a navy split screen whose logo draws itself, then wipes its pane clean. It always uses the dark theme.

## 4. Component kit

| Component | Use it for | Key props |
|---|---|---|
| `PageHeader` | Every page's heading | `eyebrow`, `title`, `badge?`, `actions?` |
| `CreateHeader` / `EditHeader` | The heading of a create or edit page, passed to `actions` | `eyebrow?` (key), `title?` (key), `actions?` |
| `ResponsiveSwitch` | One view below `md`, another above | `mobile`, `desktop` |
| `Section` / `SectionDivider` | A titled block of form fields on an aligned `Grid`; the gap between blocks | `title?`, `hint?`, `action?` |
| `FieldsBesideNote` | Inside a `Section`: short inputs on the left, a long note on the right as tall as they are | `fields`, `note` |
| `ShowSection` / `DetailGrid` | A titled card of a detail page; its `<Labeled>` fields on an auto-fill grid | `title`, `action?` / children |
| `KeyFigures` | A record's key numbers, label over value, as many to a row as fit | `items` (`label`, `value`, `hint?`), `size?` |
| `StockMeter` | Stock against the reorder line, coloured by status; `role="meter"` | `quantity`, `reorderLevel`, `unit`, `size?` |
| `FormToolbar` | Every form's toolbar | `withDelete?`, `note?` |
| `AppPagination` | Desktop list pagination (10, 25, 50, 100 rows) | react-admin `PaginationProps` |
| `SearchFilter` | Every list's search box: magnifier first, level with labeled filters | `placeholder` (key, saying what it matches) |
| `ToggleFilter` | A yes-only filter as a pill as tall as the inputs (with `trueOrRemove`) | `BooleanInput` props |
| `QuickFilter` | A chip-only filter, optionally exclusive with another | `source`, `label`, `excludes?` |
| `ConfirmButton` | An action that asks first, in a dialog | `confirmContent`, `onConfirm` |
| `ActionsMenu` | Several actions behind one button | `label`, children receive `handleClose` |
| `CopyFieldWrapper` | A labeled value with a copy button | `source`, `label?`, `field?` |
| `ExpandMore` | The chevron of an expanding card or row | `expand` |
| `ResponsiveShowTabs` / `ResponsiveTabbedFormTabs` | Tabs that scroll on phones | react-admin tab props |
| `list/OutlinedBadge` | The only badge: every status and flag, outlined in a tone | `label`, `tone`, `dense?`, `icon?` |
| `list/EmptyState` | Every list's empty state, and the no-results one | `variant?`, `resource?`, `action?`, `steps?`, `defaultFilters?` |
| `list/PrimaryRow`, `list/MetaRow` | SimpleList title and detail lines (spans only) | `end?` / `icon?` |
| `list/ResultsToolbar`, `list/ListTotal` | A list's actions with its result count | `total` (smart_count key), `compact?` |
| `fields/*` | Quantities with units, money, movement deltas and reasons, status badges, floor areas | `source` |

Tones (`styles/list.ts`, `toneAccent`) are shared by badges: stock **out** red and **low** orange; movement **IN** green, **OUT** red, **ADJUSTMENT** blue (SPEC-002 §7); quote states by `QUOTE_STATE_TONE` (needs review orange, healthy green, loss red…). Every tone reads at least 4.5:1 on the paper in both themes (`tests/lib/tones.test.ts`): light-mode orange is `orange[800]` darkened 25%. Meters and icon tiles use the palette keys in `STOCK_STATUS_COLOR` and `MOVEMENT_TYPE_COLOR`.

## 5. Adding a resource

1. Types in `src/types/api.ts`, values (sort, page size, choices) in `src/constants/<resource>.ts`.
2. Labels under `resources.<resource>.fields` and copy under `app.<resource>` in `src/i18n/es.ts`, including `total` (`'1 x |||| %{smart_count} xs'`) and `search`, and the empty list's copy under `app.empty.<resource>` (`title`, `body`, optional `action`).
3. `src/components/<resource>/List/`: `DesktopList`, `MobileList`, `DesktopActions`, `MobileActions`, the shared `<resource>Filters`, and the mobile row parts.
4. `src/components/<resource>/Form/<Resource>Form.tsx`, and `Show/` if it has a detail page.
5. Thin page shells in `src/resources/<resource>/` (`<Resource>List` is `PageHeader` plus `ResponsiveSwitch`; the others are `<Create>`, `<Edit>`, `<Show>` with their header) and an `index.ts` whose default export is the `ResourceProps`.
6. `<Resource name="…" {...resource} />` in `App.tsx`, with its own `icon` (the menu and the empty state show it), and a `Menu.ResourceItem` in its section of `components/menu/AppMenu.tsx`.
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
- The 3D view moves only under the user's hand, and draws only while something changes. Its camera eases to a stop (damping), which `prefers-reduced-motion` turns off. The furniture toggle and the theme change the scene in place, so the camera stays where it was put.
- Keyboard: every control has a visible focus ring; the skip link leads past the menu; the user menu and dialogs trap focus as MUI does.
- Status is never color alone: badges carry words, meters carry their numbers beside them, movement icons have a label, and deltas carry their sign.

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
  fixtures/       the geometry contract fixture shared with the API and the app (SPEC-004 §7)
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
  - `listRowSx` pads the row's button instead of both the row and the button, so tinted rows fill their width.
  - The Poppins weights the theme uses (500, 700) are loaded.
- **Left out** (nothing here needs them): `AutoSaveButton`/`useAutoSave`, the in-memory store and the no-retry query client (both were for reasons specific to the reception admin), the CSP nonce cache, `ConnectionChip`.
- **PWA**: the same hand-written worker, scoped to `/` and caching only the page and Vite's hashed `/assets/`; the API is on another origin and always goes to the network.
