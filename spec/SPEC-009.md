# SPEC-009: Quotes from TDR documents

| | |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-10-17 |
| **Builds on** | [SPEC-005](SPEC-005.md) (quote engine, jobs), [SPEC-006](SPEC-006.md) (quote documents, client data) |
| **Supersedes** | SPEC-005 §2 "One quote per measurement" stays, but a quote no longer always starts from a measurement: it can start from a TDR document, with no measurement. Everything else stands. |
| **Deliverables** | `api/`: `tdr_documents`, the analysis worker that calls Claude Haiku through OpenRouter, `/api/tdr-documents` · `web/`: **Documentos TDR** (list, upload, review form, **Crear cotización**) |

The keywords **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in RFC 2119.

---

## 1. Summary

Public and private clients publish the cleaning service they want to buy as a *TDR* (términos de referencia), a *ficha técnica* or a *pliego*: a PDF or Word document with the areas, the staff, the schedules, the machinery, the supplies and the reference price. Until now someone had to read it and type a quote by hand.

The admin now uploads that document under **Documentos TDR**. The API stores it and analyses it **as a job**: the list shows the entry at once, *En cola* then *Analizando*, while a worker sends the document to Claude Haiku through OpenRouter and gets the information back as structured data. When it is done, the entry opens as an **editable form**. The admin corrects what the model got wrong and presses **Crear cotización**: the API creates a quote with one zone per area of the document and the client's data already in the quote document, and the quote engine calculates it as usual.

The document may be in Spanish or English; **everything extracted is in Spanish**.

## 2. Decisions

| Topic | Decision | Why |
|---|---|---|
| Model | OpenRouter's Chat Completions API, model `anthropic/claude-haiku-5.5` (the latest Haiku there), configurable with `OPENROUTER_MODEL`. | Asked for. Pinned rather than `~anthropic/claude-haiku-latest`, so a new model never changes extractions silently. |
| Key | `OPENROUTER_API_KEY` in `api/.env`, optional. Without it the API still starts; analyses fail with `OPENROUTER_API_KEY_MISSING`, and **Reintentar** works once it is set. | The rest of the app must not depend on it. |
| Files | PDF (sent to the model as a file, OpenRouter's `native` engine: the model sees the pages, tables included) and Word `.docx` (its text, read with mammoth). At most 20 MB. Old `.doc` files are refused. | Haiku reads PDFs natively but not Word files. `.doc` is a binary format no light library reads well. |
| Structured output | A **forced tool call** (`registrar_tdr`) whose parameters are the JSON schema of §4.1; the arguments are then validated and normalized by the API. Not `response_format` with `strict: true`: Anthropic's strict mode allows at most 16 nullable fields and a TDR has about 30. | The model's reply is untrusted input either way. |
| Job | The entry is its own job: `tdr_documents.status` is `pending → running → done \| failed`. An in-process worker takes one at a time, like the quote worker (SPEC-005 §7). The model call happens **outside** any transaction. Network errors, timeouts, 408, 429 and 5xx are retried with backoff (3 attempts); a refused key, no credit, an unreadable file or a 4xx are not. On startup a `running` entry goes back to `pending`. | A call takes seconds to a minute; better-sqlite3 must not be held for that long. |
| Never invent | The prompt asks for what the document says and `null` otherwise; the only suggestions are the zone type (chosen from the company's own active zone types) and the schedule (the active schedule with the document's hours per day). The quote is created **Revisar**, as every new quote. | SPEC-005 §0.5. |
| Reference price | The document's monthly reference price (without VAT) becomes the quote's `externalReferencePrice`. | It is exactly the external reference SPEC-005 compares against. |
| Quote | A quote with `measurementId: null`, `measurementOrigin: 'estimate'`, and zones with `origin: 'manual'`, `measurementSource: 'estimated'`. A zone without an area stays without one (Revisar, "falta el área"). Traffic, schedule and days left empty take the parameters' defaults, as zones from a measurement do. | The engine and every quote screen work unchanged. **Regenerar** is already off for quotes without a measurement. |
| One quote per document | `tdr_documents.quote_id`, `ON DELETE SET NULL`: deleting the quote lets the document create another. | Mirrors measurements. |
| Original file | Kept as `FILES_PATH/tdr/{id}.{pdf\|docx}`, downloadable. Deleting the entry deletes it; the quote stays. `db:reset` deletes the folder. | The admin goes back to the source while reviewing. |

## 3. Storage

Migration `012_tdr_documents.sql`:

| Column | |
|---|---|
| `id`, `file_name` (≤ 255), `content_type` (`application/pdf` or the `.docx` type), `size`, `sha256` | The upload |
| `status` (`pending`, `running`, `done`, `failed`), `attempts`, `run_after`, `error` (a code, §5.3), `error_detail` | The job |
| `model`, `extraction_json`, `analyzed_at` | The result: `extraction_json` is the reviewed data (§4.1) once `done`, and what the admin saves afterwards |
| `quote_id` → `quotes(id) ON DELETE SET NULL` | The quote created from it |
| `created_by`, `created_at`, `updated_at` | |

## 4. Extraction

### 4.1 Model (`TdrExtraction`)

Every field may be `null` (a list may be empty). Text is in Spanish.

| Field | Meaning | Limit |
|---|---|---|
| `title` | The service, as the document names it | 150 |
| `summary` | What is asked for, in a few sentences | 3000 |
| `client` | `{ legalName, taxId, contactName, contactTitle, email, phone, address }`, the contracting entity | 150, 20, 100, 100, 254, 30, 200 |
| `city` | | 100 |
| `installationType` | `privateHospital`, `publicHospital`, `office`, `mall`, `other` | |
| `referencePrice` | Monthly reference price or budget without VAT, USD | ≥ 0 |
| `contractMonths` | Term of the contract, months | integer 1–120 |
| `paymentTerms` | | 500 |
| `totalArea` | m² | ≥ 0 |
| `serviceHours` | The working hours as written ("24 horas, 365 días…") | 300 |
| `zones[]` | `{ name, risk, zoneTypeId, scheduleId, floorArea, fixedPosts, hoursPerDay, daysPerMonth, notes }`. One per area or post line; an area with 24 h and 8 h posts is two zones. | 100 zones; name 100, notes 1000 |
| `staff[]` | `{ role, count, notes }` | 50; 100, 300 |
| `equipment[]` | Machinery and tools: `{ description, quantity, notes }` | 100; 300, 300 |
| `supplies[]` | Chemicals and consumables: `{ description, presentation, quantity, frequency }` | 200; 500, 100, —, 50 |
| `requirements[]` | `{ text }`: staff qualifications, guarantees, penalties worth knowing before quoting | 50; 500 |

### 4.2 Call

`POST https://openrouter.ai/api/v1/chat/completions` with the system prompt (role, rules: only what the document says, Spanish output, numbers as numbers, zones and suggestions as above, days a month from the document's general schedule), a user message with the company's active zone types (`id · name · risk`) and the document, the tool `registrar_tdr` with the JSON schema of §4.1 (every property required, `null` when unknown) and `tool_choice` forcing it, `plugins: [{ id: 'file-parser', pdf: { engine: 'native' } }]`, `max_tokens` 16 000, a 3-minute timeout.

Measured on an 18-page hospital *ficha técnica* with `anthropic/claude-haiku-5.5`: about 26 s, 58 000 input and 8 000 output tokens, USD 0.01.

The tool call's arguments (or, failing that, the reply's text; a fenced block is accepted) are parsed, normalized (strings trimmed and cut at a word to their limit, numbers that aren't finite and non-negative dropped, unknown enums `null`, a `zoneTypeId` that isn't an active zone type `null`, lists cut to their limit) and then `scheduleId` is set from `hoursPerDay`.

## 5. API

### 5.1 Routes

All behind authentication.

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/api/tdr-documents` | simple REST list: sort `createdAt` (default DESC), `fileName`, `status`; filters `status`, `q` (file name, title) | records without `extraction` |
| `POST` | `/api/tdr-documents` | `multipart/form-data`, one `file` | 201, the record, `pending` |
| `GET` | `/api/tdr-documents/:id` | | the record with `extraction` |
| `PUT` | `/api/tdr-documents/:id` | `{ extraction }` (§4.1, validated, 422 by field) | 200; 409 unless `done` |
| `DELETE` | `/api/tdr-documents/:id` | | 200, the record; the file is deleted |
| `POST` | `/api/tdr-documents/:id/analyze` | | 202, back to `pending` (attempts reset); 409 while `pending` or `running`. Replaces the edits. |
| `POST` | `/api/tdr-documents/:id/quote` | | 201, the quote; 409 unless `done` or when its quote exists; 422 `zones` without zones |
| `GET` | `/api/tdr-documents/:id/file` | `?download=1` | the original file |

A record: `{ id, fileName, contentType, size, status, error, errorDetail, attempts, model, title, zoneCount, quoteId, analyzedAt, createdBy, createdAt, updatedAt, extraction? }`.

### 5.2 Upload checks

415 when the body isn't multipart. 422 `file`: "Required", "Must be a PDF or Word (.docx) file" (checked by content: `%PDF-`, or a ZIP holding `word/document.xml`), "Must be at most 20 MB" (also multer's limit).

### 5.3 Error codes

`OPENROUTER_API_KEY_MISSING`, `OPENROUTER_AUTH` (401/403), `OPENROUTER_CREDITS` (402), `OPENROUTER_REJECTED` (other 4xx), `OPENROUTER_UNAVAILABLE` (network, timeout, 408, 429, 5xx, after the last attempt), `INVALID_RESPONSE` (no JSON in the reply, or a cut reply), `EMPTY_DOCUMENT` (a Word file without text), `UNREADABLE_DOCUMENT`, `FILE_MISSING`.

### 5.4 Creating the quote

In one transaction: the quote (`name` = title, else the client, else the file name; `installationType`; `city`; `measurementOrigin: 'estimate'`; `externalReferencePrice` = `referencePrice` when > 0; `notes` = "Creada desde el documento TDR «file»." and the summary, cut to 2000), its zones (the zone type only when it is still active, the schedule likewise, else the parameters' default; fixtures 0; `observation` = notes), the quote document's client data, contract months and payment terms (each value that the document form would refuse is left empty), a `generate` job, and `quote_id`. The quote worker is nudged.

## 6. Admin

- **Documentos TDR** in the menu, after Cotizaciones. The list (a table from `md`, cards below) shows the document's title or file name, its state as a badge with a spinner while *En cola* or *Analizando*, its zones, its quote and who uploaded it. While any entry is pending it refreshes every 2 s.
- **Subir documento**: a file input (PDF or .docx, 20 MB) and a line on what happens next. Saving opens the entry.
- The entry: while it is analysed, a notice with a spinner, refreshed every 2 s; when it failed, the reason in Spanish and **Reintentar**. When it is done, the form in tabs (*Datos generales*, *Cliente*, *Zonas*, *Personal y equipos*, *Insumos*, *Requisitos*) with **Guardar**, **Guardar y crear cotización** (saves, creates the quote and opens it) or, once there is one, **Ver cotización**; **Descargar documento**, **Volver a analizar** (asks first: it replaces the edits) and **Eliminar**.

## 7. Tests

- **API:** upload checks, the job's states with a stub extractor (done, retried, failed for good, recovered), the OpenRouter request (model, schema, the PDF as a file, the .docx as text, the key) and every error mapping with a stub `fetch`, the normalization, PUT validation, analyze, the quote and its document data, deleting.
- **Web:** the provider's multipart upload, the list's badges, the entry in each state and the quote button.

## 8. Out of scope

- Scanned PDFs without text work only as well as the model reads the page images; no separate OCR.
- `.doc`, spreadsheets and images.
- Several quotes from one document, or merging a document into an existing quote.
- Streaming progress; the entry only knows queued, analysing, done or failed.
