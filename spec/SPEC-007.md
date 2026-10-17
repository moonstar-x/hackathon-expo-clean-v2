# SPEC-007: Company branding, settings screens and menu

| | |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-10-17 |
| **Builds on** | [SPEC-002](SPEC-002.md) (API and admin UI), [SPEC-006](SPEC-006.md) (quote documents) |
| **Supersedes** | SPEC-006 §2 "Issuer data" (the bundled logo), §3.1 (the header's logo), §3.6 (the issuer's acceptance box), §4 (the signer labels; adds `brandColor`), §6 (the fix link of `ISSUER_FIELD_MISSING`), §7.1 (`templateVersion`, adds `logo` and `colors`), §8.1 and §8.2 (logo source and colors), §10.1 (menu entry), §10.5 (the settings screen) and §15 ("custom logos"). Everything else in SPEC-006 stands. |
| **Deliverables** | `api/`: a brand color setting, the company logo (storage, validation, routes), PDF and XLSX in the company's logo and color · `web/`: **Empresa** and **Plantilla** screens under Administración, the branding section with a live preview, a redesigned menu |

The keywords **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in RFC 2119.

---

## 1. Summary

The system is used by the cleaning company that issues the quotes, not by CleanCode. Until now every quote carried the bundled CleanCode logo in CleanCode indigo. The company can now upload its own logo and pick its main color, and both reach the PDF and the Excel file.

The single "Empresa y plantilla" screen becomes two screens under **Administración**: **Empresa** (who issues the quote: logo and colors, company data, legal representative) and **Plantilla** (how every quote reads: numbering, validity, paper, texts). The menu is redesigned so its groups are unmistakable and no label is cut.

## 2. Decisions

| Topic | Decision | Why |
|---|---|---|
| Screens | Two screens on the SPEC-006 singleton (`quote-document-settings` id 1): Empresa at `/company`, Plantilla at `/template`. Each sends only its own fields. `/quote-document-settings/1` redirects to `/company`. | The company's identity and the document's template change for different reasons, at different times. Sending only a page's fields keeps two open tabs from reverting each other. |
| Menu | Administración lists **Usuarios, Plantilla, Empresa**. Groups are always open; each starts with a hairline and a sentence-case name. | Requested order. Collapsible groups would hide items and need wrappers that break the menu's arrow-key navigation. |
| Logo | One logo, PNG or JPEG, uploaded by the company. Without one, the documents print the trade name as text. | The CleanCode logo must never appear on another company's quote. |
| Colors | One main color (`brandColor`). Every other document color is derived from it (§5.2). Default `#4F46E5`, CleanCode indigo, so documents keep their look until someone picks a color. | One accent keeps every combination professional; derived shades keep text readable whatever the color. |
| Color suggestions | The browser suggests up to five colors taken from the uploaded logo. | Matching the brand exactly without knowing its hex code. Nothing is sent to the API. |
| Signature block | The section is **Representante legal** (name, title). The block prints the name, the title and the company's legal name, leaving out what is empty. | The legal representative signs for the legal entity. No default title is printed (SPEC-006 §0.5: never invent business data). |

## 3. Settings

SPEC-006 §4 gains one field and two labels change:

| Field | UI label | Rules | Seed |
|---|---|---|---|
| `brandColor` | Color principal | `#RRGGBB`, any case on input, stored uppercase | `#4F46E5` |
| `signerName` | Nombre (section "Representante legal") | unchanged | |
| `signerTitle` | Cargo (section "Representante legal") | unchanged | |

An invalid color answers 422 with `errors.brandColor = "Must be a hex color like #4F46E5"`.

## 4. The company logo

### 4.1 Routes

All behind authentication; any id other than 1 → 404.

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/api/quote-document-settings/1/logo` | | 200 with the image bytes (`image/png` or `image/jpeg`), `ETag` (the SHA-256), `Cache-Control: private, no-cache`; 304 on a matching `If-None-Match`; 404 "Logo not found" when there is none |
| `PUT` | `/api/quote-document-settings/1/logo` | the raw image, `Content-Type: image/png` or `image/jpeg`, at most 1 MB | 200 `{ contentType, width, height, size, sha256, updatedBy, updatedAt }` |
| `DELETE` | `/api/quote-document-settings/1/logo` | | 204, also when there is none |

### 4.2 Validation

| Case | Answer |
|---|---|
| Any other `Content-Type` | 415 `UNSUPPORTED_MEDIA_TYPE` "Logo must be a PNG or JPEG image" |
| Over 1 MB | 413 `PAYLOAD_TOO_LARGE` |
| Bytes that are neither PNG nor JPEG, or a PNG whose image data doesn't decode | 422, `errors.logo = "Must be a PNG or JPEG image"` |
| A PNG that isn't 8-bit RGB or RGBA, or is interlaced | 422, `errors.logo = "Must be an 8-bit RGB or RGBA PNG"` |
| A JPEG with EXIF metadata, or not 3 components (grayscale, CMYK) | 422, `errors.logo = "Must be an RGB JPEG without EXIF metadata"` |
| More than 2000 px on a side | 422, `errors.logo = "Must be at most 2000 px wide and tall"` |

PNG image data is inflated at upload, with the output capped at the size the header announces, so a corrupt or oversized PNG can never reach the PDF renderer (pdfkit's PNG decoder throws outside any handler). JPEGs are embedded byte for byte by pdfkit and by Excel, so metadata and orientation are refused rather than carried to the client.

The admin never hits these rules in practice: it re-encodes every upload through a canvas before sending it (EXIF orientation applied, metadata dropped, long side at most 1200 px, then 900 or 600 until the file fits in 1 MB).

### 4.3 Storage

The image is a file on disk, not data in the database: `{FILES_PATH}/logos/{sha256}.png` (or `.jpg`), where `FILES_PATH` defaults to `./data/files`, beside the database. The database keeps only the logo's details, in a single-row table:

```sql
CREATE TABLE quote_document_logo (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  content_type TEXT    NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg')),
  width        INTEGER NOT NULL CHECK (width BETWEEN 1 AND 2000),
  height       INTEGER NOT NULL CHECK (height BETWEEN 1 AND 2000),
  size         INTEGER NOT NULL,
  sha256       TEXT    NOT NULL,
  updated_by   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);
```

- **Naming.** The file is named after its content, so a new logo never overwrites a file a request is still reading.
- **Saving.** A file is written whole (to a temporary name, then renamed) before the row points to it, and a replaced or removed logo's file is deleted after the row changes. A crash can leave at most an unused file.
- **A missing file.** A row whose file is missing counts as no logo.
- **Resetting.** `db:reset` deletes the `logos` folder with the database.

Migration `008_company_branding.sql` creates the table and adds `brand_color` to `quote_document_settings`. Back up `FILES_PATH` together with the database.

## 5. The document

### 5.1 Model

SPEC-006 §7.1 changes:

```ts
templateVersion: 2;
logo: { sha256: string; contentType: 'image/png' | 'image/jpeg'; width: number; height: number } | null;
colors: { accent: string; onAccent: string; ink: string; tint: string };   // '#RRGGBB'
```

Both are part of the hashed content (SPEC-006 §7.3): a new logo or color is a new revision, like any other settings change. The logo's bytes never enter the model or the export log; the renderers receive them beside the model, and the route checks their SHA-256 against `logo.sha256`.

**On upgrade**, every quote's content changes once (`templateVersion`, `logo`, `colors`, the acceptance box), so a quote downloaded before shows "nueva revisión" on its next download. Until a logo is uploaded, existing installs print the trade name where the CleanCode logo used to be.

### 5.2 Colors

`documentColors(brandColor)`, duplicated in the API and the admin's preview and pinned by the same test cases:

```
accent   = brandColor
onAccent = white or navy #0F172A, whichever contrasts more with accent        (WCAG contrast)
ink      = accent, mixed toward navy in steps of 10 % until it reaches 4.5:1 on white
tint     = 10 % of accent over white
```

| `brandColor` | `onAccent` | `ink` | `tint` |
|---|---|---|---|
| `#4F46E5` | `#FFFFFF` | `#4F46E5` | `#EDEDFC` |
| `#FACC15` | `#0F172A` | `#857220` | `#FFFAE8` |
| `#000000` | `#FFFFFF` | `#000000` | `#E6E6E6` |
| `#FFFFFF` | `#0F172A` | `#6F747F` | `#FFFFFF` |
| `#16A34A` | `#0F172A` | `#158744` | `#E8F6ED` |
| `#38BDF8` | `#0F172A` | `#287BA6` | `#EBF8FE` |

Where each one goes, in both files:

| Element | Color |
|---|---|
| Title "COTIZACIÓN", section headings, the trade name when there is no logo | `ink` |
| Table header rows and heading bands | `accent`, with `onAccent` text |
| Alternate rows, the totals band, the scope table's lines | `tint` |
| Body text, footer | navy `#0F172A`, unchanged |

### 5.3 Logo placement

- **PDF:** the header's left column, 156 pt wide, the image fitted into 156 × 64 pt. Without a logo, the trade name in bold 16 pt.
- **XLSX:** anchored at A1, fitted into 208 × 80 px, row 1 as tall as the image. Without a logo, the trade name in bold across A1:F1.

### 5.4 Acceptance box

SPEC-006 §3.6's issuer box becomes: with a signer name, the name, the title and the legal name, each on its own line, leaving out an empty title; without one, only the legal name.

## 6. Admin

- **Menu.** Groups, in order:
  1. Inicio, Mediciones, Cotizaciones;
  2. Inventario;
  3. Catálogo;
  4. Configuración de cotización: Parámetros, Tipos de zona, Horarios, Productos de cotización, Equivalencias de tipos;
  5. Administración: Usuarios, Plantilla, Empresa.

  Each group name sits under a hairline in sentence case, on one line. The name fades out when the sidebar collapses and the hairline stays, so the groups still read as icons and nothing moves. The sidebar is 256 px wide so every label fits whole.
- **Empresa** (`/company`): Datos de la empresa, Representante legal, then Logo y colores, last.
- **Plantilla** (`/template`): Numeración y validez, Textos.
- **Logo y colores:**
  - The stage is a live miniature of the quote's header (logo or trade name, the title, a table band and a tinted row), drawn in the colors being edited.
  - Logo buttons:
    - **Subir logo** or **Cambiar logo**, which saves on upload;
    - **Quitar logo**, which asks first.
  - **Color principal:**
    - a swatch and a hex field, which save with Guardar;
    - **Restablecer**;
    - **Colores de tu logo**, up to five suggestions.
  - A very light color warns that its band will barely show on the paper.
- **Documento** (SPEC-006 §10.4): a missing company field links to Empresa: "Falta {campo} en los datos de tu empresa."

## 7. Out of scope

- A signature image.
- A second brand color.
- Per-quote branding.
- SVG logos: the browser can rasterize them, but Excel can't embed them, and a PNG is what most companies already have.
