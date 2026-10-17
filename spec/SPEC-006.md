# SPEC-006: Quote documents (PDF and XLSX), with preview and download

| | |
|---|---|
| **Status** | Draft, ready for implementation |
| **Date** | 2026-10-16 |
| **Builds on** | [SPEC-002](SPEC-002.md) (API and admin UI), [SPEC-003](SPEC-003.md) (user accounts), [SPEC-005](SPEC-005.md) (quote engine) |
| **Supersedes** | Nothing. SPEC-005 §15 listed "Exporting a quote to PDF or XLSX" as future work; this spec delivers it. SPEC-005's `PUT /api/quotes/:id` is unchanged: the document data has its own route (§9.2), so editing it never triggers a recalculation. |
| **Deliverables** | `api/`: issuer and template settings, per-quote client and document data, a document builder, a PDF renderer, an XLSX renderer, an export log, `/api/quotes/:id/document*` · `web/`: the **Documento** page (PDF and Excel preview, download, document data form), the **Empresa y plantilla** settings screen |
| **Superseded in part by** | [SPEC-007](SPEC-007.md): the company's own logo and color replace the bundled CleanCode logo and indigo (§2, §3.1, §7.1, §8), the issuer's acceptance box (§3.6), the signer labels (§4), and the settings screen and its menu entry (§6, §10.1, §10.5) · [SPEC-008](SPEC-008.md): the company's electronic signature (§15) |

The keywords **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in RFC 2119.

---

## 0. Instructions for the implementing agent

1. The code lives in `api/` and `web/`. The mobile app is untouched. The two parts stay independent (SPEC-002 §8): the contracts that cross the boundary (the document JSON, the XLSX number formats) are duplicated on purpose and pinned by tests.
2. Priorities work as before: **[P0]** required, **[P1]** expected (list anything you skip), **[P2]** optional. A requirement without a tag is [P0]. Record deviations in the "Notes" section of `api/README.md` or `web/README.md`.
3. All text in the documents and the UI is Spanish. API enums and codes are English; the API's document model already carries the Spanish text it prints (§7), and the web translates only codes it shows outside the document (blockers, errors).
4. **The document is a pure rendering of one fully resolved model.** `buildQuoteDocument` (§7) computes, looks up, rounds and words every value. The PDF renderer, the XLSX renderer and the web previews only lay it out. No renderer computes a total, picks a default, reads the clock or translates a code.
5. **Never invent business data** (SPEC-005 §0.5). Legal name, tax ID, payment terms and the client's identity come only from people. Until they exist, the document can't be generated and the UI says exactly what is missing (§6). The document never shows an empty field, a placeholder or "—": an optional value that is empty is left out of the layout, together with its label.
6. **Internal figures never reach the client** (§3.2). This is tested on the rendered files, not only on the model.
7. Follow the order in §13, and check §14 before you call the work done.

---

## 1. Summary

A quote that SPEC-005 computed and marked **Simulación** can now be turned into a B2B commercial quotation (*cotización* / *propuesta económica*) addressed to a client company, in two formats:

- **PDF**, to send and print.
- **XLSX**, for clients whose purchasing departments load quotes into spreadsheets.

Both formats come from the same document model and show the same values. In the admin, a new **Documento** page per quote shows a live preview of each format, lets the user fill in the client and document data, and downloads exactly the file that was previewed.

```
 Admin UI (Documento page)                     API                                         SQLite
 ─────────────────────────                     ───                                         ──────
 GET  /quotes/:id/document ──────────────────► readiness (§6) + buildQuoteDocument (§7) ◄── quotes (result_json, snapshot_json),
      ◄── { ready, blockers, document, contentHash, revision }                               quote_documents, quote_document_settings,
 GET  /quotes/:id/document/pdf  ─────────────► renderPdf(document)                           quote_document_exports
 GET  /quotes/:id/document/xlsx ─────────────► renderXlsx(document)
      ◄── bytes + X-Document-Hash
 preview: PDF in an <iframe>, XLSX parsed in the browser and drawn as a grid
 [Descargar] → POST /quotes/:id/document/exports { format, contentHash } ─► log row, revision
             → save the previewed bytes
```

### 1.1 Terminology

| Spanish (UI and document) | Spec / code |
|---|---|
| Cotización (the document sent to the client) | quote document, `QuoteDocument` |
| Emisor / Empresa | issuer, `quote_document_settings` |
| Cliente | client, columns of `quote_documents` |
| N.º de cotización | `number` |
| Revisión | `revision` |
| Fecha de emisión / Válida hasta | `issueDate` / `validUntil` |
| Ítems | `lines` |
| Alcance del servicio | `scope` |
| Condiciones comerciales | `conditions` |
| Aceptación | `acceptance` |

---

## 2. Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Where files are generated | On the API, from the stored quote. The web never builds a file. | One implementation of the template, and the file a client receives doesn't depend on the browser that made it. |
| One model, two renderers | `buildQuoteDocument()` returns a `QuoteDocument` holding every printed value already resolved: Spanish labels, rounded money, dates, words. `renderPdf` and `renderXlsx` take only that. | The PDF and the XLSX can't disagree, and "all values defined in the preview" is a property of the model, testable without a renderer. |
| What can be exported | Only a quote whose status is **Simulación**, whose calculation is done and current, and whose issuer and client data are complete (§6). | A Revisar quote has preliminary figures and missing inputs. A B2B document must not carry either. |
| Preview equals download | The web downloads the **same bytes** it previewed. Before saving, it registers the export with the preview's `contentHash`. If the quote changed since the preview, the API answers 409 and the web refreshes the preview instead of saving. | The user signs off on what they see. Nothing changes between the preview and the file. |
| Money in the document | Rounded to cents once, in the model. Line amounts are allocated with the largest-remainder method so they add up exactly to the subtotal (§3.4). VAT is computed in integer cents. | A printed quote whose lines don't add up to its subtotal is a defect a purchasing department will catch. |
| Lines | One line per zone by default (`perZone`). [P1] One global line (`single`). Each line is a monthly service: quantity 1, unit "Mes". | Cleaning services are sold per month. Quoting by m² with a rounded unit price would break `quantity × unit price = amount`. |
| Line amounts with a manual price | The offered price is distributed over the zones in proportion to each zone's `totalCost`. Without a manual price this equals each zone's `targetPrice`. | It's the only allocation that agrees with the engine in both cases (Σ zone `totalCost` = `costs.totalCost`, SPEC-005 §12.1). |
| XLSX contents | Literal values only, no formulas. Numbers are numbers with a number format, dates are dates. | Every viewer (Excel, Numbers, LibreOffice, Quick Look, mail previews, our own preview) shows the same values, and nothing is recomputed with a different rounding. |
| XLSX preview | The browser parses the downloaded workbook (lazy-loaded `exceljs`) and draws the sheet as an HTML grid. | It previews the real file, not a second rendering of the model. |
| PDF preview | The PDF blob in an `<iframe>`. Where the browser has no PDF viewer (`navigator.pdfViewerEnabled === false`), a message and the download button. [P2] `pdfjs-dist` canvas rendering. | Every desktop browser the admin targets has a PDF viewer. |
| Numbering | `{prefix}-{quote id, 5 digits}`, such as `COT-00007`. It's frozen at the first export, so changing the prefix later doesn't renumber documents already sent. | Quote ids are already unique and sequential. |
| Revisions | Every export is logged with the hash of the model. The revision shown is the latest export's revision when the content is unchanged, or the next one when it changed. | A client who receives a corrected quote sees "Rev. 2". The log is the audit trail of what was sent. |
| Issuer data | A singleton settings row, edited by any user (SPEC-003 has no roles). Logo: the bundled CleanCode logo. | One company issues every quote. Custom logos are future work. |
| Issue date | Stored per quote. When empty, it's the date of the last calculation, in `QUOTE_DOCUMENT_TIMEZONE`. Never "today". | The same quote produces the same document tomorrow. |
| Fonts | PDF: Poppins (brand font, SIL OFL), embedded. XLSX: Arial. | The PDF must look like the brand everywhere. A spreadsheet can't embed fonts, and Arial exists (or has a metric clone) on every platform. |

---

## 3. The document template

### 3.1 Sections, in order

The structure is the usual B2B quotation: who issues it, to whom, what is quoted and for how much, the scope behind the price, the commercial conditions, and a place to accept it.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [logo CleanCode]                                            COTIZACIÓN           │
│ Razón social del emisor                                     N.º COT-00007 · Rev. 2│
│ RUC 0999999999001                                           Emisión: 16/10/2026  │
│ Dirección · Ciudad                                          Válida hasta: 15/11/2026│
│ Teléfono · correo · sitio web                                                    │
├──────────────────────────────────────┬───────────────────────────────────────────┤
│ CLIENTE                              │ SERVICIO                                  │
│ Razón social del cliente             │ Instalación: Clínica de prueba            │
│ RUC / identificación                 │ Tipo: Hospital privado                    │
│ Atención: Nombre, cargo              │ Ciudad: Guayaquil                         │
│ correo · teléfono                    │ Superficie total: 248,00 m² en 4 zonas    │
│ Dirección                            │ Visita técnica: 16/10/2026                │
├──────────────────────────────────────┴───────────────────────────────────────────┤
│ Texto de presentación                                                            │
├────┬──────────────────────────────────────────────┬──────┬──────┬────────┬───────┤
│ #  │ Descripción                                  │ Cant.│Unidad│P. unit.│ Total │
│ 1  │ Limpieza y desinfección: Quirófano 1         │ 1    │ Mes  │7.857,63│7.857,63│
│    │ Quirófano · Riesgo crítico · 36,00 m² · 24/7 · 30 días/mes                   │
│ …  │                                              │      │      │        │       │
├────┴──────────────────────────────────────────────┴──────┴──────┴────────┴───────┤
│                                                         Subtotal       9.907,39 │
│                                                         IVA 15 %       1.486,11 │
│                                                         TOTAL MENSUAL 11.393,50 │
│ Son: once mil trescientos noventa y tres con 50/100 dólares               [P1]  │
│ Valor del contrato por 12 meses (sin IVA): 118.888,68                     [P1]  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ALCANCE DEL SERVICIO                                                             │
│ Zona │ Tipo │ Riesgo │ m² │ Horario │ Días/mes │ Frecuencia │ Limpiezas terminales/mes │
│ Productos: Detergente neutro (10 ml por litro de agua), …                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ CONDICIONES COMERCIALES                                                          │
│ Validez · Forma de pago · Moneda e impuestos · Duración [P1] · Términos          │
│ OBSERVACIONES (only when present)                                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ACEPTACIÓN                                                                       │
│ ______________________                 ______________________                    │
│ Nombre del firmante                    Aceptado por: Razón social del cliente    │
│ Cargo · Nombre comercial               Nombre, firma y fecha                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ CleanCode · COT-00007 Rev. 2                                       Página 1 de 2 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 What the client sees, and what it never sees

The document is built from an **allow-list**. Only the values below reach it:

| Source | Fields that reach the document |
|---|---|
| Issuer settings (§4) | trade name, legal name, tax ID, address, city, phone, email, website, signer name and title, intro text, terms text, payment terms, validity, paper size |
| Document data (§5) | client fields, issue date, validity, payment terms, client notes, line mode, contract months |
| Quote (SPEC-005 §4) | `id` (for the number), `name` (site), `installationType`, `city`, `visitDate` |
| `result` | `pricing.offeredPrice`; per zone `totalCost` (only as an allocation weight, never printed); `technicalOffer` rows (zone and type names, risk, schedule, frequency, terminals, products and doses); `totals.floorArea` |
| Zones | `name`, `floorArea`, `daysPerMonth` |
| `snapshot.parameters` | `vatRate` |

Everything else **MUST NOT** appear in either file, in any sheet, cell, comment, hidden row, defined name or document property. In particular: costs of any kind, margins, profit, target, minimum and break-even prices, negotiation room, the flat-rate comparison, the external reference price, the purchase plan, stock, waste, staffing figures, causes and warnings, the internal `notes` of the quote, settings and the snapshot, and the email of the user who created the quote. A test checks this on the rendered files (§12.1).

### 3.3 Header, parties and service

- **Title:** "COTIZACIÓN".
- **Number:** "N.º {number}". With a revision above 1: "N.º {number} · Rev. {revision}".
- **Dates:** "Fecha de emisión: {issueDate}" and "Válida hasta: {validUntil}", formatted `dd/mm/aaaa`. `validUntil = issueDate + validityDays` calendar days.
- **Issuer block:** legal name; "RUC {taxId}"; address, followed by ", {city}" when the city is set; one line with phone, email and website, joined with " · ", leaving out the empty ones.
- **Client block** ("CLIENTE"): legal name; "RUC / identificación: {clientTaxId}"; "Atención: {contactName}", followed by ", {contactTitle}" when set; email and phone joined with " · "; address.
- **Service block** ("SERVICIO"): "Instalación: {quote.name}"; "Tipo: {installation type label}" (Hospital privado, Hospital público, Oficina, Centro comercial, Otro); "Ciudad: {quote.city}"; "Superficie total: {Σ floor area} m² en {n} zona(s)"; "Visita técnica: {visitDate}".
- Every line whose value is empty is left out. The blocks never print a label without a value.

### 3.4 Lines, totals and rounding

Let `C(x)` be `x` in integer cents: `roundHalfUp(x × 100)`, using `round` from `src/lib/numbers.ts`.

**Weights.** For `perZone`, one weight per zone in position order: the zone's `result.zones[i].totalCost`. (A quote in Simulación has every zone active, SPEC-005 §5.3–5.4.) If every weight is 0, all weights are 1.

**Allocation** (largest remainder), for a total `T = C(pricing.offeredPrice)` and weights `w`:

1. `raw_i = T × w_i / Σw`, `cents_i = floor(raw_i)`.
2. Give one more cent to the `T − Σ cents_i` lines with the largest `raw_i − cents_i`, ties broken by the lower position.
3. `amount_i = cents_i / 100`. Then `Σ amount_i` is exactly `T / 100`.

**Lines:**

| Mode | Line(s) | `description` | `detail` |
|---|---|---|---|
| `perZone` | one per zone, in position order | "Limpieza y desinfección: {zone name}" | "{zone type} · Riesgo {crítico \| semicrítico \| no crítico} · {floor area} m² · {schedule} · {days} días/mes" |
| `single` [P1] | one | "Servicio de limpieza y desinfección: {quote name}" | "{n} zona(s) · {Σ floor area} m² · Según el alcance del servicio" |

Every line has `quantity: 1`, `unit: "Mes"`, and `unitPrice = amount`.

**Totals:**

- `subtotal = T / 100`.
- `vatRate = snapshot.parameters.vatRate`. VAT is computed in integers, because the float product isn't safe: `9907.39 × 0.15` is `1486.1084999999998` in JavaScript, which would round to 1486.10. With `rateMicros = round(vatRate × 1e6)` (rates have at most 6 decimals, SPEC-005 §3.1): `vatCents = floor((T × rateMicros + 500000) / 1e6)`. All the operands are integers below 2^53.
- `vat = vatCents / 100`, `total = (T + vatCents) / 100`.
- The VAT label is "IVA {rate} %", with the rate formatted with up to 2 decimals (`IVA 15 %`, `IVA 12,5 %`).
- The total's label is "TOTAL MENSUAL".
- **[P1] Amount in words:** "Son: {total in Spanish words} con {cents}/100 dólares", lowercase, such as "Son: once mil trescientos noventa y tres con 50/100 dólares". Write a small `numberToSpanishWords` for integers from 0 to 999 999 999 (with "un millón", "veintiún", "cien" and "ciento" right), and test its edge cases.
- **[P1] Contract value:** when `contractMonths` is set, "Valor del contrato por {n} meses (sin IVA): {subtotal × n}", computed in cents.

The document's figures can differ from the engine's unrounded `totalWithVat` by at most one cent. The document is authoritative for what's printed. The admin's Resumen tab keeps showing the engine's figures.

### 3.5 Scope ("ALCANCE DEL SERVICIO")

- A table with one row per `result.technicalOffer` row: Zona, Tipo de zona, Riesgo, Superficie (m²), Horario, Días por mes, Frecuencia ("Cada {N} h · {O} por día", SPEC-005 §5.9), Limpiezas terminales por mes (the terminals per month, with up to 2 decimals).
- Below it, "Productos: " and the distinct products of every zone (cleaning, daily disinfectant, terminal disinfectant), sorted by name and joined with ", ", each as "{name} ({dose} {ml|g} por litro de agua)". Doses have no decimals when they're integers, and up to 2 otherwise.
- No prices, quantities, costs or staffing appear in the scope.

### 3.6 Conditions, notes and acceptance

**"CONDICIONES COMERCIALES"**, a list of label and text, in this order:

| Label | Text | When |
|---|---|---|
| Validez de la oferta | "{validityDays} días, hasta el {validUntil}." | always |
| Forma de pago | the payment terms (§5, or §4 when the quote has none) | always (it's required, §6) |
| Moneda e impuestos | "Valores en dólares de los Estados Unidos de América (USD). Los precios unitarios y el subtotal no incluyen IVA." | always |
| Duración del contrato [P1] | "{n} meses." | when `contractMonths` is set |
| Términos generales | the issuer's `termsText`, one paragraph per line | when set |

**"OBSERVACIONES"**: the quote's `clientNotes`, when present.

**"ACEPTACIÓN"**: two signature boxes. Left: the issuer, with the signer name, then the signer title and the trade name joined with " · " (leaving out what's empty; when there's no signer, only the trade name). Right: "Aceptado por: {client legal name}" and "Nombre, firma y fecha".

### 3.7 Formatting rules

| Value | Format (both files and the preview) |
|---|---|
| Money | `es` locale, 2 decimals, thousands separator, no currency symbol in table cells. The column headers and the totals say "(USD)". |
| Area | 2 decimals, "m²" |
| Days, counts | integers |
| Dates | `dd/mm/aaaa` |
| Percent (VAT label only) | up to 2 decimals |

The model carries money and areas as numbers, and their formatted text alongside (§7), so the PDF and the preview print the same string, and the XLSX gets a number with a matching format.

---

## 4. Issuer and template settings

`GET /api/quote-document-settings/1` and `PUT /api/quote-document-settings/1` (merge semantics). Any other id → 404. No list, create or delete. Changing them **doesn't** bump the SPEC-005 settings revision and doesn't affect any calculation; it changes the content (and therefore the revision, §7.3) of documents generated afterwards.

| Field | UI label | Rules | Seed | Required to export |
|---|---|---|---|---|
| `tradeName` | Nombre comercial | 1–100 | `CleanCode` | yes |
| `legalName` | Razón social | ≤ 150 | `null` | yes |
| `taxId` | RUC | `null` or exactly 13 digits | `null` | yes |
| `address` | Dirección | ≤ 200 | `null` | yes |
| `city` | Ciudad | ≤ 100 | `null` | |
| `phone` | Teléfono | ≤ 30, `^[0-9+() -]+$` | `null` | |
| `email` | Correo | a valid email, ≤ 254 | `null` | yes |
| `website` | Sitio web | `null` or an `http(s)` URL, ≤ 200 | `null` | |
| `signerName` | Nombre de quien firma | ≤ 100 | `null` | |
| `signerTitle` | Cargo de quien firma | ≤ 100 | `null` | |
| `numberPrefix` | Prefijo de numeración | `^[A-Z0-9]{1,10}$` | `COT` | |
| `validityDays` | Validez de la oferta (días) | integer 1–365 | `30` | |
| `paymentTerms` | Forma de pago predeterminada | ≤ 500 | `null` | yes, unless the quote has its own |
| `introText` | Texto de presentación | ≤ 1000 | see below | |
| `termsText` | Términos generales | ≤ 4000 | see below | |
| `paperSize` | Tamaño de papel (PDF) | `A4` or `LETTER` | `A4` | |

The response also carries the read-only `updatedBy` and `updatedAt`. Empty strings are stored as `null` (SPEC-002 convention).

Seeded texts. Both are statements the system can stand behind (they describe what the cost model includes); the admin edits them freely:

- `introText`: "De nuestra consideración: ponemos a su disposición nuestra propuesta económica para el servicio de limpieza y desinfección de sus instalaciones, de acuerdo con el alcance que se detalla a continuación."
- `termsText`: "El valor mensual corresponde a la superficie, las frecuencias y los horarios descritos en el alcance del servicio. Cualquier cambio en el alcance requiere una nueva cotización.\nEl valor incluye mano de obra, supervisión, productos químicos, equipos de protección personal, utensilios, equipos, transporte y seguros."

Payment terms, legal name, tax ID and address are **not** seeded: they are company decisions and company facts (§0.5).

---

## 5. Client and document data per quote

Stored in `quote_documents`, one row per quote, created on the first `PUT` (§9.2). A quote without a row reads as all `null` with `lineMode: 'perZone'`.

| Field | UI label | Rules | Required to export |
|---|---|---|---|
| `clientLegalName` | Razón social del cliente | ≤ 150 | yes |
| `clientTaxId` | RUC / identificación | ≤ 20, `^[A-Za-z0-9-]+$` (it may be foreign) | |
| `clientContactName` | Persona de contacto | ≤ 100 | yes |
| `clientContactTitle` | Cargo | ≤ 100 | |
| `clientEmail` | Correo | valid email | |
| `clientPhone` | Teléfono | as the issuer's | |
| `clientAddress` | Dirección | ≤ 200 | |
| `issueDate` | Fecha de emisión | `YYYY-MM-DD` or `null` = the date of `calculatedAt` in `QUOTE_DOCUMENT_TIMEZONE` | |
| `validityDays` | Validez (días) | `null` = the issuer's, or integer 1–365 | |
| `paymentTerms` | Forma de pago | `null` = the issuer's, or ≤ 500 | |
| `clientNotes` | Observaciones para el cliente | ≤ 2000 | |
| `lineMode` | Presentación de ítems | `perZone` (Un ítem por zona), `single` (Un solo ítem) [P1] | |
| `contractMonths` [P1] | Duración del contrato (meses) | `null` or integer 1–60 | |
| `number` | N.º de cotización | read-only; `null` until the first export (§7.3) | |

These are **not engine inputs**: saving them never enqueues a quote job, never changes `input_revision`, and never marks the quote as stale or not current.

---

## 6. Readiness

`buildQuoteDocument` runs only when every condition below holds. Otherwise `GET /api/quotes/:id/document` returns `ready: false` and the list of blockers, and the file routes answer 409 `DOCUMENT_NOT_READY`.

| Condition | Blocker code | Spanish message (web, `src/i18n/quoteDocuments.ts`) | Fix link |
|---|---|---|---|
| `calculation.state` is `done` | `QUOTE_NOT_CALCULATED` | La cotización aún se está calculando o su cálculo falló. | Show |
| `calculation.isCurrent` | `QUOTE_NOT_CURRENT` | Hay cambios que todavía no se calcularon. | Show |
| `status` is `simulation` | `QUOTE_NEEDS_REVIEW` | La cotización está en Revisar: resuelve sus causas y confirma los supuestos. | Show |
| `pricing.offeredPrice > 0` | `PRICE_ZERO` | El precio ofertado es cero. | Edit |
| each issuer field marked required in §4 is set | `ISSUER_FIELD_MISSING` with `params.field` | Falta {campo} en los datos de la empresa. | Empresa y plantilla |
| a payment term exists (§5, else §4) | `PAYMENT_TERMS_MISSING` | Falta la forma de pago. | the form, or Empresa y plantilla |
| `clientLegalName` and `clientContactName` are set | `CLIENT_FIELD_MISSING` with `params.field` | Falta {campo} del cliente. | the form |

All failing conditions are listed, not only the first. `{campo}` is the field's UI label.

Non-blocking **warnings**, shown on the Documento page (never in the document):

| Code | When | Message |
|---|---|---|
| `PARAMETERS_CHANGED` | `calculation.isStale` | Los parámetros cambiaron después de este cálculo. Recalcula antes de enviar si quieres usar los valores actuales. |
| `MARGIN_BELOW_MINIMUM` | `pricing.marginStatus` is `loss` or `belowMinimum` | El precio ofertado deja el margen bajo el mínimo. |
| `FLOOR_AREA_APPROXIMATE` | any zone has `isFloorApproximate` | Hay superficies aproximadas en esta cotización. |

[P1] With `MARGIN_BELOW_MINIMUM`, the download buttons ask for confirmation first ("El margen está bajo el mínimo. ¿Descargar de todos modos?").

---

## 7. The document model

`api/src/modules/quoteDocuments/` holds `builder.ts`, `pdf.ts`, `xlsx.ts`, `words.ts`, `repository.ts`, `router.ts` and `types.ts`.

### 7.1 `buildQuoteDocument`

```ts
buildQuoteDocument(input: {
  quote: QuoteRecord;               // SPEC-005 §8.2 record, with zones, result and snapshot
  data: QuoteDocumentData;          // §5
  settings: QuoteDocumentSettings;  // §4
  revision: number;                 // §7.3
  number: string;                   // §7.3
  timezone: string;                 // QUOTE_DOCUMENT_TIMEZONE
}): QuoteDocument
```

A pure function: no database, no clock, no I/O. It assumes readiness (§6) and throws if it's called without it.

```ts
interface Money { value: number; text: string }            // value in USD with ≤ 2 decimals; text "9.907,39"
interface Area  { value: number; text: string }            // text "248,00"

interface QuoteDocument {
  templateVersion: 1;
  number: string;                                          // "COT-00007"
  revision: number;                                        // ≥ 1
  title: string;                                           // "COTIZACIÓN"
  numberText: string;                                      // "N.º COT-00007 · Rev. 2"
  issueDate: string; issueDateText: string;                // "2026-10-16", "16/10/2026"
  validUntil: string; validUntilText: string;
  validityDays: number;
  paperSize: 'A4' | 'LETTER';
  issuer: { tradeName: string; lines: string[] };          // §3.3, already joined, empty lines removed
  client: { legalName: string; lines: string[] };
  service: { lines: string[]; totalFloorArea: Area; zoneCount: number };
  introText: string | null;
  lines: { position: number; description: string; detail: string; quantity: 1; unit: 'Mes';
           unitPrice: Money; amount: Money }[];
  subtotal: Money; vatLabel: string; vatRate: number; vat: Money; total: Money; totalLabel: string;
  amountInWords: string | null;                            // [P1]
  contract: { months: number; label: string; subtotal: Money } | null;   // [P1]
  scope: { columns: string[]; rows: { zone: string; zoneType: string; risk: string; floorArea: Area;
           schedule: string; daysPerMonth: number; frequency: string; terminalsPerMonth: string }[];
           productsText: string };
  conditions: { label: string; text: string[] }[];         // §3.6, text split in paragraphs
  clientNotes: string[] | null;
  acceptance: { issuer: string[]; client: string[] };
  footer: string;                                          // "CleanCode · COT-00007 Rev. 2"
  fileBaseName: string;                                    // §7.4
}
```

Everything a renderer prints is a field of this model. Renderers only add fixed headings ("CLIENTE", "SERVICIO", the table headers, "Página {n} de {m}"), which live in one `labels.ts` shared by both renderers.

### 7.2 Content hash

`contentHash = sha256(canonicalJson(document without revision, numberText, footer, fileBaseName))`, the four fields that depend on the revision, in lowercase hex. `canonicalJson` sorts object keys and has no whitespace. `templateVersion` is inside the hash, so changing the template (and bumping it) produces a new revision of every document.

### 7.3 Number and revision

- `number`: `quote_documents.number` when it's set. Otherwise `{settings.numberPrefix}-{quote.id padded to 5 digits}` (6 or more digits for ids from 100 000 on).
- `revision`: let `last` be the newest row of `quote_document_exports` for the quote. With no exports, 1. When `last.content_hash` equals the current hash, `last.revision`. Otherwise `last.revision + 1`.
- `POST …/exports` (§9.4), in one transaction: recompute the document and its hash; if the hash differs from the request's → 409 `DOCUMENT_CHANGED`; set `quote_documents.number` when it's null (creating the row if needed); insert the export row with the revision computed above. Exporting the same content in the other format reuses the revision.

### 7.4 File names

`fileBaseName = "Cotizacion-{number}-{slug(quote.name)}"`, plus `-Rev{n}` when the revision is above 1. `slug` keeps letters and digits (Unicode), turns spaces into `-`, removes everything else, and cuts at 60 characters, like the measurement file names (SPEC-004). The API sends `Content-Disposition` with an ASCII fallback (accents removed) and the UTF-8 `filename*` form. Extensions: `.pdf`, `.xlsx`.

---

## 8. Renderers

### 8.1 PDF (`pdf.ts`)

- Library: `pdfmake` (server-side `PdfPrinter`), which gives tables that break across pages with repeated headers, plus headers and footers with page numbers. Using `pdfkit` directly is acceptable if the same layout is reached; note it in the README.
- Fonts: Poppins Regular (400) and SemiBold (600), TTF, committed in `api/assets/fonts/` with `OFL.txt`. Amounts are right-aligned (Poppins has no tabular figures; see `web/src/constants/brand.ts`).
- Logo: `api/assets/brand/logo-horizontal.svg`, a copy of the web's file, drawn as SVG, 55 mm wide, with the clear space of `web/design.md` §1. It's never recolored, stretched or rotated.
- Colors: navy `#0F172A` for text, indigo `#4F46E5` for headings, rules and the table header, mist `#EEF2FF` for zebra rows and the totals panel, white paper. Sky is never used (it's only for dark surfaces). These hex values live in `api/src/modules/quoteDocuments/brand.ts`, mirrored from `web/src/constants/brand.ts`.
- Page: `document.paperSize`, portrait, 18 mm margins. The header block appears on page 1. Every page has the footer "{footer} · Página {n} de {m}". The lines table repeats its header row on each page and never splits one line (description and detail) across pages. The totals panel, the acceptance block and each conditions item are kept together.
- Metadata: `Title` "Cotización {number}", `Author` and `Creator` the trade name, `Subject` the quote name, `CreationDate` and `ModDate` the issue date at 00:00 in `QUOTE_DOCUMENT_TIMEZONE`. No other metadata.
- Rendering 100 zones MUST take less than 2 s on a developer laptop. A test renders 100 zones and asserts the page count is reasonable (≤ 12).

### 8.2 XLSX (`xlsx.ts`)

- Library: `exceljs`.
- Sheet **"Cotización"**: the same sections as the PDF, top to bottom, in columns A–F (`#`, Descripción, Cant., Unidad, Precio unitario (USD), Total (USD)). The detail of each line goes in the row below its description, in a smaller grey font, merged over B–F. The issuer block, the client and service blocks, the totals, the conditions and the acceptance use merged ranges. The logo is `api/assets/brand/logo-horizontal.png` (rasterized once from the SVG at 800 px wide and committed), anchored at A1.
- Sheet **"Alcance"**: the scope table, with its header row frozen and an autofilter, and the products text below it.
- Cells hold literal values: numbers as numbers (`amount.value`, never `text`), dates as dates, text as text. **No formulas, no hidden rows or columns, no comments, no defined names except the print areas.**
- Number formats are limited to this set, which is a contract with the web previewer (§10.4):

  | Use | `numFmt` |
  |---|---|
  | Money | `#,##0.00` |
  | Area | `#,##0.00` |
  | Integer | `0` |
  | Date | `dd/mm/yyyy` |
  | Text | `@` |

- Page setup on both sheets: `document.paperSize`, portrait, fit to 1 page wide, the print area set, print titles repeating the lines header on "Cotización" and the header row on "Alcance", and the footer "{footer} · Página &P de &N".
- Workbook properties: `title`, `creator` and `lastModifiedBy` as in the PDF metadata, and `created` and `modified` set to the issue date. Nothing else.
- Font: Arial 10 (headings 12–16, bold); colors as in the PDF.

---

## 9. API

All routes are under `/api`, behind `requireAuth`, and follow SPEC-002. Add `X-Document-Hash` and `X-Document-Revision` to the CORS `exposedHeaders` in `app.ts`.

### 9.1 Settings

`GET` and `PUT /api/quote-document-settings/1` (§4). 422 for malformed values, with the field named.

### 9.2 Document state and data

**`GET /api/quotes/:id/document`** → 200:

```json
{
  "quoteId": 7,
  "ready": true,
  "blockers": [],
  "warnings": [{ "code": "PARAMETERS_CHANGED" }],
  "data": { "clientLegalName": "Hospital Ejemplo S.A.", "clientTaxId": null, "…": "§5 fields, raw (nulls kept)" },
  "defaults": { "issueDate": "2026-10-16", "validityDays": 30, "paymentTerms": "Mensual, a 30 días de la factura." },
  "contentHash": "9f2c…",
  "revision": 2,
  "number": "COT-00007",
  "fileNames": { "pdf": "Cotizacion-COT-00007-Clinica-de-prueba-Rev2.pdf", "xlsx": "…xlsx" },
  "document": { "templateVersion": 1, "…": "§7.1" }
}
```

When `ready` is false, `contentHash`, `revision`, `fileNames` and `document` are `null`, and `blockers` lists every `{ code, params? }`. `defaults` shows what an empty field resolves to, so the form can show it as a placeholder (`issueDate` is `null` when the quote was never calculated).

**`PUT /api/quotes/:id/document`** with any subset of the writable §5 fields → 200, the same body as GET. Merge semantics. It creates the `quote_documents` row when it's missing. It doesn't touch `quotes`, its jobs or its revisions.

### 9.3 Files

**`GET /api/quotes/:id/document/pdf`** and **`GET /api/quotes/:id/document/xlsx`**:

- 200 with the bytes. `Content-Type` `application/pdf` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. `Content-Disposition: inline` by default, `attachment` with `?download=1` (as measurement files, SPEC-004). `Cache-Control: no-store`. `X-Document-Hash` and `X-Document-Revision`.
- 409 `DOCUMENT_NOT_READY` ("The quote document is not ready") when §6 fails.
- Getting a file doesn't log an export.

### 9.4 Exports

- **`POST /api/quotes/:id/document/exports`** `{ "format": "pdf" | "xlsx", "contentHash": "<hex>" }` → 201 `{ id, format, number, revision, contentHash, exportedBy, exportedAt }`. 409 `DOCUMENT_NOT_READY`; 409 `DOCUMENT_CHANGED` ("The quote changed after the preview") when the hash isn't the current one; 422 for a bad body.
- **`GET /api/quotes/:id/document/exports`** → 200, an array newest first, at most 100 rows. [P1] in the UI (§10.2); the route is P0.

### 9.5 Configuration

| Variable | Default | Rules |
|---|---|---|
| `QUOTE_DOCUMENT_TIMEZONE` | `America/Guayaquil` | A valid IANA zone (checked with `Intl.DateTimeFormat`) |

Add it to the configuration table in `api/README.md` and to `api/.env.example`.

### 9.6 Errors and logging

- Add `DOCUMENT_NOT_READY` and `DOCUMENT_CHANGED` to the error table in `api/README.md`, and their Spanish messages to `web/src/i18n/apiErrors.ts`.
- Log one line per rendered file: quote id, format, revision, byte size, duration in ms. Never log the document or its content.

---

## 10. Admin UI (`web/`)

### 10.1 Entry points

- Quote Show header: a **Documento** button (icon `Description`) next to Recalcular, linking to `#/quotes/:id/document`. It's enabled in every state: the page explains what's missing.
- Quote list: [P1] a row action "Documento".
- Menu, in the **Configuración de cotización** group (SPEC-005 §10.1): **Empresa y plantilla**, linking to `/quote-document-settings/1`.

### 10.2 The Documento page (`src/quoteDocuments/QuoteDocumentPage.tsx`, a custom route)

```
Cotizaciones › Clínica de prueba › Documento                       [Descargar PDF] [Descargar Excel]
COT-00007 · Rev. 2 (nueva revisión: cambió desde la última descarga)        ⚠ Los parámetros cambiaron…
┌─ Datos del documento ──────────────┐  ┌─ [ PDF | EXCEL ] ─────────────────────────────────────────┐
│ Cliente                            │  │                                                           │
│  Razón social *  RUC / ident.      │  │                 live preview of the file                  │
│  Contacto *  Cargo  Correo  Tel.   │  │                                                           │
│  Dirección                         │  │                                                           │
│ Documento                          │  │                                                           │
│  Fecha de emisión (16/10/2026)     │  │                                                           │
│  Validez (30 días)  Forma de pago  │  │                                                           │
│  Presentación de ítems  Meses [P1] │  │                                                           │
│  Observaciones para el cliente     │  │                                                           │
│               [Guardar]            │  │                                                           │
└────────────────────────────────────┘  └───────────────────────────────────────────────────────────┘
Historial de descargas [P1]: Rev. 2 · PDF · ana@… · 16 oct 2026 13:40 …
```

- On a phone the form stacks above the preview. The preview takes the remaining height (at least 70 vh) on desktop.
- The form's placeholders show the `defaults` (§9.2), such as "30 días (predeterminado)". **Guardar** sends `PUT …/document` and then refetches the state, which refreshes the preview. Unsaved changes don't affect the preview; a "Cambios sin guardar" hint is shown while the form is dirty.
- **Not ready:** instead of the preview, an `Alert` titled "Falta información para generar la cotización" with one item per blocker, each with its fix link (§6). Fixing a client field in the form and saving refreshes the list. The download buttons are disabled.
- **Ready:** the preview of the selected format (§10.3, §10.4). The revision line says "nueva revisión" when `revision` is greater than the newest export's revision, and nothing otherwise.
- **Warnings** (§6) appear as `Alert`s above the preview.
- [P1] **Historial de descargas:** the export list (revision, format, user, date).

### 10.3 Fetching and downloading

- `src/providers/quoteDocuments.ts` fetches the files with the stored token, like `measurementFiles.ts` (same error translation, same 401 handling). Reuse `saveBlob` and `downloadName` from `src/utils/files.ts`.
- The bytes are fetched with React Query, keyed by `['quote-document', apiUrl, userId, quoteId, format, contentHash]`, and only when `ready`. If the response's `X-Document-Hash` isn't the `contentHash` the page holds, refetch the state (someone else changed the quote) and drop the bytes.
- **Download:** take the blob already in the cache (fetching it first when that format was never previewed), `POST …/exports` with its `X-Document-Hash`, and on 201 call `saveBlob(blob, fileNames[format])`. On 409 `DOCUMENT_CHANGED`: don't save; notify "La cotización cambió. Revisa la vista previa actualizada." and refetch. On 409 `DOCUMENT_NOT_READY`: refetch the state. After a successful export, refetch the state (the revision note and the history change).
- Object URLs come from `useObjectUrl`.

### 10.4 Previews

- **PDF:** `<iframe title="Vista previa PDF" src={objectUrl}>`, full width. When `navigator.pdfViewerEnabled === false`: "Este navegador no puede mostrar PDF. Descárgalo para verlo." and the download button.
- **Excel** (`src/quoteDocuments/XlsxPreview.tsx`): `exceljs` is imported with `import()`, so it's a separate chunk that loads only when the Excel tab opens. Parse the blob and render each worksheet as a tab (Cotización, Alcance) with an HTML `<table>`:
  - column widths from the sheet, merged cells as `colSpan` and `rowSpan`, row heights;
  - bold, italic, font size and color, fills, horizontal and vertical alignment, wrapped text, and borders (thin or medium, as 1 px or 2 px);
  - images: the logo, from the workbook's media, at its anchor;
  - values formatted by `formatCell(value, numFmt)`, which supports exactly the §8.2 set with the `es` locale (`#,##0.00` → `9.907,39`, `dd/mm/yyyy` → `16/10/2026`). Any other `numFmt` renders the raw value and logs a warning in development;
  - a horizontal scroll inside the preview frame (never on the page), with the sheet drawn on a white "paper" in both themes.
- Loading shows a skeleton. A failed load shows "No se pudo generar la vista previa." with **Reintentar**.

### 10.5 Empresa y plantilla screen

An `Edit` of `quote-document-settings` id 1, with cards **Empresa** (trade name to website), **Firma** (signer), **Numeración y validez** (prefix, validity, paper size), **Textos** (payment terms, intro, terms; multiline). Labels from §4. Saving shows "Las cotizaciones descargadas no cambian; las nuevas descargas usarán estos datos."

### 10.6 i18n and types

- `src/i18n/quoteDocuments.ts`: labels of §4 and §5, the blockers and warnings of §6, the page texts. A test checks every blocker and warning code has a message.
- `src/types/quoteDocuments.ts` mirrors §7.1 and §9.
- Add `exceljs` to `web/package.json` dependencies.

---

## 11. Data model

`migrations/006_quote_documents.sql`:

```sql
CREATE TABLE quote_document_settings (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  trade_name     TEXT    NOT NULL,
  legal_name     TEXT,
  tax_id         TEXT    CHECK (tax_id IS NULL OR (length(tax_id) = 13 AND tax_id NOT GLOB '*[^0-9]*')),
  address        TEXT,
  city           TEXT,
  phone          TEXT,
  email          TEXT,
  website        TEXT,
  signer_name    TEXT,
  signer_title   TEXT,
  number_prefix  TEXT    NOT NULL DEFAULT 'COT',
  validity_days  INTEGER NOT NULL DEFAULT 30 CHECK (validity_days BETWEEN 1 AND 365),
  payment_terms  TEXT,
  intro_text     TEXT,
  terms_text     TEXT,
  paper_size     TEXT    NOT NULL DEFAULT 'A4' CHECK (paper_size IN ('A4','LETTER')),
  updated_by     TEXT,
  updated_at     TEXT    NOT NULL
);
INSERT INTO quote_document_settings (id, trade_name, intro_text, terms_text, updated_at)
VALUES (1, 'CleanCode', '<§4 intro>', '<§4 terms>', strftime('%Y-%m-%dT%H:%M:%fZ','now'));

CREATE TABLE quote_documents (
  quote_id             INTEGER PRIMARY KEY REFERENCES quotes(id) ON DELETE CASCADE,
  client_legal_name    TEXT,
  client_tax_id        TEXT,
  client_contact_name  TEXT,
  client_contact_title TEXT,
  client_email         TEXT,
  client_phone         TEXT,
  client_address       TEXT,
  issue_date           TEXT,                                          -- YYYY-MM-DD
  validity_days        INTEGER CHECK (validity_days IS NULL OR validity_days BETWEEN 1 AND 365),
  payment_terms        TEXT,
  client_notes         TEXT,
  line_mode            TEXT    NOT NULL DEFAULT 'perZone' CHECK (line_mode IN ('perZone','single')),
  contract_months      INTEGER CHECK (contract_months IS NULL OR contract_months BETWEEN 1 AND 60),
  number               TEXT    UNIQUE,                                -- frozen at the first export
  updated_by           TEXT,
  updated_at           TEXT    NOT NULL
);

CREATE TABLE quote_document_exports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id      INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  format        TEXT    NOT NULL CHECK (format IN ('pdf','xlsx')),
  number        TEXT    NOT NULL,
  revision      INTEGER NOT NULL CHECK (revision >= 1),
  content_hash  TEXT    NOT NULL,
  document_json TEXT    NOT NULL,                                     -- the QuoteDocument exported (§7.1)
  exported_by   TEXT    NOT NULL,
  exported_at   TEXT    NOT NULL
);
CREATE INDEX idx_quote_document_exports_quote ON quote_document_exports(quote_id, id);
```

- The export log keeps `document_json` so that what was sent stays known even after the quote changes. Re-downloading an old revision from it is [P2].
- Deleting a quote deletes its document data and its export log (`ON DELETE CASCADE`), consistent with SPEC-005 §8.2.

---

## 12. Tests

### 12.1 API (`vitest`)

1. **Builder, worked cases** (`test/quoteDocument.builder.test.ts`), with the SPEC-005 Appendix A fixtures and the complete issuer and client data of `test/fixtures/quote-document/`:
   - Appendix **A.1**, `perZone`: lines 7 857,63 · 1 123,29 · 705,75 · 220,72; subtotal 9 907,39; IVA 15 % 1 486,11; total 11 393,50.
   - Appendix **A.1b** (manual price 3000): lines 2 379,32 · 340,14 · 213,71 · 66,83; subtotal 3 000,00; IVA 450,00; total 3 450,00. Warning `MARGIN_BELOW_MINIMUM`.
   - Appendix **A.2** after confirming the assumptions: lines 147,69 · 103,39; subtotal 251,08; IVA 37,66; total 288,74.
   - [P1] `single` on A.1: one line of 9 907,39. [P1] Amount in words for A.1: "once mil trescientos noventa y tres con 50/100 dólares". [P1] `contractMonths: 12` on A.1: 118 888,68.
   - Σ line amounts = subtotal, and subtotal + VAT = total, exactly in cents, for every case and [P1] for 200 random inputs from a seeded PRNG.
2. **Rounding traps:** VAT on 9 907,39 at 15 % is 1 486,11 (not 1 486,10); allocation tie-breaking by position; all-zero weights.
3. **Readiness:** one case per blocker in §6; several blockers are all listed; A.2 before confirmation is `QUOTE_NEEDS_REVIEW` only (given complete issuer and client data); a pending job gives `QUOTE_NOT_CALCULATED`; a PUT on the quote after a calculation gives `QUOTE_NOT_CURRENT`.
4. **No empty fields:** with every optional field empty, no `lines` entry of the issuer, client or service blocks is empty, and the model has no `""`, `"—"` or `"null"` string anywhere (walk the whole object).
5. **Hash and revision:** the hash ignores `revision`; changing a client field, an issuer field or a zone changes it; no exports → revision 1; exporting PDF then XLSX of the same content gives revision 1 twice; changing a field and exporting gives revision 2; the number freezes at the first export and survives a prefix change; a stale hash → 409 `DOCUMENT_CHANGED` and no row.
6. **PDF:** extract the text (`pdfjs-dist` legacy build, devDependency) of A.1 and check: the number, both dates, every line description and amount, the three totals, the scope zones, every condition label, the acceptance block, "Página 1 de". Metadata as in §8.1. 100 zones render in under 2 s with ≤ 12 pages.
7. **XLSX:** read A.1 back with `exceljs`: the two sheet names; line amounts are numbers equal to the model values with format `#,##0.00`; the issue date is a date; no cell has a formula; every `numFmt` is in the §8.2 set; print areas and titles are set; workbook properties as in §8.2.
8. **No internal data leaks** (§3.2): for A.1 and A.1b, none of these values appears in the PDF text or in any XLSX cell, in any common formatting (`6439.80`, `6.439,80`, `6439,80`, …): total cost, profit, target and minimum price (A.1b), negotiation room, break-even, external reference (3 500), flat-rate revenue, purchase cost, and the creator's email. Also the strings "Margen", "Costo", "Ganancia".
9. **Routes:** settings GET/PUT, validation and 404 for other ids; document GET when ready and not ready; PUT creates the row, merges, validates, and doesn't enqueue a job or change `input_revision`; the file routes' headers (type, disposition inline and with `?download=1`, both `X-Document-*`, `no-store`), and 409 when not ready; exports POST/GET; the CORS response exposes both headers; every route requires authentication.
10. **Migration:** 006 runs on a database that already has quotes; the settings row exists with the §4 seeds.

### 12.2 Web (`vitest`)

- `formatCell` for each §8.2 format, in `es`.
- `XlsxPreview` renders the committed fixture `tests/fixtures/quote-document-A1.xlsx` (generated by the API renderer, with the regeneration command documented in `web/README.md`): both sheet tabs, merged cells, the amounts formatted as `9.907,39`, the logo image.
- Documento page, with a mocked provider and `fetch`: not ready → the blocker list with links and disabled downloads; ready → the PDF iframe and the Excel tab; Guardar sends the PUT and refetches; Download posts the export with the blob's hash and saves the same blob (spy on `saveBlob`); a 409 `DOCUMENT_CHANGED` doesn't save and refetches; a mismatched `X-Document-Hash` refetches the state; the margin confirmation [P1].
- Every blocker and warning code has a Spanish message.
- Smoke render of `/quote-document-settings/1`.

---

## 13. Implementation order

1. Migration 006, settings repository and routes (§4, §9.1, §11), with tests.
2. `words.ts` [P1] and the builder (§3, §7) with the worked cases of §12.1.1–5. Don't continue until the cent values match.
3. The document routes and the export log (§9.2–9.4).
4. The PDF renderer (§8.1), then the XLSX renderer (§8.2), with the leak test (§12.1.8).
5. Web: types, i18n and provider; the Empresa y plantilla screen; the Documento page with the PDF preview; then the XLSX preview; then the history [P1].
6. Documentation: `api/README.md` (routes, the variable, errors, a curl example downloading the PDF), `web/README.md` (the page, the fixture regeneration), and one paragraph in the root `README.md`. Mark "Implement quoting export as PDF." and "Implement quoting export as XLSX." as done in `TODO.md`.

---

## 14. Definition of done

- `api/`: `npm ci`, `npm run lint`, `npm run typecheck` and `npm test` pass with no warnings. `web/`: `npm ci`, lint, typecheck, test and build pass, and `exceljs` lands in its own chunk (check the build output).
- **End-to-end walkthrough** on a disposable database, recorded in `api/README.md` Notes:
  1. `db:reset`. Open the sample quote's Documento page: it lists `QUOTE_NEEDS_REVIEW`, the missing issuer fields (legal name, RUC, address, email, payment terms) and the missing client fields.
  2. Fill in Empresa y plantilla, confirm the assumptions, and fill in the client in the Documento form. The PDF preview shows `COT-00001`, two lines of 147,69 and 103,39, and a total of 288,74. The Excel tab shows the same values.
  3. Download both formats. Both files open in a desktop viewer and show exactly what the preview showed. The history has two rows, both Rev. 1.
  4. Change the client's contact and save. The page says "nueva revisión". Download the PDF: it's Rev. 2, and its file name ends in `-Rev2.pdf`.
  5. In a second tab, change the payment terms, then press Descargar in the first tab without reloading: no file is saved, and the preview refreshes.
- Every [P1] item is done or listed as skipped.

---

## 15. Out of scope (future work)

- Sending quotes by email from the app, electronic signatures, and client-side acceptance.
- A clients catalog with autocomplete, and several contacts per client.
- Custom logos and templates per client, several templates, and English documents.
- Re-downloading old revisions from the export log [P2], and storing the exported bytes.
- Staffing, unit prices per m² or optional items in the document.
- Converting a quote into an invoice (SRI electronic invoicing).
- Exporting the internal analysis (costs, margins, purchase plan) to XLSX. That's an internal report, not a client document, and needs its own spec.
