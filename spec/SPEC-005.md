# SPEC-005: Quote engine and automatic quotes from measurements

| | |
|---|---|
| **Status** | Draft, ready for implementation |
| **Date** | 2026-10-16 |
| **Builds on** | [SPEC-001](SPEC-001.md) (RoomScanner iOS app), [SPEC-002](SPEC-002.md) (API and admin UI), [SPEC-003](SPEC-003.md) (user accounts), [SPEC-004](SPEC-004.md) (measurement upload) |
| **Source of the business logic** | The workbook `CleanCode_Motor_Costos_v3_provisional.xlsx` ("CleanCode v3.0 — entrega provisional para desarrollo", 16/10/2026). This spec transcribes every formula that a quote uses (§5) and fixes the expected results of worked cases computed by recalculating that workbook (Appendix A). |
| **Supersedes** | SPEC-002 §5.1 "Rounding", **for the quote engine only** (§5.11). SPEC-004 §4.3 `metadata` schema, which gains optional fields (§8.6). SPEC-004 §4.1, which gains one column. |
| **Deliverables** | `api/`: quoting settings, quote engine, a job queue in SQLite fed by a trigger on `measurements`, a worker, `/api/quotes` · `web/`: quoting settings screens and Cotizaciones screens · `mobile/`: quoting inputs captured on site and sent with the upload |

The keywords **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in RFC 2119.

---

## 0. Instructions for the implementing agent

1. The code lives in `api/`, `web/` and `mobile/`. The three parts stay independent (SPEC-002 §8). Contracts that cross a boundary (the upload metadata, the quoting options) are duplicated on purpose and pinned by tests.
2. Priorities work as before: **[P0]** required, **[P1]** expected (list anything you skip), **[P2]** optional. A requirement without a tag is [P0]. Record deviations in `mobile/NOTES.md`, or in the "Notes" section of `api/README.md` or `web/README.md`.
3. All UI text is in Spanish and follows the existing conventions (`Localizable.xcstrings` on iOS, `src/i18n/` on the web). API enums are English camelCase; the UI translates them.
4. **The workbook is the executable specification.** Reproduce its formulas exactly, including the quirks, except for the deviations listed in §5.12. If you have the workbook, you MAY use it to check your work, but the spec is self-contained. The golden cases in Appendix A were produced by filling in the workbook and recalculating it with LibreOffice. Your engine MUST reproduce them.
5. **Never invent business data.** Rates, frequencies, doses, prices and quantities come only from the admin's settings, the phone, or a person editing the quote (workbook `LEER v3` item 9, `Equipo` item 4). When something is missing, the quote shows **Revisar** and lists the cause. It never gets a made-up value. The only defaults are the ones an admin can see and edit in the settings (§3.1).
6. The quote engine is pure, deterministic code with no intermediate rounding (§5.11).
7. Follow the order in §13, and check §14 before you call the work done.

---

## 1. Summary

The iPhone app measures a place. This spec turns each measurement into a **monthly cleaning-service quote** (*cotización*) computed with the cost model in the workbook.

1. The admin UI gains a **quoting configuration** section where every variable in the workbook can be edited: company parameters (*Parámetros*), zone types (*Tipologías*), service schedules (*Horarios*), quoting products (*Productos*), and an equivalence table from the app's room types to zone types.
2. **Inserting a measurement is a job.** An `AFTER INSERT` trigger on `measurements` creates an empty quote and a pending row in `quote_jobs` in the same transaction. A worker inside the API claims the job, turns every scanned room into a zone, runs the engine, and writes the result back to the database.
3. A new quote is **Revisar** (needs review) until a person confirms the assumptions, as the workbook requires (`Entradas!D11`). Editing any input enqueues a new job.
4. The iPhone app collects on site what the scanner can't measure: traffic, schedule, days per month, fixed posts and sanitary fixtures. Admin defaults fill whatever the phone didn't send.
5. The admin UI shows the quote: summary and negotiation band, per-zone detail, technical offer (*Oferta técnica*), purchase plan (*Plan de compras*), flat-rate and external-reference comparison, and the monthly waste control (*Control de mermas*).

```
 RoomScanner (iPhone)                 API process                                    SQLite
 ────────────────────                 ───────────                                    ──────
 scan + "Datos para cotizar"
 POST /api/measurements ──────────►  insert measurement ───────────────────────────► measurements
                                                                                       │ AFTER INSERT trigger
                                                                                       ▼
                                                                                     quotes (pending) + quote_jobs (pending)
                                      quote worker ◄── claim ─────────────────────── quote_jobs
                                        derive zones (§6) ── read ─────────────────── measurements, measurement_files (geometry),
                                        compute (§5, pure)                             quote_parameters, quote_zone_types, ...
                                        write ───────────────────────────────────────► quotes, quote_zones (one transaction)
 Admin UI ─── /api/quotes, /api/quote-* ──────────────────────────────────────────── edit inputs → new job
```

### 1.1 Terminology

| Workbook | Spec / UI (Spanish) | Code |
|---|---|---|
| Caso | Cotización | `quote` |
| Zona (row of `Entradas` 17–36) | Zona | `zone` (`quote_zones`) |
| Tipología / Tipo de zona | Tipo de zona | `zoneType` (`quote_zone_types`) |
| Horario | Horario | `schedule` (`quote_schedules`) |
| Parámetros | Parámetros | `quote_parameters` |
| Productos | Productos de cotización | `quoteProduct` (`quote_products`) |
| Sanitarios | Aparatos sanitarios | `fixtures` (columns on `quote_zones`) |
| Calculo | Motor | `api/src/modules/quotes/engine/` |
| Calculo!D6 = OK / REVISAR | Simulación / Revisar | `status: 'simulation' \| 'needsReview'` |

---

## 2. Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Where the quote is "generated in the database" | An `AFTER INSERT` trigger on `measurements` inserts the quote row and its job, so every way of adding a measurement (upload, seed, scripts, SQL) creates the job atomically. The arithmetic runs in TypeScript in a worker inside the API process, which is the only writer to the database. | SQLite has no stored procedures. Writing this model as triggers would make it untestable. The queue, its state and the results all live in the database, and the trigger makes "a measurement is a job" a database guarantee. |
| Worker | In-process. It polls `quote_jobs` every `QUOTE_WORKER_POLL_MS`, claims one job at a time, and processes it in **one transaction**. | better-sqlite3 is synchronous and the engine takes milliseconds, so nothing can interleave inside a job. There's no extra service to deploy. |
| One quote per measurement | `quotes.measurement_id` is `UNIQUE`. Recalculating overwrites the result. | The workbook models one case at a time. Quote history is future work. |
| Deleting a measurement | The quote survives with `measurementId: null` (`ON DELETE SET NULL`). | A quote may already have been discussed with a client. This follows SPEC-003's audit rule. |
| Settings snapshot | Each calculation stores a snapshot of the settings it used. Changing a setting does **not** recalculate existing quotes. They show "Parámetros modificados" and offer **Recalcular**. | A quote's numbers must never change silently. |
| Review gate | `assumptionsConfirmed` (workbook `Entradas!D11`, "Habilitar simulación con supuestos") defaults to `false`, so every new quote is **Revisar** until a person confirms it. | The workbook makes this gate explicit: "Activar Sí únicamente para simular después de revisar supuestos". |
| Results while Revisar | The engine computes and stores figures even when the status is Revisar, using only the zones that are complete. The UI labels them **Preliminar** and lists the causes. | Reviewers need to see the numbers in order to fix the inputs. The workbook hides them (`Cotizacion` shows blanks); here the "Preliminar" label and the status do that job instead. |
| Zone inputs | Every input has a recorded source: `scan`, `app`, `default` or `manual`. Edits made on the web are kept across recalculations. **Regenerar** [P1] rebuilds the zones from the measurement. | The workbook says "Conservar unidades y procedencia". |
| Room type → zone type | An admin-editable equivalence table from the app's `LocationType` raw values (SPEC-001, about 55 values) to zone types. The phone now uploads the room type the user chose. | The user already picks a room type on the phone. A second picker would be redundant, and the mapping stays a company decision. |
| Quoting products | A dedicated `quote_products` catalog (presentation, published price, dose). A row MAY link to an inventory product (SPEC-002), and then its stock comes from the inventory. | Doses and presentations are quoting data. Stock already exists in the inventory. |
| Currency | USD, the workbook's currency. The web formats with the existing `VITE_CURRENCY` (default `USD`). | No conversion. |
| Out of the workbook | `Prueba mecanizada` (machines), `Acta y supuestos`, `Equipos investigados` and `Fuentes` don't feed the quote, as the workbook itself states (`LEER v3` items 8 and 16). They aren't implemented. Product notes and source URLs are kept as fields. | The workbook marks machinery as "pendiente" and the hospital research as documentation only. |

---

## 3. Quoting settings

Everything in this section is editable in the admin UI (§10.2). The seed values are the workbook's values (§11). Every change increments the **settings revision** (§3.6).

### 3.1 Parameters (`quote_parameters`, one row)

`GET /api/quote-parameters/1` and `PUT /api/quote-parameters/1` (merge semantics). There is no list, create or delete. Every numeric field is a finite JSON number with at most 6 decimals (more decimals → 422, as in SPEC-002 §5.1), and at most 1 000 000 000. "Fraction" fields are stored as fractions (`0.1115`) and shown as percentages in the UI (`11,15 %`).

| Field | UI label | Unit | Default | Rules | Workbook |
|---|---|---|---|---|---|
| **Mano de obra** | | | | | |
| `monthlyWage` | Sueldo mensual del operario | USD/mes | 482 | > 0 | `Parametros!D7` |
| `basicWage` | SBU vigente (décimo cuarto) | USD/mes | 482 | ≥ 0 | D8 |
| `employerContributionRate` | Aporte patronal IESS | fraction | 0.1115 | 0–1 | D9 |
| `reserveFundRate` | Fondo de reserva | fraction | 0.0833 | 0–1 | D10 |
| `applyReserveFund` | Aplicar fondo de reserva | boolean | `true` | | D11 (1/0) |
| `otherPayrollRate` | Otras cargas sobre sueldo (IECE/SECAP) | fraction | 0.01 | 0–1 | D12 |
| `theoreticalWorkdaysPerYear` | Días laborables teóricos por año | days | 260 | 1–366 | D13 |
| `nonWorkedHolidaysPerYear` | Feriados no trabajados por año | days | 11 | ≥ 0 | D14 |
| `vacationWorkdaysPerYear` | Días laborables de vacaciones por año | days | 11 | ≥ 0 | D15 |
| `otherAbsenceDaysPerYear` | Otros días de ausencia por año | days | 3 | ≥ 0 | D16 |
| `hoursPerWorkday` | Horas de jornada por día | h | 8 | > 0, ≤ 24 | D17 |
| `productiveFraction` | Fracción productiva de las horas | fraction | 0.85 | > 0, ≤ 1 | D18 |
| `nightSurchargeRate` | Recargo por hora nocturna (19:00–06:00) | fraction | 0.25 | 0–10 | D19 |
| `holidaySurchargeRate` | Recargo por hora en feriado trabajado | fraction | 1 | 0–10 | D20 |
| `nationalHolidaysPerYear` | Feriados nacionales por año (horarios con feriados) | days | 11 | 0–365 | D21 |
| **Supervisión, EPP y utensilios** | | | | | |
| `supervisorMonthlyCost` | Supervisor: costo mensual completo | USD/mes | 900 | ≥ 0 | D23 |
| `operatorsPerSupervisor` | Operarios por supervisor | people | 25 | > 0 | D24 |
| `baseEppPerFte` | EPP y uniforme base | USD por FTE al mes | 15 | ≥ 0 | D25 |
| `criticalEppPerFte` | EPP adicional en área crítica | USD por FTE al mes | 25 | ≥ 0 | D26 |
| `mopCoverageM2` | m² que cubre una mopa | m² | 100 | > 0 | D27 |
| `mopCost` | Costo de una mopa | USD | 8 | ≥ 0 | D28 |
| `mopReplacementsPerMonth` | Reposiciones de mopa por mes | per month | 1 | ≥ 0 | D29 |
| **Costos fijos del contrato** | | | | | |
| `equipmentMonthly` | Equipos: amortización y mantenimiento | USD/mes | 40 | ≥ 0 | D31 |
| `transportMonthly` | Transporte y logística | USD/mes | 60 | ≥ 0 | D32 |
| `insuranceMonthly` | Seguros y permisos | USD/mes | 10 | ≥ 0 | D33 |
| `administrationRate` | Administración (sobre costo operativo) | fraction | 0.10 | 0–1 | D34 |
| `contingencyRate` | Contingencia (sobre costo con administración) | fraction | 0.05 | 0–1 | D35 |
| **Margen e impuestos** | | | | | |
| `targetMargin` | Margen objetivo sobre venta | fraction | 0.35 | ≥ 0, < 1 | D37 |
| `minimumMargin` | Margen mínimo aceptable | fraction | 0.30 | ≥ 0, ≤ `targetMargin` | D38 |
| `vatRate` | IVA sobre servicio | fraction | 0.15 | 0–1 | D39 |
| `purchaseVatRate` | IVA para normalizar precios de compra | fraction | 0.15 | 0–1 | `Precios investigados!C17` |
| **Químicos y mermas** | | | | | |
| `targetWasteRate` | Merma objetivo de químicos | fraction | 0.05 | 0–1 | D41 |
| `uncontrolledWasteRate` | Merma estimada sin control | fraction | 0.15 | 0–1 | D42 |
| **Comparación** | | | | | |
| `flatRatePerM2` | Tarifa plana de comparación | USD/m² al mes | `null` | `null` or ≥ 0 | D44 |
| `monthsPerYear` | Meses por año | months | 12 | integer 1–12 | D45 |
| **Valores predeterminados de zonas** (new) | | | | | |
| `defaultTraffic` | Tráfico predeterminado | enum | `medium` | `low`, `medium`, `high` or `null` | — |
| `defaultScheduleId` | Horario predeterminado | id | the `diurno-8h` schedule | an existing schedule or `null` | — |
| `defaultDaysPerMonth` | Días de servicio por mes predeterminados | days | 22 | `null` or > 0, ≤ 31 | — |
| `defaultZoneTypeId` | Tipo de zona si no hay equivalencia | id | `null` | an existing zone type or `null` | — |
| **Aparatos sanitarios predeterminados** (new) | | | | | |
| `defaultFixtureVisitsPerDay` | Atenciones por día | per day | `null` | `null` or > 0 | `Sanitarios!F` |
| `defaultMinutesPerFixture` | Minutos por aparato | min | `null` | `null` or > 0 | `Sanitarios!G` |
| `defaultSolutionLitersPerFixture` | Litros de solución por aparato | L | `null` | `null` or > 0 | `Sanitarios!H` |
| `defaultPaperSoapPerFixtureMonthly` | Papel y jabón por aparato al mes | USD | `null` | `null` or ≥ 0 | `Sanitarios!I` (per zone in the workbook) |
| `fixtureDefaultsExcludeFloor` | Los tiempos predeterminados no incluyen el piso | boolean | `false` | | `Sanitarios!N` |

- `notes` is an object that maps a field name to its source note (≤ 500 chars each), seeded from the workbook's "Origen" column (`Parametros!F`). The UI shows each note as helper text, and it can be edited [P1].
- Cross-field rule: `minimumMargin > targetMargin` → 422, with `errors.minimumMargin = "Must be less than or equal to the target margin"`.
- The response also carries the read-only `revision` and `updatedAt`.
- The four sanitary defaults start empty on purpose. The workbook has no values for them ("Son entradas, no cifras oficiales"), so until an admin fills them in, every zone with fixtures is Revisar.

### 3.2 Zone types (`/api/quote-zone-types`, workbook `Tipologias` 7–26)

Standard SPEC-002 resource. Content-Range name `quote-zone-types`, sortable by `id`, `name`, `code`, `risk`, default sort `name ASC`, filters `risk` and `active`, and `q` searches `name`, `code` and `note`.

| Field | UI label | Rules | Workbook |
|---|---|---|---|
| `code` | Código | Required, unique, `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 50 | — |
| `name` | Tipo de zona | Required, unique (case-insensitive), ≤ 100 | C |
| `risk` | Riesgo sanitario | `critical` (Crítica), `semicritical` (Semicrítica), `noncritical` (No crítica) | D |
| `dailyRateM2PerHour` | Rendimiento diario (m²/h) | > 0 | E |
| `terminalRateM2PerHour` | Rendimiento terminal (m²/h) | > 0 | F |
| `hoursBetweenCleanings` | Horas entre limpiezas según tráfico | `{ low, medium, high }`, each > 0 | G, H, I |
| `wallsInTerminal` | Paredes en terminal | boolean | J |
| `suggestedTerminalsPerMonth` | Terminales/mes sugeridas | ≥ 0 | K |
| `cleaningProductId` | Producto de limpieza | An existing quoting product | L |
| `dailyDisinfectantId` | Desinfectante diario (concurrente) | An existing quoting product | M |
| `terminalDisinfectantId` | Desinfectante terminal | An existing quoting product | N |
| `solutionLitersPerM2` | Solución (L/m²) | ≥ 0 | O |
| `countsFixtures` | Contar aparatos sanitarios del escaneo | boolean (new; `true` for Baño) | — |
| `note` | Nota y origen | ≤ 1000 | P |
| `active` | Activo | boolean, default `true`. Inactive types can't be chosen for new zones, but existing zones keep them. | — |

Deleting a zone type that a zone, a parameter or an equivalence references → 409 `CONFLICT`, "Zone type is in use". Admins deactivate it instead.

### 3.3 Schedules (`/api/quote-schedules`, workbook `Tipologias` 31–34)

Standard resource, Content-Range `quote-schedules`, default sort `serviceHoursPerDay ASC`.

| Field | UI label | Rules | Workbook |
|---|---|---|---|
| `code` | Código | Required, unique slug as above. The phone refers to schedules by code (§8.5). | — |
| `name` | Horario | Required, unique, ≤ 100 | C |
| `serviceHoursPerDay` | Horas de servicio por día | > 0, ≤ 24 | D |
| `nightHoursFraction` | % de horas nocturnas | 0–1 | E |
| `includesHolidays` | Incluye feriados | boolean | F |
| `note` | Nota | ≤ 1000 | L |
| `active` | Activo | boolean | — |

Deleting a schedule that something references → 409.

### 3.4 Quoting products (`/api/quote-products`, workbook `Productos` 7–16 and `Precios investigados` 7–11)

Standard resource, Content-Range `quote-products`, default sort `name ASC`.

| Field | UI label | Rules | Workbook |
|---|---|---|---|
| `name` | Producto | Required, unique, ≤ 100 | `Productos!C` |
| `use` | Uso | ≤ 100 | D |
| `presentationSize` | Presentación | > 0, in `unit` | E |
| `unit` | Unidad | `L` or `kg` | F (normalized) |
| `publishedPrice` | Precio publicado por envase | ≥ 0 | `Precios investigados!D` |
| `publishedPriceIncludesVat` | El precio incluye IVA | boolean | `Precios investigados!E` |
| `dosePerLiter` | Dosis por litro de agua | ≥ 0. Unit `ml` when `unit` is `L`, and `g` when it's `kg`. | I, J |
| `stockContainers` | Stock actual (envases) | `null` or ≥ 0. Ignored when `inventoryProductId` is set. | L |
| `inventoryProductId` | Producto del inventario | `null` or an existing inventory product (SPEC-002) | — |
| `presentationStatus` | Estado del envase | ≤ 100, for example "SUPUESTO 3,8 L" | `Precios investigados!I` |
| `sourceUrl` | Fuente | `null` or an `http(s)` URL | `Precios investigados!L` |
| `note` | Fuente / nota | ≤ 1000 | M |
| `active` | Activo | boolean | — |

Read-only fields, computed on every read with the current `purchaseVatRate`:

- `pricePerContainer = publishedPrice / (1 + (publishedPriceIncludesVat ? purchaseVatRate : 0))` (`Precios investigados!H × F`)
- `pricePerUnit = pricePerContainer / presentationSize` (USD per L or kg, `Productos!H`)
- `doseUnit`: `ml` or `g`
- `costPerLiterOfSolution = pricePerUnit × dosePerLiter / 1000` (`Productos!K`)
- `effectiveStock`: with no link, `stockContainers ?? 0`. With a link, the inventory product's `quantity` converted to containers:
  - when the inventory unit is a count (`unit`, `box`, `pack`, `roll`, `pair`), `quantity` is already a number of containers;
  - when it's a volume (`L`, `mL`, `gal`) or a mass (`kg`, `g`), convert to `unit` (1 gal = 3.785411784 L) and take `floor(quantity / presentationSize + 1e-9)`;
  - if the unit kinds don't match (a volume against `kg`, for example), saving the link fails with 422, `errors.inventoryProductId = "Inventory unit is not compatible"`.

Deleting a product that a zone type or a waste-control row references → 409.

### 3.5 Room-type equivalences (`/api/quote-location-types`)

One row per `LocationType` raw value of the iOS app (`mobile/RoomScanner/Persistence/LocationType.swift`).

| Field | Rules |
|---|---|
| `locationType` | Read-only, unique, the Swift raw value (`bathroom`) |
| `label` | Read-only Spanish name, copied from the app's `Localizable.xcstrings` (`Baño`) |
| `zoneTypeId` | Writable. `null` (no equivalence) or an existing zone type. |

List (sortable by `label`, `locationType`; filter `zoneTypeId`, with `null` meaning unmapped; `q` searches both text columns), getOne and update. There is no create or delete: the rows are seeded (§11). When the iOS app adds a type, a migration adds its row.

### 3.6 Settings revision

`quote_parameters.revision` starts at 1 (the default inserts in §11 already raise it; only comparisons between revisions matter). It increases by one on every successful `PUT /api/quote-parameters/1`, and through triggers (§4) on every insert, update or delete in `quote_zone_types`, `quote_schedules`, `quote_products` and `quote_location_types`. A quote is **stale** when it was calculated with an older revision.

---

## 4. Data model

`migrations/004_quotes.sql` creates the schema. `migrations/005_quote_defaults.sql` inserts the workbook defaults (§11), so a fresh database, including the `:memory:` one in tests, can quote without running the seed.

```sql
ALTER TABLE measurements ADD COLUMN quoting_json TEXT;   -- location-level quoting inputs from the phone (§8.6)

CREATE TABLE quote_products (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  name                         TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  use                          TEXT,
  presentation_size            REAL    NOT NULL CHECK (presentation_size > 0),
  unit                         TEXT    NOT NULL CHECK (unit IN ('L','kg')),
  published_price              REAL    NOT NULL CHECK (published_price >= 0),
  published_price_includes_vat INTEGER NOT NULL CHECK (published_price_includes_vat IN (0,1)),
  dose_per_liter               REAL    NOT NULL CHECK (dose_per_liter >= 0),
  stock_containers             REAL             CHECK (stock_containers IS NULL OR stock_containers >= 0),
  inventory_product_id         INTEGER REFERENCES products(id) ON DELETE SET NULL,
  presentation_status          TEXT,
  source_url                   TEXT,
  note                         TEXT,
  active                       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE quote_schedules (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  code                  TEXT    NOT NULL UNIQUE,
  name                  TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  service_hours_per_day REAL    NOT NULL CHECK (service_hours_per_day > 0 AND service_hours_per_day <= 24),
  night_hours_fraction  REAL    NOT NULL CHECK (night_hours_fraction BETWEEN 0 AND 1),
  includes_holidays     INTEGER NOT NULL CHECK (includes_holidays IN (0,1)),
  note TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE quote_zone_types (
  id                            INTEGER PRIMARY KEY AUTOINCREMENT,
  code                          TEXT    NOT NULL UNIQUE,
  name                          TEXT    NOT NULL COLLATE NOCASE UNIQUE,
  risk                          TEXT    NOT NULL CHECK (risk IN ('critical','semicritical','noncritical')),
  daily_rate_m2_per_hour        REAL    NOT NULL CHECK (daily_rate_m2_per_hour > 0),
  terminal_rate_m2_per_hour     REAL    NOT NULL CHECK (terminal_rate_m2_per_hour > 0),
  hours_between_low             REAL    NOT NULL CHECK (hours_between_low > 0),
  hours_between_medium          REAL    NOT NULL CHECK (hours_between_medium > 0),
  hours_between_high            REAL    NOT NULL CHECK (hours_between_high > 0),
  walls_in_terminal             INTEGER NOT NULL CHECK (walls_in_terminal IN (0,1)),
  suggested_terminals_per_month REAL    NOT NULL CHECK (suggested_terminals_per_month >= 0),
  cleaning_product_id           INTEGER NOT NULL REFERENCES quote_products(id) ON DELETE RESTRICT,
  daily_disinfectant_id         INTEGER NOT NULL REFERENCES quote_products(id) ON DELETE RESTRICT,
  terminal_disinfectant_id      INTEGER NOT NULL REFERENCES quote_products(id) ON DELETE RESTRICT,
  solution_liters_per_m2        REAL    NOT NULL CHECK (solution_liters_per_m2 >= 0),
  counts_fixtures               INTEGER NOT NULL DEFAULT 0 CHECK (counts_fixtures IN (0,1)),
  note TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE quote_location_types (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  location_type TEXT    NOT NULL UNIQUE,
  label         TEXT    NOT NULL,
  zone_type_id  INTEGER REFERENCES quote_zone_types(id) ON DELETE RESTRICT,
  updated_at    TEXT    NOT NULL
);

CREATE TABLE quote_parameters (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  revision    INTEGER NOT NULL DEFAULT 1,
  -- one REAL / INTEGER column per §3.1 field, snake_case (monthly_wage, basic_wage, …),
  -- with the §3.1 ranges as CHECK constraints; booleans are INTEGER 0/1;
  default_traffic       TEXT    CHECK (default_traffic IN ('low','medium','high')),
  default_schedule_id   INTEGER REFERENCES quote_schedules(id)  ON DELETE RESTRICT,
  default_zone_type_id  INTEGER REFERENCES quote_zone_types(id) ON DELETE RESTRICT,
  notes_json  TEXT    NOT NULL DEFAULT '{}',
  updated_by  TEXT,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE quotes (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  measurement_id            INTEGER UNIQUE REFERENCES measurements(id) ON DELETE SET NULL,
  name                      TEXT    NOT NULL,
  installation_type         TEXT    CHECK (installation_type IN ('privateHospital','publicHospital','office','mall','other')),
  city                      TEXT,
  visit_date                TEXT,                                    -- YYYY-MM-DD
  measurement_origin        TEXT    NOT NULL DEFAULT 'siteVisit' CHECK (measurement_origin IN ('siteVisit','plans','estimate')),
  assumptions_confirmed     INTEGER NOT NULL DEFAULT 0 CHECK (assumptions_confirmed IN (0,1)),
  manual_price              REAL    CHECK (manual_price IS NULL OR manual_price >= 0),
  external_reference_price  REAL    CHECK (external_reference_price IS NULL OR external_reference_price > 0),
  notes                     TEXT,
  status                    TEXT    CHECK (status IN ('needsReview','simulation')),   -- NULL until the first calculation
  calculation_state         TEXT    NOT NULL DEFAULT 'pending' CHECK (calculation_state IN ('pending','running','done','failed')),
  calculation_error         TEXT,
  input_revision            INTEGER NOT NULL DEFAULT 0,
  calculated_input_revision INTEGER,
  parameters_revision       INTEGER,                                 -- settings revision used by the last calculation
  calculated_at             TEXT,
  -- copies of result values, for list columns and sorting:
  offered_price REAL, total_cost REAL, profit REAL, margin REAL,
  margin_status TEXT CHECK (margin_status IN ('loss','belowMinimum','acceptable','healthy')),
  total_floor_area REAL, fte REAL, active_zone_count INTEGER,
  result_json   TEXT,                                                -- EngineResult (§5.13)
  snapshot_json TEXT,                                                -- settings used (§7.3)
  created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX idx_quotes_created ON quotes(created_at);
CREATE INDEX idx_quotes_status  ON quotes(status);

CREATE TABLE quote_zones (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id                   INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  position                   INTEGER NOT NULL,
  origin                     TEXT    NOT NULL CHECK (origin IN ('scan','manual')),
  room_id                    TEXT,                                   -- measurement room UUID (lowercase) for scan zones
  name                       TEXT    NOT NULL,
  zone_type_id               INTEGER REFERENCES quote_zone_types(id) ON DELETE RESTRICT,
  floor_area                 REAL,
  wall_area                  REAL,
  is_floor_approximate       INTEGER NOT NULL DEFAULT 0 CHECK (is_floor_approximate IN (0,1)),
  traffic                    TEXT    CHECK (traffic IN ('low','medium','high')),
  schedule_id                INTEGER REFERENCES quote_schedules(id) ON DELETE RESTRICT,
  days_per_month             REAL,
  terminals_per_month        REAL,                                   -- NULL = the zone type's suggestion
  fixed_posts                INTEGER NOT NULL DEFAULT 0 CHECK (fixed_posts >= 0),
  measurement_source         TEXT    NOT NULL DEFAULT 'measured' CHECK (measurement_source IN ('measured','plans','estimated')),
  observation                TEXT,
  toilets INTEGER, urinals INTEGER, sinks INTEGER,                   -- NULL = pending (workbook: empty cell)
  fixture_visits_per_day     REAL,
  minutes_per_fixture        REAL,
  solution_liters_per_fixture REAL,
  paper_soap_monthly         REAL,
  fixtures_exclude_floor     INTEGER NOT NULL DEFAULT 0 CHECK (fixtures_exclude_floor IN (0,1)),
  sources_json               TEXT    NOT NULL DEFAULT '{}',          -- { field: 'scan' | 'app' | 'default' | 'manual' }
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE (quote_id, position)
);

CREATE TABLE quote_jobs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_id     INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  kind         TEXT    NOT NULL CHECK (kind IN ('generate','recalculate','regenerate')),
  status       TEXT    NOT NULL CHECK (status IN ('pending','running','done','failed')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  run_after    TEXT    NOT NULL,
  requested_by TEXT,                                                 -- email; NULL when the trigger created it
  created_at   TEXT    NOT NULL,
  started_at   TEXT,
  finished_at  TEXT
);
CREATE INDEX idx_quote_jobs_ready ON quote_jobs(status, run_after);
CREATE UNIQUE INDEX idx_quote_jobs_one_pending ON quote_jobs(quote_id) WHERE status = 'pending';

CREATE TABLE quote_waste_controls (
  quote_id           INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  period             TEXT    NOT NULL CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  product_id         INTEGER NOT NULL REFERENCES quote_products(id) ON DELETE RESTRICT,
  actual_consumption REAL    NOT NULL CHECK (actual_consumption >= 0),
  updated_by         TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL,
  PRIMARY KEY (quote_id, period, product_id)
);

-- A new measurement is a quote job (§7.1).
CREATE TRIGGER trg_measurements_enqueue_quote AFTER INSERT ON measurements
BEGIN
  INSERT INTO quotes (measurement_id, name, visit_date, calculation_state, created_by, created_at, updated_at)
  VALUES (NEW.id, NEW.name, substr(NEW.scanned_at, 1, 10), 'pending', NEW.created_by, NEW.created_at, NEW.created_at);
  INSERT INTO quote_jobs (quote_id, kind, status, run_after, created_at)
  VALUES ((SELECT id FROM quotes WHERE measurement_id = NEW.id), 'generate', 'pending', NEW.created_at, NEW.created_at);
END;

-- Settings revision (§3.6): one trigger per event and table, for example:
CREATE TRIGGER trg_quote_products_rev_ins AFTER INSERT ON quote_products
BEGIN UPDATE quote_parameters SET revision = revision + 1; END;
-- … and the same for UPDATE and DELETE, on quote_products, quote_schedules, quote_zone_types and quote_location_types.

-- Backfill: measurements that already exist get a quote and a job.
INSERT INTO quotes (measurement_id, name, visit_date, calculation_state, created_by, created_at, updated_at)
  SELECT id, name, substr(scanned_at, 1, 10), 'pending', created_by,
         strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM measurements;
INSERT INTO quote_jobs (quote_id, kind, status, run_after, created_at)
  SELECT id, 'generate', 'pending', created_at, created_at FROM quotes;
```

- The table list above is normative. The exact `quote_parameters` column list follows §3.1, and the agent writes it out.
- Because `quote_parameters` is the target of the revision triggers, `005_quote_defaults.sql` inserts its row **before** the catalog rows. The parameter row references the default schedule by `code`, through an `UPDATE` after the schedules are inserted.
- Measurement uploads already run in one transaction (SPEC-004 §4.3). If the upload rolls back, the quote and its job roll back with it.
- Repositories map snake_case to camelCase and select columns explicitly. Lists never read `result_json` or `snapshot_json`.

---

## 5. Quote engine

### 5.1 Module

`api/src/modules/quotes/engine/` exports `computeQuote(input: EngineInput): EngineResult`. It's a pure function: no database, no clock, no randomness, no I/O. Everything it needs is in `input`. It MUST NOT use `src/lib/numbers.ts` rounding (§5.11). Each section below is its own small function, so tests can address it directly.

```ts
interface EngineInput {
  parameters: QuoteParameterValues;               // §3.1 values (no notes, no revision)
  zoneTypes: Record<number, ZoneTypeValues>;      // §3.2, keyed by id
  schedules: Record<number, ScheduleValues>;      // §3.3
  products: Record<number, ProductValues>;        // §3.4 raw fields + effectiveStock (already resolved)
  quote: { assumptionsConfirmed: boolean; manualPrice: number | null; externalReferencePrice: number | null };
  zones: ZoneInput[];                             // quote_zones in position order (§4 fields, camelCase)
}
```

**Notation.** `P` = parameters, `z` = a zone input, `T = zoneTypes[z.zoneTypeId]`, `S = schedules[z.scheduleId]`. `prod(id)` = `products[id]`. The cell after each formula is its workbook origin. Σ sums over **active** zones only (§5.4). `ceilX` is defined in §5.11.

**Product prices** (computed inside the engine, so that the snapshot fully determines the result):
`pricePerContainer(p) = p.publishedPrice / (1 + (p.publishedPriceIncludesVat ? P.purchaseVatRate : 0))`, `pricePerUnit(p) = pricePerContainer(p) / p.presentationSize`.

### 5.2 Labor base (`Calculo` D7–D12)

| Output | Formula | Cell |
|---|---|---|
| `annualLaborCost` | `P.monthlyWage × P.monthsPerYear + P.monthlyWage + P.basicWage + P.monthlyWage × P.monthsPerYear × (P.employerContributionRate + P.reserveFundRate × (P.applyReserveFund ? 1 : 0) + P.otherPayrollRate)` | D7 |
| `availableDaysPerYear` | `P.theoreticalWorkdaysPerYear − (P.nonWorkedHolidaysPerYear + P.vacationWorkdaysPerYear + P.otherAbsenceDaysPerYear)` | D8 |
| `availableHoursPerYear` | `availableDaysPerYear × P.hoursPerWorkday` | D9 |
| `hourlyCost` | `availableHoursPerYear > 0 ? annualLaborCost / availableHoursPerYear : 0` | D10 |
| `fteHoursPerMonth` | `availableHoursPerYear / P.monthsPerYear` | D11 |
| `fteMonthlyCost` | `annualLaborCost / P.monthsPerYear` | D12 |

With the defaults: 7932.5632, 235, 1880, 4.219448510638298, 156.6666…, 661.0469333…

### 5.3 Quote-level validation (`Calculo!D6`)

The quote is `simulation` only when **all** of these hold. Otherwise it's `needsReview`, and `causes` lists every failing condition with its code (§5.10):

| Condition | Cause code |
|---|---|
| `quote.assumptionsConfirmed` | `ASSUMPTIONS_NOT_CONFIRMED` |
| At least one active zone | `NO_ACTIVE_ZONES` |
| No zone has a zone-level cause (§5.4) | (the zone causes themselves) |
| No zone has a fixture cause (§5.5), whether the zone is active or not | (the fixture causes themselves) |
| `P.targetMargin < 1` | `TARGET_MARGIN_INVALID` |
| `0 ≤ P.minimumMargin ≤ P.targetMargin` | `MINIMUM_MARGIN_INVALID` |
| `P.productiveFraction > 0` | `PRODUCTIVE_FRACTION_INVALID` |
| `P.operatorsPerSupervisor > 0` | `OPERATORS_PER_SUPERVISOR_INVALID` |
| `availableHoursPerYear > 0` | `NO_AVAILABLE_HOURS` |

The API rejects most of the parameter cases on input. The engine checks them anyway, because it can be fed an older snapshot. Whenever a divisor among these is zero or invalid, the formula that uses it yields 0 instead of `Infinity` or `NaN`. The result MUST NOT contain a non-finite number.

### 5.4 Zone validation and activation (`Calculo` E–F)

A zone is **active** when all of these hold. Otherwise it's inactive: every per-zone number is 0, it's left out of every Σ, and it carries its causes.

| Condition | Cause code |
|---|---|
| `z.zoneTypeId` is set and present in `zoneTypes` | `ZONE_TYPE_MISSING` |
| `z.floorArea > 0` | `ZONE_FLOOR_AREA_MISSING` |
| `z.traffic` ∈ `low`, `medium`, `high` | `ZONE_TRAFFIC_MISSING` |
| `z.scheduleId` is set and present in `schedules` | `ZONE_SCHEDULE_MISSING` |
| `0 < z.daysPerMonth ≤ 31` | `ZONE_DAYS_INVALID` |

### 5.5 Sanitary fixtures (`Sanitarios` K–O)

Evaluated for every zone:

- `fixtureCount = (z.toilets ?? 0) + (z.urinals ?? 0) + (z.sinks ?? 0)` (K)
- `fixturesOk` (O = "OK") when all of these hold. Each failing condition adds its cause to the zone:

  | Condition | Cause code |
  |---|---|
  | `toilets`, `urinals` and `sinks` are all non-null integers ≥ 0 | `FIXTURE_COUNTS_MISSING` |
  | `z.paperSoapMonthly` is non-null and ≥ 0 | `FIXTURE_PAPER_SOAP_MISSING` |
  | `fixtureCount = 0`, or `fixtureVisitsPerDay`, `minutesPerFixture` and `solutionLitersPerFixture` are all non-null and > 0 | `FIXTURE_ASSUMPTIONS_MISSING` |
  | `fixtureCount = 0`, or `z.fixturesExcludeFloor` | `FIXTURE_DOUBLE_COUNT_UNCONFIRMED` |

- `fixtureHours = fixturesOk && fixtureCount > 0 ? fixtureCount × z.daysPerMonth × visits × minutes / 60 / P.productiveFraction : 0` (L)
- `fixtureSolutionLiters = fixturesOk && fixtureCount > 0 ? fixtureCount × z.daysPerMonth × visits × litersPerFixture : 0` (M)
- `fixturePaperSoap = fixturesOk ? z.paperSoapMonthly : 0` (used in AM)

A fixture cause makes the quote Revisar, but it **doesn't** deactivate the zone. The zone is quoted without its fixture work, as in the workbook.

### 5.6 Per-zone computation (`Calculo` G–AW, active zones)

| Output | Formula | Cell |
|---|---|---|
| `risk` | `T.risk` | G |
| `floorArea` | `z.floorArea` | H |
| `wallArea` | `z.wallArea ?? 0` | I |
| `serviceHoursPerDay` | `S.serviceHoursPerDay` | L |
| `daysPerMonth` | `z.daysPerMonth` | M |
| `hoursBetweenCleanings` | `T.hoursBetweenCleanings[z.traffic]` | N |
| `cleaningsPerDay` | `max(1, ceilX(serviceHoursPerDay / hoursBetweenCleanings))` | O |
| `cleaningsPerMonth` | `cleaningsPerDay × daysPerMonth` | P |
| `terminalsPerMonth` | `z.terminalsPerMonth ?? T.suggestedTerminalsPerMonth` | Q |
| `terminalArea` | `floorArea + (T.wallsInTerminal ? wallArea : 0)` | R |
| `dailyCleaningHours` | `floorArea × cleaningsPerMonth / T.dailyRateM2PerHour / P.productiveFraction + fixtureHours` | S |
| `terminalHours` | `terminalArea × terminalsPerMonth / T.terminalRateM2PerHour / P.productiveFraction` | T |
| `taskHours` | `dailyCleaningHours + terminalHours` | U |
| `presenceHours` | `z.fixedPosts × serviceHoursPerDay × daysPerMonth` | V |
| `billableHours` | `max(taskHours, presenceHours)` | W |
| `nightFraction` | `S.nightHoursFraction` | X |
| `holidayFraction` | `S.includesHolidays ? P.nationalHolidaysPerYear / 365 : 0` | Y |
| `laborCost` | `billableHours × hourlyCost × (1 + nightFraction × P.nightSurchargeRate + holidayFraction × P.holidaySurchargeRate)` | Z |
| `fte` | `fteHoursPerMonth > 0 ? billableHours / fteHoursPerMonth : 0` | AA |
| `m2PerPersonInService` | `billableHours > 0 ? floorArea × daysPerMonth × serviceHoursPerDay / billableHours : 0` | AB |
| `dailySolutionLiters` | `floorArea × cleaningsPerMonth × T.solutionLitersPerM2 + fixtureSolutionLiters` | AC |
| `terminalSolutionLiters` | `terminalArea × terminalsPerMonth × T.solutionLitersPerM2` | AD |
| `cleaningProductId` | `T.cleaningProductId` | AE |
| `cleaningConcentrate` | `(dailySolutionLiters + terminalSolutionLiters) × prod(T.cleaningProductId).dosePerLiter / 1000` (L or kg) | AF |
| `dailyDisinfectantId` | `T.dailyDisinfectantId` | AG |
| `dailyDisinfectantConcentrate` | `dailySolutionLiters × prod(T.dailyDisinfectantId).dosePerLiter / 1000` | AH |
| `terminalDisinfectantId` | `T.terminalDisinfectantId` | AI |
| `terminalDisinfectantConcentrate` | `terminalSolutionLiters × prod(T.terminalDisinfectantId).dosePerLiter / 1000` | AJ |
| `chemicalsTheoretical` | `cleaningConcentrate × pricePerUnit(cleaning) + dailyDisinfectantConcentrate × pricePerUnit(daily) + terminalDisinfectantConcentrate × pricePerUnit(terminal)` | AK |
| `chemicalsWithWaste` | `chemicalsTheoretical × (1 + P.targetWasteRate)` | AL |
| `eppAndHygiene` | `fte × (P.baseEppPerFte + (risk = critical ? P.criticalEppPerFte : 0)) + fixturePaperSoap` | AM |
| `utensils` | `floorArea / P.mopCoverageM2 × P.mopCost × P.mopReplacementsPerMonth` | AN |
| `directCost` | `laborCost + chemicalsWithWaste + eppAndHygiene + utensils` | AO |
| `allocatedIndirect` | `Σ directCost > 0 ? directCost / Σ directCost × indirectToAllocate : 0` | AP |
| `totalCost` | `directCost + allocatedIndirect` | AQ |
| `targetPrice` | `P.targetMargin < 1 ? totalCost / (1 − P.targetMargin) : 0` | AR |
| `costPerM2` | `floorArea > 0 ? totalCost / floorArea : 0` | AS |
| `pricePerM2` | `floorArea > 0 ? targetPrice / floorArea : 0` | AT |
| `flatRateRevenue` | `floorArea × flatRate` (§5.8) | AU |
| `flatRateMargin` | `flatRateRevenue > 0 ? (flatRateRevenue − totalCost) / flatRateRevenue : null` | AV |
| `flatRateStatus` | `null` when `flatRateMargin` is null; `loss` when < 0; `belowMinimum` when < `P.minimumMargin`; otherwise `ok` | AW |

Each zone result also carries `fixtures: { count, ok, hours, solutionLiters, paperSoap }`, `active`, and its `causes`.

### 5.7 Costs and price (`Calculo` D41–D71)

| Output | Formula | Cell |
|---|---|---|
| `laborCost` | `Σ laborCost` | D41 |
| `chemicalsTheoretical` | `Σ chemicalsTheoretical` | D42 |
| `chemicalsWaste` | `Σ chemicalsWithWaste − Σ chemicalsTheoretical` | D43 |
| `eppAndHygiene` | `Σ eppAndHygiene` | D44 |
| `utensils` | `Σ utensils` | D45 |
| `directCost` | D41 + D42 + D43 + D44 + D45 | D46 |
| `supervision` | `P.operatorsPerSupervisor > 0 ? Σ fte / P.operatorsPerSupervisor × P.supervisorMonthlyCost : 0` | D47 |
| `equipment`, `transport`, `insurance` | `P.equipmentMonthly`, `P.transportMonthly`, `P.insuranceMonthly` | D48–D50 |
| `operatingCost` | D46 + D47 + D48 + D49 + D50 | D51 |
| `administration` | `operatingCost × P.administrationRate` | D52 |
| `contingency` | `(operatingCost + administration) × P.contingencyRate` | D53 |
| `totalCost` | D51 + D52 + D53 | D54 |
| `indirectToAllocate` | `totalCost − directCost` | D55 |
| `targetPrice` | `P.targetMargin < 1 ? totalCost / (1 − P.targetMargin) : 0` | D59 |
| `minimumPrice` | `P.minimumMargin < 1 ? totalCost / (1 − P.minimumMargin) : 0` | D61 |
| `breakEvenPrice` | `totalCost` | D62 |
| `offeredPrice` | `quote.manualPrice ?? targetPrice`; `isManualPrice = quote.manualPrice !== null` | D63 |
| `profit` | `offeredPrice − totalCost` | D64 |
| `margin` | `offeredPrice > 0 ? profit / offeredPrice : 0` | D65 |
| `marginStatus` | `loss` if `margin < 0`; `belowMinimum` if `margin < P.minimumMargin − 0.00001`; `acceptable` if `margin < P.targetMargin − 0.00001`; otherwise `healthy` | D66 |
| `vat` | `offeredPrice × P.vatRate` | D67 |
| `totalWithVat` | `offeredPrice + vat` | D68 |
| `annualProfit` | `profit × P.monthsPerYear` | D69 |
| `pricePerM2` | `Σ floorArea > 0 ? offeredPrice / Σ floorArea : 0` | D70 |
| `negotiationRoom` | `max(0, offeredPrice − minimumPrice)` | D71 |

The fixed costs (D48–D50) apply even with no active zones. In that case the totals equal the empty workbook's: cost 127.05, target price 195.461538… (Appendix A.3).

### 5.8 Staffing, chemicals, comparisons, breakdown

| Output | Formula | Cell |
|---|---|---|
| `staffing.personHours` | `Σ billableHours` | D74 |
| `staffing.fte` | `Σ fte` | D75 |
| `staffing.peopleToHire` | `ceilX(Σ fte)` | D76 |
| `staffing.supervisors` | `P.operatorsPerSupervisor > 0 ? Σ fte / P.operatorsPerSupervisor : 0` | D77 |
| `chemicals.withWaste` | D42 + D43 | D81 |
| `chemicals.uncontrolledWasteCost` | `chemicalsTheoretical × P.uncontrolledWasteRate` | D82 |
| `chemicals.controlledWasteCost` | D43 | D83 |
| `chemicals.monthlyWasteSavings` | D82 − D83 | D84 |
| `chemicals.annualWasteSavings` | `D84 × P.monthsPerYear` | D85 |
| `chemicals.shareOfCost` | `totalCost > 0 ? D81 / totalCost : 0` | D86 |
| `flatRate.rate` | `P.flatRatePerM2 > 0 ? P.flatRatePerM2 : 0` | D89 |
| `flatRate.revenue` | `Σ flatRateRevenue` | D90 |
| `flatRate.margin` | `revenue > 0 ? (revenue − totalCost) / revenue : 0` | D91 |
| `flatRate.zonesAtLoss` | `rate > 0 ? count(flatRateStatus = loss) : null` | D92 |
| `flatRate.zonesBelowMinimum` | `count(flatRateStatus = belowMinimum)` | D93 |
| `reference.price` | `quote.externalReferencePrice` | `Cotizacion!D11` |
| `reference.difference` | `price > 0 ? offeredPrice − price : null` | `Cotizacion!D12` |
| `reference.relativeDifference` | `price > 0 ? offeredPrice / price − 1 : null` | `Cotizacion!D17` |

The external reference only compares. It MUST NOT change any cost (`LEER v3` item 11).

**"¿A dónde va cada dólar?"** (`Cotizacion` 41–49): `breakdown` is an ordered list of `{ key, amount, share }`, where `share = offeredPrice > 0 ? amount / offeredPrice : null`:

| `key` | Amount |
|---|---|
| `labor` | D41 |
| `chemicals` | D42 + D43 |
| `eppAndHygiene` | D44 |
| `utensils` | D45 |
| `supervision` | D47 |
| `fixed` | D48 + D49 + D50 |
| `administrationAndContingency` | D52 + D53 |
| `profit` | D64 |

The amounts add up to `offeredPrice`, and the shares to 1.

**Totals row** (`Calculo` row 37): `totals` holds Σ of `floorArea`, `wallArea`, `cleaningsPerMonth`, `terminalArea`, `dailyCleaningHours`, `terminalHours`, `taskHours`, `presenceHours`, `billableHours`, `laborCost`, `fte`, `dailySolutionLiters`, `terminalSolutionLiters`, the three concentrates, `chemicalsTheoretical`, `chemicalsWithWaste`, `eppAndHygiene`, `utensils`, `directCost`, `allocatedIndirect`, `totalCost`, `targetPrice` and `flatRateRevenue`.

### 5.9 Purchase plan, technical offer and waste control

**Purchase plan** (`Productos` 20–30). One row per product whose `theoretical > 0`, in product-name order:

| Output | Formula | Cell |
|---|---|---|
| `theoretical` | Σ over active zones of `cleaningConcentrate` where the zone's cleaning product is this product, plus `dailyDisinfectantConcentrate` where its daily disinfectant is, plus `terminalDisinfectantConcentrate` where its terminal disinfectant is (L or kg) | D |
| `waste` | `theoretical × P.targetWasteRate` | E |
| `total` | `theoretical + waste` | F |
| `containers` | `ceilX(total / presentationSize)` | G |
| `stock` | `effectiveStock` | H |
| `toBuy` | `max(0, containers − stock)` | I |
| `purchaseCost` | `toBuy × pricePerContainer` | J |
| `wasteCost` | `waste × pricePerUnit` | K |

Each row also carries `productId`, `name`, `unit`, `presentationSize`, `pricePerContainer` and `pricePerUnit`. The plan carries `totalPurchaseCost` (Σ J) and `totalWasteCost` (Σ K). The purchase cost is informational: the price uses consumption × price per unit (D42), not whole containers.

**Technical offer** (`Oferta tecnica`). One row per active zone:

| Output | Formula |
|---|---|
| `zoneId`, `name`, `zoneTypeName`, `risk`, `scheduleName` | from the inputs |
| `hoursBetweenCleanings`, `cleaningsPerDay` | N, O. The UI renders "Cada {N} h · {O} por día", with N formatted with no decimals, as `TEXT(N,"0")` does. |
| `terminalsPerMonth` | Q |
| `cleaningProduct`, `dailyDisinfectant`, `terminalDisinfectant` | `{ productId, name, dosePerLiter, doseUnit }` each |
| `solutionPerDailyCleaning` | `cleaningsPerMonth > 0 ? dailySolutionLiters / cleaningsPerMonth : 0` (L; it includes fixture solution, as the workbook does) |
| `disinfectantPerCleaning` | `solutionPerDailyCleaning × prod(dailyDisinfectantId).dosePerLiter` (ml or g) |
| `fte` | AA |

**Waste control** (`Productos` 35–45) isn't part of the engine run. It's computed when it's read (§8.4), from the quote's stored `purchasePlan` and the parameters in its snapshot. For each purchase-plan row and a given month, with `actual` from `quote_waste_controls`:

- `realWasteRate = actual !== null && theoretical > 0 ? actual / theoretical − 1 : null` (F)
- `excess = realWasteRate !== null ? max(0, actual − theoretical × (1 + P.targetWasteRate)) : null` (G)
- `excessCost = excess !== null ? excess × pricePerUnit : null` (H)
- `status`: `noData` when `realWasteRate` is null; `ok` when ≤ `P.targetWasteRate`; `watch` when ≤ 2 × `P.targetWasteRate`; otherwise `alert` (I)
- `totalExcessCost = Σ excessCost` (H45)

### 5.10 Causes and warnings

Every cause and warning is `{ code, zoneIndex?: number, params?: Record<string, string | number> }`, where `zoneIndex` is the zone's position. The API sends codes. The web translates them (`src/i18n/quotes.ts`), and a test checks that every code has a message.

| Cause | Spanish message |
|---|---|
| `ASSUMPTIONS_NOT_CONFIRMED` | Confirma que revisaste los supuestos para habilitar la simulación. |
| `NO_ACTIVE_ZONES` | No hay ninguna zona completa. |
| `TARGET_MARGIN_INVALID` | El margen objetivo debe ser menor que 100 %. |
| `MINIMUM_MARGIN_INVALID` | El margen mínimo debe estar entre 0 y el margen objetivo. |
| `PRODUCTIVE_FRACTION_INVALID` | La fracción productiva debe ser mayor que cero. |
| `OPERATORS_PER_SUPERVISOR_INVALID` | Los operarios por supervisor deben ser más de cero. |
| `NO_AVAILABLE_HOURS` | Las horas disponibles por año deben ser más de cero. |
| `ZONE_TYPE_MISSING` | {zona}: falta el tipo de zona. |
| `ZONE_FLOOR_AREA_MISSING` | {zona}: la superficie de piso debe ser mayor que cero. |
| `ZONE_TRAFFIC_MISSING` | {zona}: falta el tráfico. |
| `ZONE_SCHEDULE_MISSING` | {zona}: falta el horario. |
| `ZONE_DAYS_INVALID` | {zona}: los días por mes deben ser mayores que 0 y como máximo 31. |
| `FIXTURE_COUNTS_MISSING` | {zona}: faltan las cantidades de aparatos sanitarios (escribe 0 si no hay). |
| `FIXTURE_PAPER_SOAP_MISSING` | {zona}: falta el costo de papel y jabón (escribe 0 si no aplica). |
| `FIXTURE_ASSUMPTIONS_MISSING` | {zona}: faltan atenciones por día, minutos y litros por aparato. |
| `FIXTURE_DOUBLE_COUNT_UNCONFIRMED` | {zona}: confirma que los tiempos de aparatos no repiten la limpieza del piso. |

Warnings never change the status:

| Warning | When | Spanish message | Workbook |
|---|---|---|---|
| `FLAT_RATE_ZONES_AT_LOSS` | `zonesAtLoss > 0` | Con una tarifa plana de {tarifa} por m², {n} zona(s) pierden dinero. Cotiza por zona. | `Cotizacion!C83` |
| `OFFERED_MARGIN_BELOW_MINIMUM` | `margin < P.minimumMargin` | El precio ofertado deja el margen bajo el mínimo: no conviene firmar así. | C84 |
| `WALLS_MISSING` | active zone, `T.wallsInTerminal`, `z.wallArea === null` | {zona}: paredes no informadas; se calculan como cero. | C85 |
| `FLOOR_AREA_APPROXIMATE` | `z.isFloorApproximate` | {zona}: la superficie del piso es aproximada. | — |
| `FIXTURES_DETECTED` | the zone's fixture counts have source `scan` (§6.3) | {zona}: aparatos contados a partir del escaneo; confírmalos. | — |
| `CRITICAL_DENSITY_ABOVE_LIMIT` | a critical active zone has `m2PerPersonInService > 250` | {zona}: más de 250 m² por persona en zona crítica (referencia SERCOP). | `Pruebas!D20–D21` |
| `GENERAL_DENSITY_ABOVE_LIMIT` | over non-critical active zones with `serviceHoursPerDay > 8`, `Σ(floorArea × days × hours) / Σ billableHours > 630` | Más de 630 m² por persona en zonas generales (referencia SERCOP). | `Pruebas!D22` |
| `RISK_ORDER_INCOHERENT` | each of the three risk levels has floor area, and the average cost per m² isn't strictly critical > semicritical > noncritical | El costo por m² no crece con el riesgo sanitario. | `Pruebas!D14–D17` |

The job adds two warnings while it derives the zones (§6): `SCHEDULE_CODE_UNKNOWN` ("El horario enviado por la app ({código}) no existe; se usó el predeterminado.") and `GEOMETRY_UNAVAILABLE` ("No se pudo leer la geometría: faltan paredes y aparatos detectados."). They're stored in `result.warnings` together with the engine's warnings.

The UI also always shows the workbook's fixed notes as text, not as warnings: "No equivale a oferta validada." next to the status, and "El ahorro por merma es hipotético: no hay consumo real medido." in the chemicals section.

### 5.11 Numeric rules

- **No intermediate rounding.** IEEE-754 doubles throughout, as the workbook does ("sin redondeos intermedios"). This supersedes SPEC-002 §5.1 for the engine. Results are stored unrounded, and only the UI rounds, for display.
- `ceilX(x) = Math.ceil(round(x, 9))`, with `round` from `src/lib/numbers.ts`. This reproduces Excel's `ROUNDUP(x, 0)` on values that are integers up to float error. For example, `7.6 / 3.8` gives `2.0000000000000004` in JavaScript, but `ROUNDUP` gives 2, and so MUST `ceilX`.
- The margin status uses the workbook's 0.00001 tolerance (D66). The other comparisons are exact.
- No output is `NaN` or `±Infinity`. Every division is guarded as written above.
- Zone inputs are values, not intermediate results: the API stores them as entered (§8.2), and the derived wall area is rounded to 3 decimals (§6.2).

### 5.12 Deviations from the workbook

| # | Workbook behavior | Here | Why |
|---|---|---|---|
| 1 | `Calculo` S, AC and AM add `Sanitarios` hours, litres and paper even to inactive zones. | Inactive zones contribute nothing. | It only shows when the quote is REVISAR, which the workbook doesn't publish. Here preliminary figures are shown (§2), so they must not include work for a zone that isn't quoted. |
| 2 | `Cotizacion` hides every figure unless `Calculo!D6 = OK`. | Figures are stored and shown as "Preliminar". | §2 |
| 3 | The purchase plan lists every product. | Only products with `theoretical > 0`. | Rows of zeros carry no information. |
| 4 | `Pruebas!D11` compares the purchases with `Calculo!D80`, which v3 left empty, so the check reads 37.184 instead of 0. | The invariant is Σ `purchasePlan.theoretical` = Σ the three concentrates over zones (§12.1). | It's a bug in the workbook. |
| 5 | `Calculo!AW` shows "OK" for active zones when there is no flat rate (text compared with a number). | `flatRateStatus` is `null` without a flat rate. | "OK" without a rate is meaningless. |
| 6 | A missing lookup gives `#N/A`. | Causes, so a missing reference is Revisar instead of an error. | |
| 7 | A `Sanitarios` row is tied to its zone by row position. | Fixtures are columns of the zone. | It can't drift. |
| 8 | Stock is typed in by hand. | It can come from the inventory (§3.4). | Option chosen for this spec. |
| 9 | `Calculo!F89` says the flat rate falls back to the contract's average price per m². | The formula only uses the parameter. | The spec follows the formula. The comment is outdated. |
| 10 | `Sanitarios!N` ("Sin doble conteo") is entered per zone. | Per zone, prefilled from `fixtureDefaultsExcludeFloor` when the zone uses the default fixture assumptions. | It's the same statement about the same assumption values. |
| 11 | Up to 20 zones. | Up to 100 zones (the measurement's room limit). | |

`Entradas` D7 (installation type), D8 (city), D9 (date) and D10 (main measurement) are case metadata. Like in the workbook, they don't enter any formula.

### 5.13 Result shape

`quotes.result_json` stores this. `GET /api/quotes/:id` returns it as `result`.

```ts
interface EngineResult {
  engineVersion: 1;
  status: 'needsReview' | 'simulation';
  causes: Issue[];
  warnings: Issue[];
  labor: { annualLaborCost: number; availableDaysPerYear: number; availableHoursPerYear: number;
           hourlyCost: number; fteHoursPerMonth: number; fteMonthlyCost: number };
  zones: ZoneResult[];            // one per input zone, same order, active or not
  totals: Record<string, number>; // §5.8 totals row
  costs: { laborCost; chemicalsTheoretical; chemicalsWaste; eppAndHygiene; utensils; directCost; supervision;
           equipment; transport; insurance; operatingCost; administration; contingency; totalCost; indirectToAllocate };
  pricing: { targetMargin; targetPrice; minimumMargin; minimumPrice; breakEvenPrice; offeredPrice; isManualPrice: boolean;
             profit; margin; marginStatus: 'loss' | 'belowMinimum' | 'acceptable' | 'healthy';
             vat; totalWithVat; annualProfit; pricePerM2; negotiationRoom };
  staffing: { personHours; fte; peopleToHire; supervisors };
  chemicals: { withWaste; uncontrolledWasteCost; controlledWasteCost; monthlyWasteSavings; annualWasteSavings; shareOfCost };
  flatRate: { rate; revenue; margin; zonesAtLoss: number | null; zonesBelowMinimum: number };
  reference: { price: number | null; difference: number | null; relativeDifference: number | null };
  breakdown: { key: string; amount: number; share: number | null }[];
  purchasePlan: { rows: PurchasePlanRow[]; totalPurchaseCost: number; totalWasteCost: number };
  technicalOffer: TechnicalOfferRow[];
}
```

(Fields without a type are `number`.) `engineVersion` lets a future engine change tell old results apart. Bump it when a formula changes.

---

## 6. From a measurement to zone inputs

A `generate` or `regenerate` job builds the quote's inputs from the measurement. There is one zone per room, in `rooms[].index` order, with `origin: 'scan'` and `roomId` set. For each field, the first source in the list that has a value wins, and its tag is recorded in `sources`.

| Zone field | Sources, in order (tag) |
|---|---|
| `name` | `rooms[].name` (scan) |
| `zoneTypeId` | the equivalence of `rooms[].locationType` (app) → the equivalence of `rooms[].type`, RoomPlan's detected type, whose five values are also `LocationType` raw values (scan) → `P.defaultZoneTypeId` (default) → `null` |
| `floorArea`, `isFloorApproximate` | `rooms[].floorArea`, `rooms[].isFloorApproximate` (scan). A null area stays null and yields a cause. |
| `wallArea` | net wall area from the geometry (§6.2) (scan) → `null` |
| `traffic` | `rooms[].quoting.traffic` (app) → `quoting.traffic` (app) → `P.defaultTraffic` (default) → `null` |
| `scheduleId` | the **active** schedule whose `code` is `quoting.scheduleCode` (app) → `P.defaultScheduleId` (default) → `null`. An unknown or inactive code adds `SCHEDULE_CODE_UNKNOWN`. |
| `daysPerMonth` | `quoting.daysPerMonth` (app) → `P.defaultDaysPerMonth` (default) → `null` |
| `terminalsPerMonth` | `null`, meaning the zone type's suggestion |
| `fixedPosts` | `rooms[].quoting.fixedPosts` (app) → 0 (default) |
| `measurementSource` | `measured` (scan) |
| `toilets`, `urinals`, `sinks` | `rooms[].quoting.fixtures` (app) → when the resolved zone type has `countsFixtures`: detected objects (§6.3) (scan) → `0, 0, 0` (default) |
| `fixtureVisitsPerDay`, `minutesPerFixture`, `solutionLitersPerFixture` | fixture count 0: `null`. Otherwise `P.defaultFixtureVisitsPerDay`, `P.defaultMinutesPerFixture` and `P.defaultSolutionLitersPerFixture` (default), which may be null. |
| `paperSoapMonthly` | fixture count 0: `0` (default). Otherwise `P.defaultPaperSoapPerFixtureMonthly × count` (default), or `null` when the parameter is null. |
| `fixturesExcludeFloor` | fixture count 0: `false`. Otherwise `P.fixtureDefaultsExcludeFloor` (default). |

Quote-level fields on `generate`: `name` = the measurement name, which the trigger already set; `visitDate` = the date part of `scannedAt`, also from the trigger; `measurementOrigin: 'siteVisit'`. The rest stay at their column defaults. `regenerate` replaces only the zones and keeps the quote-level fields.

### 6.1 Notes

- `quoting` is the measurement's `quoting_json` (§8.6). Fields the phone didn't send are absent and fall through to the next source.
- Equivalences, zone types and schedules are read when the job runs. Changing an equivalence later doesn't affect existing quotes until someone runs **Regenerar**.

### 6.2 Net wall area

For the geometry room with the same id (case-insensitive):

`wallArea = round(max(0, Σ walls (w × h) − Σ doors, windows and openings (w × h)), 3)`, where `w = dimensions[0]` and `h = dimensions[1]`.

Use the room's own surfaces, not `merged` (merged surfaces don't belong to a room). A room with no walls gets `null`. For the SPEC-004 §7 fixture: Sala 45 − 3.6 − 1.92 = **39.48**, and Dormitorio 37.5 − 1.8 − 1.44 = **34.26**.

### 6.3 Detected fixtures

When the zone type has `countsFixtures`, and the phone didn't send fixtures: `toilets` = the number of the room's objects with category `toilet`, `sinks` = the number with category `sink`, and `urinals = 0` (RoomPlan has no urinal category). The source is `scan`, which adds `FIXTURES_DETECTED`. `bathtub` isn't counted.

### 6.4 Missing geometry

If the geometry file is missing or can't be parsed, `wallArea` is `null` and no fixtures are detected. Add `GEOMETRY_UNAVAILABLE` and continue. Missing geometry never fails the job.

---

## 7. Quote jobs

### 7.1 Enqueueing

- **New measurement:** the trigger in §4 creates the quote (`calculation_state 'pending'`) and a `generate` job.
- **Edits and actions:** `PUT /api/quotes/:id` and `POST …/recalculate` enqueue `recalculate`. `POST …/regenerate` enqueues `regenerate`. The enqueue runs in the same transaction as the edit. It sets `quotes.calculation_state = 'pending'` and increments `input_revision` on edits.
- **One pending job per quote** (partial unique index). Enqueueing when a pending job exists upgrades it instead of adding one (`INSERT … ON CONFLICT (quote_id) WHERE status = 'pending' DO UPDATE`). The kind becomes the stronger of the two, with `generate` > `regenerate` > `recalculate`, and `run_after` resets to now.
- After an API request enqueues a job, it calls `worker.nudge()` [P1], so the job runs without waiting for the next poll.

### 7.2 Worker

`api/src/modules/quotes/worker.ts` exports `createQuoteWorker({ db, logger, config, compute = computeQuote })`, which has `start()`, `stop()`, `nudge()` and `processNextJob(): boolean`.

- `server.ts` starts it after migrations and the initial user, when `QUOTE_WORKER=on`. Graceful shutdown stops it, and a job in progress finishes first.
- **Startup recovery:** jobs left in `running` go back to `pending`, and their quotes to `pending`.
- **Claim:** `UPDATE quote_jobs SET status='running', started_at=:now, attempts=attempts+1 WHERE id = (SELECT id FROM quote_jobs WHERE status='pending' AND run_after <= :now ORDER BY run_after, id LIMIT 1) RETURNING *`.
- **Process:** inside one `db.transaction`:
  1. Load the quote. If it's gone (deleted), mark the job `done`.
  2. `generate` on a quote that already has zones behaves like `recalculate`. `generate` or `regenerate` without a measurement (`measurement_id` null) fails permanently with `MEASUREMENT_DELETED`.
  3. For `generate` and `regenerate`: read the measurement's `rooms_json`, `quoting_json` and its geometry file, derive the zones (§6), and replace the quote's zones.
  4. Build the `EngineInput`. The settings are read now: the parameters, plus the zone types, schedules and products the zones reference, including the products the zone types reference. Resolve `effectiveStock`.
  5. `compute(input)`.
  6. Write `result_json`, `snapshot_json`, `status`, the summary columns, `parameters_revision` = the current revision, `calculated_input_revision` = `input_revision`, `calculated_at`, `calculation_state = 'done'` and `calculation_error = null`. Mark the job `done`.
- **Failure:** any thrown error rolls back that transaction. Then, outside it, the job gets `last_error`, and either goes back to `pending` with `run_after = now + min(5 s × 2^(attempts − 1), 5 min)`, or becomes `failed` after `QUOTE_JOB_MAX_ATTEMPTS` attempts. A failed job sets `quotes.calculation_state = 'failed'` and `calculation_error`. A REVISAR result is **not** a failure.
- `processNextJob` returns whether it processed a job, so tests and the seed can drain the queue synchronously (`while (worker.processNextJob()) {}`).
- `snapshot_json` = `{ parametersRevision, parameters, zoneTypes, schedules, products }`: the exact settings part of the `EngineInput`. Recomputing a stored snapshot with the stored zones MUST reproduce `result_json` exactly (§12.1).

### 7.3 Configuration (SPEC-002 §6.2 table)

| Variable | Default | Rules |
|---|---|---|
| `QUOTE_WORKER` | `on` | `on` or `off`. The test helper sets `off`, and tests drive `processNextJob`. |
| `QUOTE_WORKER_POLL_MS` | `1000` | Integer from 100 to 60000 |
| `QUOTE_JOB_MAX_ATTEMPTS` | `5` | Integer from 1 to 20 |

Add them to `api/.env.example` with one-line comments.

### 7.4 Logging

For each job, log one line with the job id, the kind, the quote id, the outcome (`done`, `retry`, `failed`), the duration in ms and the status. Never log the result or the settings.

---

## 8. API

All routes are under `/api`, behind `requireAuth`, and follow the SPEC-002 conventions. Every active user can do everything (SPEC-003 has no roles).

### 8.1 Settings

| Route | Notes |
|---|---|
| `GET` / `PUT /api/quote-parameters/1` | §3.1. Any other id → 404. |
| `/api/quote-zone-types`, `/api/quote-schedules`, `/api/quote-products` | Standard resources (§3.2–§3.4) |
| `GET /api/quote-location-types`, `GET` / `PUT /api/quote-location-types/:id` | §3.5. Only `zoneTypeId` is writable. |

A referenced id that doesn't exist → 422 with the field named. A newly referenced zone type, schedule or product that is inactive → 422 "Must be active". References that already exist stay valid.

### 8.2 Quotes

Standard resource `/api/quotes` (list, getOne, update, delete; there is no `POST /api/quotes`, because quotes come from measurements).

| Content-Range name | Sortable fields | Default sort | Filter keys (besides `id`, `q`) | `q` searches |
|---|---|---|---|---|
| `quotes` | `id`, `name`, `status`, `offeredPrice`, `totalCost`, `margin`, `totalFloorArea`, `fte`, `calculatedAt`, `createdAt`, `updatedAt` | `createdAt DESC` | `status`, `calculationState`, `measurementId`, `isStale`, `createdAt_gte`, `createdAt_lte` | `name`, `city`, `notes`, `createdBy` |

**Record** (the list omits `zones`, `result` and `snapshot`):

```json
{
  "id": 7,
  "measurementId": 12,
  "name": "Clínica de prueba",
  "installationType": "privateHospital",
  "city": "Guayaquil",
  "visitDate": "2026-10-16",
  "measurementOrigin": "siteVisit",
  "assumptionsConfirmed": true,
  "manualPrice": null,
  "externalReferencePrice": 3500,
  "notes": null,
  "status": "simulation",
  "calculation": { "state": "done", "error": null, "calculatedAt": "2026-10-16T18:21:41.002Z",
                   "parametersRevision": 1, "isStale": false, "inputRevision": 3, "isCurrent": true },
  "summary": { "offeredPrice": 9907.389968, "totalCost": 6439.803479, "profit": 3467.586489, "margin": 0.35,
               "marginStatus": "healthy", "totalFloorArea": 248, "fte": 5.925807, "activeZoneCount": 4, "zoneCount": 4 },
  "zones": [
    { "id": 31, "position": 0, "origin": "scan", "roomId": "…", "name": "Quirófano 1", "zoneTypeId": 10,
      "floorArea": 36, "wallArea": 72, "isFloorApproximate": false, "traffic": "medium", "scheduleId": 4,
      "daysPerMonth": 30, "terminalsPerMonth": null, "fixedPosts": 1, "measurementSource": "measured", "observation": null,
      "toilets": 0, "urinals": 0, "sinks": 0, "fixtureVisitsPerDay": null, "minutesPerFixture": null,
      "solutionLitersPerFixture": null, "paperSoapMonthly": 0, "fixturesExcludeFloor": false,
      "sources": { "zoneTypeId": "app", "floorArea": "scan", "traffic": "manual" } }
  ],
  "result": { "engineVersion": 1, "…": "§5.13" },
  "snapshot": { "parametersRevision": 1, "…": "§7.2" },
  "createdBy": "admin@example.com",
  "createdAt": "…",
  "updatedAt": "…"
}
```

`calculation.isStale` = `parametersRevision < current revision`. `calculation.isCurrent` = `calculatedInputRevision === inputRevision`. `summary` holds `null`s until the first calculation.

**`PUT /api/quotes/:id`** (merge semantics):

- Writable quote fields: `name` (required, 1–100), `installationType` (enum or null), `city` (≤ 100), `visitDate` (`YYYY-MM-DD` or null), `measurementOrigin`, `assumptionsConfirmed`, `manualPrice` (null or ≥ 0), `externalReferencePrice` (null or > 0), `notes` (≤ 2000).
- `zones`, when present, **replaces the zone list**. An item with an `id` updates that zone. An item without one creates a `manual` zone [P1]. A zone left out is deleted [P1]. The array order sets `position`. There are at most 100 zones. An `id` that belongs to another quote → 422.
- Writable zone fields: `name` (required), `zoneTypeId`, `floorArea`, `wallArea`, `traffic`, `scheduleId`, `daysPerMonth`, `terminalsPerMonth`, `fixedPosts`, `measurementSource`, `observation`, `toilets`, `urinals`, `sinks`, `fixtureVisitsPerDay`, `minutesPerFixture`, `solutionLitersPerFixture`, `paperSoapMonthly`, `fixturesExcludeFloor`. Read-only: `origin`, `roomId`, `isFloorApproximate`, `sources`, `position`.
- Zone fields are nullable, and **missing data is not a 422**: it's how the quote becomes Revisar. Only malformed values are rejected (422, with paths such as `zones.2.floorArea`): wrong types, negative numbers, non-integer fixture counts or `fixedPosts`, `daysPerMonth > 31`, more than 6 decimals, unknown or newly inactive references.
- A zone field whose value changes gets `sources[field] = 'manual'`.
- Every successful PUT enqueues `recalculate` (§7.1) and answers 200 with `calculation.state: 'pending'`.

**`DELETE /api/quotes/:id`** deletes the quote with its zones, jobs and waste controls, and returns it as it was. The measurement stays.

### 8.3 Actions

| Route | Effect | Response |
|---|---|---|
| `POST /api/quotes/:id/recalculate` | Enqueue `recalculate` with the current settings and the current inputs | 202, the record |
| `POST /api/quotes/:id/regenerate` [P1] | Enqueue `regenerate`, which discards web edits to the zones. Without a measurement → 409 `CONFLICT`, "The measurement no longer exists". | 202, the record |
| `POST /api/measurements/:id/quote` [P1] | Create the quote and a `generate` job for a measurement whose quote was deleted. If one exists → 409. | 201, the record |

### 8.4 Waste control

- `GET /api/quotes/:id/waste-controls/:period` (`period` = `YYYY-MM`) → `{ period, rows: [{ productId, name, unit, theoretical, actual, realWasteRate, excess, excessCost, status }], totalExcessCost }`. There's one row per purchase-plan product, computed as in §5.9.
- `PUT /api/quotes/:id/waste-controls/:period` with `{ rows: [{ productId, actual }] }`. `actual: null` deletes that product's row. A `productId` that isn't in the quote's purchase plan → 422.
- A quote without a result → 409, "The quote has no results yet". An invalid period → 400.

### 8.5 Quoting options for the phone

`GET /api/quoting/options`:

```json
{
  "revision": 14,
  "traffic": ["low", "medium", "high"],
  "schedules": [ { "code": "diurno-8h", "name": "Diurno 8 h", "serviceHoursPerDay": 8 } ],
  "defaults": { "traffic": "medium", "scheduleCode": "diurno-8h", "daysPerMonth": 22 }
}
```

Only active schedules are listed. The `defaults` values are `null` when the parameter isn't set.

### 8.6 Upload contract additions (SPEC-004 §4.3)

`metadata` gains optional fields. Metadata without them, from older app builds, MUST still be accepted. The committed `test/fixtures/metadata.json` keeps passing unchanged.

| Field | Rules |
|---|---|
| `quoting` | Optional object or `null`, stored in `measurements.quoting_json` |
| `quoting.scheduleCode` | Optional, `null` or a slug ≤ 50. It isn't checked against the catalog at upload time (§6). |
| `quoting.daysPerMonth` | Optional, `null` or an integer from 1 to 31 |
| `quoting.traffic` | Optional, `null`, `low`, `medium` or `high` |
| `rooms[].locationType` | Optional, `null` or `^[A-Za-z][A-Za-z0-9]{0,49}$`. Values the API doesn't know are accepted, and simply have no equivalence. |
| `rooms[].quoting` | Optional object or `null` |
| `rooms[].quoting.traffic` | As `quoting.traffic` |
| `rooms[].quoting.fixedPosts` | Optional integer from 0 to 100 |
| `rooms[].quoting.fixtures` | Optional, `null` or `{ toilets, urinals, sinks }`, each an integer from 0 to 500 |

Malformed values are a 422 as today, because they mean the app has a bug. The new room fields are stored inside `rooms_json`.

### 8.7 Measurement record additions

- The record exposes `quoting` and the new room fields.
- It also exposes `quote: { id, status, calculationState } | null` [P1], read with a join. The list never reads `result_json`.

### 8.8 Errors

Add the 409 cases (in use, no results, the measurement no longer exists, a quote already exists) and the 422 messages to the error table in `api/README.md`. The web translates every new message (`src/i18n/apiErrors.ts`).

---

## 9. Mobile app (`mobile/`)

The phone captures the facts that only someone on site knows. Everything is optional. A scan saved without any of it still uploads, and the admin defaults apply.

### 9.1 Core Data, model version 3

Add `RoomScanner 3.xcdatamodel` and make it current. Don't edit version 2. Every change is compatible with lightweight migration.

| Entity | Attribute | Type | Default | Meaning |
|---|---|---|---|---|
| `Location` | `quoteScheduleCode` | String, optional | | `nil` = server default |
| `Location` | `quoteDaysPerMonth` | Integer 16 | `0` | `0` = server default |
| `Location` | `quoteTrafficRaw` | String, optional | | `low`, `medium`, `high`, or `nil` |
| `Room` | `quoteTrafficRaw` | String, optional | | `nil` = same as the location |
| `Room` | `quoteFixedPosts` | Integer 16 | `0` | |
| `Room` | `quoteFixturesEnabled` | Boolean | `NO` | Whether the user counted fixtures |
| `Room` | `quoteToilets`, `quoteUrinals`, `quoteSinks` | Integer 16 | `0` | Used only when `quoteFixturesEnabled` |

### 9.2 Quoting options

- `Networking/QuotingOptionsStore.swift` (`@Observable @MainActor`) fetches `GET /api/quoting/options` after login, at launch with a valid session, and when the app becomes active, at most once an hour. It caches the JSON in Application Support, so the pickers work offline.
- With no cached options, the schedule picker shows only "Predeterminado del servidor".
- A 401 counts as session loss (SPEC-004 SES-4). Other errors keep the cached options.

### 9.3 UI

- **QUOTE-1** In the room review sheet (`RoomReviewSheet`), below the room type, add a collapsed **Datos para cotizar** `DisclosureGroup` with:
  - **Tráfico:** Como la ubicación (default), Bajo, Medio, Alto.
  - **Puestos fijos:** stepper 0–20, with the help text "Personas que deben estar presentes todo el horario aunque no haya tareas."
  - **Contar aparatos sanitarios:** a toggle that shows the **Inodoros**, **Urinarios** and **Lavamanos** steppers (0–50 each). When the room type is `bathroom` or `lockerRoom`, or the scan detected a toilet or a sink, the toggle starts on and the steppers start at the detected counts (`toilet`, `sink`, and 0 urinals).
- **QUOTE-2** In the save sheet (`SaveLocationSheet`), add a **Cotización** section with:
  - **Horario:** Predeterminado del servidor, then the cached schedules by name.
  - **Días de servicio por mes:** Predeterminado, or a stepper from 1 to 31.
  - **Tráfico habitual:** Predeterminado, Bajo, Medio, Alto.
- **QUOTE-3 [P1]** The measurements tab of the location detail shows these values read-only. Edits after saving aren't synced, the same as other edits (SPEC-004 §2). The web is where you correct them.
- **QUOTE-4** Every new string is a semantic key in `Localizable.xcstrings`.

### 9.4 Upload payload

`UploadPayloadBuilder` adds:

- `rooms[].locationType` = `Room.typeRaw`, or `null`. Send it **always**, even if the user opened none of the quoting fields.
- `rooms[].quoting` = `{ traffic, fixedPosts, fixtures }`. `traffic` is left out when it's "Como la ubicación". `fixtures` is left out when `quoteFixturesEnabled` is false. The whole object is left out when it would be empty and `fixedPosts` is 0.
- `quoting` = `{ scheduleCode, daysPerMonth, traffic }`, leaving out every "Predeterminado". The whole object is left out when it would be empty.

### 9.5 Tests

| Suite | Cases |
|---|---|
| `UploadPayloadBuilderTests` | `locationType` is sent. Quoting fields appear only when set. Fixtures appear only when enabled. Defaults are left out. |
| `LocationMigrationTests` | A version 2 store opens with version 3, and its rooms read as "default" for every quoting field. |
| `QuotingOptionsStoreTests` | Decoding. Cache round trip. Throttling. A 401 triggers session loss. |
| `RoomQuotingDefaultsTests` | Fixture prefill from detected objects, and for `bathroom` without detections. |

---

## 10. Admin UI (`web/`)

### 10.1 Navigation

The menu becomes: Mediciones, **Cotizaciones** (icon `RequestQuote`), Productos, Movimientos, Categorías, Proveedores, then a **Configuración de cotización** group [P1 as a labeled group; P0 as plain entries] with **Parámetros** (links to `/quote-parameters/1`), **Tipos de zona**, **Horarios**, **Productos de cotización** and **Equivalencias de tipos**, and Usuarios last.

### 10.2 Settings screens

- **Parámetros:** an `Edit` of `quote-parameters` id 1, with one titled card per §3.1 group and the workbook's labels. Fraction fields are entered as percentages, with conversion both ways and no float drift (`11,15` ↔ `0.1115`; a test covers it). Each field's helper text is its note. Defaults reference a schedule and a zone type through `ReferenceInput`. Saving shows "Las cotizaciones existentes no cambian hasta que se recalculen."
- **Tipos de zona**, **Horarios**, **Productos de cotización:** list, create and edit, like the existing resources.
  - The zone type form groups the three traffic intervals under "Horas entre limpiezas según tráfico", and picks the three products with `ReferenceInput`.
  - The product list and form show the computed `pricePerContainer`, `pricePerUnit`, `costPerLiterOfSolution` and `effectiveStock`, with the dose unit next to the dose. The inventory product is chosen with an `AutocompleteInput`.
- **Equivalencias de tipos:** a list of `label` and zone type, with a filter "Sin equivalencia". Editing the zone type inline is [P1]; otherwise a small edit page.

### 10.3 Quote list

Columns: Nombre, Estado (§10.5), Precio sin IVA, Costo mensual, Margen (with the margin chip), Superficie (m²), Personal (FTE), Calculado el, and a stale chip "Parámetros modificados". Filters: search, Estado, "Solo desactualizadas", and Desde / Hasta (`createdAt`). Clicking a row opens Show.

### 10.4 Quote show

```
Cotizaciones › Clínica de prueba                         [Recalcular] [Editar] [Eliminar]
[Simulación]  No equivale a oferta validada.   Medición: Clínica (12) · Calculado el 16 oct 2026, 13:21
⚠ Revisar datos: esta cotización es preliminar.        ← only when status = needsReview
   • Baño público: faltan atenciones por día, minutos y litros por aparato.  [Ir a la zona]
Alertas: ⚠ Con una tarifa plana de 2,06 US$ por m², 3 zona(s) pierden dinero. Cotiza por zona.
[ RESUMEN | ZONAS | OFERTA TÉCNICA | PLAN DE COMPRAS | TARIFA PLANA | CONTROL DE MERMAS | SUPUESTOS ]
```

- While `calculation.state` is `pending` or `running`, the header shows "Calculando…" and the record is refetched every second. After 60 s it says "El cálculo está tardando más de lo normal." When the state is `failed`, it shows the error and **Recalcular**.
- **Resumen**, mirroring the `Cotizacion` sheet:
  - Resultado mensual: precio sin IVA (marked "Precio manual" when it applies), IVA, total con IVA, costo, ganancia, margen with its chip, ganancia anual, precio por m².
  - Negociación: precio objetivo, precio mínimo ("No bajar de aquí."), punto de equilibrio, margen para negociar.
  - Personal: horas-persona, FTE, personas a contratar (with "Revisar relevos por turno."), supervisores equivalentes.
  - Químicos y mermas.
  - "¿A dónde va cada dólar del precio?", as a table with amount and %. A stacked bar is [P2].
  - Detalle por zona: zona, tipo, riesgo, m², FTE, costo, precio, precio/m², plus a totals row.
- **Zonas:** one accordion per zone, with an inactive badge and its causes. Inputs appear with a source chip (Escaneo, App, Predeterminado, Manual), followed by the computed values grouped as Frecuencia (N, O, P, Q), Horas (S, T, U, V, W), Mano de obra (X, Y, Z, AA, AB), Químicos (AC–AL with product names) and Costos (AM–AT).
- **Oferta técnica:** the §5.9 table, with doses such as "10 ml" or "10 g" per litre of water.
- **Plan de compras:** the §5.9 table with totals. Show stock as "desde inventario" when it comes from the link.
- **Tarifa plana:** the rate (or "Sin tarifa plana configurada"), revenue, margin, zones at a loss and below the minimum, and one row per zone. Then **Referencia externa**: the price, the difference and the relative difference, or a prompt to enter it in Editar.
- **Control de mermas:** a month picker (default: the current month). One row per plan product with an input for the real consumption (L or kg). The computed columns and the status chip (Sin dato, OK, Vigilar, Alerta) update as the user types, using the same formula as the API, and **Guardar** saves them. Show the total excess cost.
- **Supuestos:** the snapshot's parameters, grouped as in §10.2, and the zone types, schedules and products it used. When the quote is stale, a banner says "Los parámetros cambiaron después de este cálculo." with **Recalcular**. Highlighting the values that changed is [P2].

### 10.5 Chips

| State | Label | Color |
|---|---|---|
| `calculation.state` pending or running | Calculando… | default, with a spinner |
| `calculation.state` failed | Error de cálculo | error |
| `status` needsReview | Revisar | warning |
| `status` simulation | Simulación | info |
| `marginStatus` | Saludable / Aceptable / Bajo el mínimo / Pérdida | success / info / warning / error |
| `flatRateStatus` | OK / Bajo el mínimo / Pérdida | success / warning / error |

### 10.6 Edit

- **Datos del caso:** name, installation type (Hospital privado, Hospital público (SERCOP), Oficina, Centro comercial, Otro), city, visit date, main measurement (Visita técnica, Planos, Estimado), **Supuestos revisados: habilitar simulación** (with the workbook's warning "Activar únicamente para simular después de revisar supuestos."), manual price ("Vacío = usa el precio con margen objetivo."), external reference price ("Mismo alcance y período."), and notes.
- **Zonas:** an `ArrayInput` with one card per zone, grouped as Zona (name, type, measurement origin, observation), Superficies (floor, walls), Operación (traffic, schedule, days, terminals with the zone type's suggestion as placeholder, fixed posts) and Aparatos sanitarios (the three counts, visits, minutes, litres, paper and soap, and "Los tiempos no incluyen el piso"). The scan's original values are shown as hints, for example "Escaneo: 20,00 m²". Adding and removing zones is [P1].
- It's pessimistic. After saving, it returns to Show, which polls until the recalculation finishes.

### 10.7 Measurements

The measurement Show header gets a **Cotización** button with its status chip, which links to the quote (or "Crear cotización" [P1] when there isn't one). The list gets a Cotización column [P1]. The delete confirmation adds "La cotización se conserva."

### 10.8 Formatting and i18n

- Money: `formatCurrency` with `VITE_CURRENCY`, 2 decimals. Percentages: 1 decimal. Hours: 1 decimal. FTE: 2 decimals. L and kg: 3 decimals. m²: 2 decimals. Use the `es` locale throughout.
- Add the resource names and field labels to `src/i18n/spanish.ts`, the enum labels (risk, traffic, statuses, installation types, origins, sources, waste status) to `src/i18n/quotes.ts`, and every cause and warning message from §5.10.
- `src/types.ts` mirrors §5.13 and §8.2.

---

## 11. Seed and defaults

`005_quote_defaults.sql` inserts the following, with the notes copied from the workbook.

**Products** (`Productos` 7–11, prices from `Precios investigados` 7–11; `stockContainers` null):

| name | use | presentation | unit | published price | incl. VAT | dose / L | status |
|---|---|---|---|---|---|---|---|
| Detergente neutro | Limpieza | 3.8 | L | 14.71 | yes | 10 (ml) | SUPUESTO 3,8 L |
| Desengrasante | Limpieza | 3.8 | L | 11.36 | yes | 20 (ml) | SUPUESTO 3,8 L |
| Amonio cuaternario 5ª gen | Desinfección diaria | 4 | L | 31.40 | yes | 4 (ml) | CONFIRMADO selector |
| Hipoclorito de sodio 5% | Desinfección | 3.8 | L | 6.80 | yes | 20 (ml) | SUPUESTO 3,8 L |
| Monopersulfato de potasio | Desinfección terminal | 0.05 | kg | 11.50 | no | 10 (g) | SUPUESTO 50 g |

**Schedules** (`Tipologias` 31–34):

| code | name | h/day | night fraction | holidays |
|---|---|---|---|---|
| `diurno-8h` | Diurno 8 h | 8 | 0 | no |
| `extendido-16h` | Extendido 16 h | 16 | 0.1875 | no |
| `nocturno-11h` | Nocturno 11 h | 11 | 1 | no |
| `24-7` | 24/7 | 24 | 0.458333333333333 | yes |

**Zone types** (`Tipologias` 7–18). The columns are: risk; daily rate; terminal rate; hours between cleanings for low, medium and high traffic; walls in terminal; suggested terminals per month; cleaning product / daily disinfectant / terminal disinfectant (D = Detergente neutro, G = Desengrasante, A = Amonio cuaternario, H = Hipoclorito, M = Monopersulfato); L/m²; whether it counts fixtures.

| code | name | risk | E | F | G/H/I | J | K | L/M/N | O | fixtures |
|---|---|---|---|---|---|---|---|---|---|---|
| `oficina` | Oficina | noncritical | 150 | 60 | 24/24/12 | no | 0 | D/A/A | 0.04 | no |
| `area-administrativa-hospital` | Área administrativa (hospital) | noncritical | 150 | 60 | 24/24/12 | no | 1 | D/A/A | 0.04 | no |
| `pasillo` | Pasillo / circulación | noncritical | 250 | 60 | 8/6/4 | no | 2 | D/A/A | 0.04 | no |
| `sala-espera` | Sala de espera | semicritical | 150 | 50 | 8/6/4 | no | 4 | D/A/A | 0.04 | no |
| `bano` | Baño | semicritical | 60 | 25 | 4/3/2 | yes | 4 | D/H/H | 0.06 | **yes** |
| `patio-comidas` | Patio de comidas | noncritical | 200 | 50 | 6/4/2 | no | 4 | G/A/A | 0.05 | no |
| `habitacion-hospitalizacion` | Habitación hospitalización | semicritical | 100 | 35 | 12/8/6 | yes | 4 | D/A/M | 0.05 | no |
| `laboratorio` | Laboratorio | critical | 60 | 35 | 8/6/4 | yes | 4 | D/A/M | 0.05 | no |
| `uci` | UCI | critical | 60 | 30 | 8/6/4 | yes | 8 | D/A/M | 0.06 | no |
| `quirofano` | Quirófano | critical | 60 | 40 | 6/4/3 | yes | 30 | D/A/M | 0.06 | no |
| `exterior-pavimentado` | Exterior pavimentado (proxy) | noncritical | 250 | 60 | 24/24/24 | no | 0 | D/A/A | 0.04 | no |
| `area-verde` | Área verde (proxy seca) | noncritical | 250 | 60 | 24/24/24 | no | 0 | D/A/A | 0 | no |

**Parameters:** the §3.1 defaults, with `defaultScheduleId` set to `diurno-8h`.

**Room-type equivalences:** one row for every `LocationType` case, with `label` from `Localizable.xcstrings` (Spanish). The equivalences below are seeded, and every other case stays unmapped (`null`), so it's Revisar until an admin decides:

| Zone type | `LocationType` values |
|---|---|
| Quirófano | `operatingRoom` |
| Habitación hospitalización | `patientRoom`, `recoveryRoom` |
| UCI | `intensiveCareUnit` |
| Laboratorio | `clinicalLaboratory` |
| Sala de espera | `waitingRoom` |
| Área administrativa (hospital) | `nursingStation`, `pharmacy` |
| Oficina | `office`, `openOffice`, `meetingRoom`, `reception`, `breakRoom`, `copyRoom`, `teachersLounge`, `classroom`, `library`, `livingRoom`, `bedroom`, `diningRoom` |
| Pasillo / circulación | `hallway`, `lobby`, `entrance`, `stairwell`, `elevator` |
| Baño | `bathroom`, `lockerRoom` |
| Patio de comidas | `cafeteria`, `restaurant`, `kitchen` |
| Exterior pavimentado (proxy) | `parking`, `balcony` |

The residential mappings (`livingRoom`, `bedroom`, `diningRoom` → Oficina; `kitchen` → Patio de comidas) are application assumptions, so the sample apartment gets a quote. Their seed note says "SUPUESTO de la aplicación".

**`db:seed` / `db:reset`** [P1]: after inserting the sample measurement (SPEC-004 §4.7), drain the queue with a worker (`processNextJob` until it returns false), so that the sample quote exists without starting the server. The result is Appendix A.2.

---

## 12. Tests

### 12.1 API (`vitest`)

1. **Engine golden cases** (`test/quoteEngine.golden.test.ts`): the Appendix A cases, written as JSON fixtures in `test/fixtures/quote-engine/`. Every listed value MUST match within `1e-6 × max(1, |expected|)`, and every listed enum or string exactly.
2. **Engine invariants** (from `Pruebas`), checked on every golden case, and [P1] on 200 random valid inputs from a seeded PRNG:
   - Σ zone `totalCost` = `costs.totalCost`;
   - `offeredPrice − totalCost − profit` = 0;
   - without a manual price, `margin` = `targetMargin`;
   - `totalWithVat − offeredPrice − vat` = 0;
   - Σ `purchasePlan.theoretical` = Σ over zones of the three concentrates;
   - Σ `breakdown.amount` = `offeredPrice`;
   - `minimumPrice ≤ targetPrice`;
   - every active zone has `cleaningsPerDay ≥ 1`;
   - no output is non-finite;
   - computing the same input twice gives deep-equal results.
3. **Validation:** every cause code in §5.3–§5.5 has a dedicated case. A zone with a fixture cause stays active, while a zone with a zone cause is inactive and contributes 0. A quote with zero zones gives Appendix A.3.
4. **Numeric rules:** `ceilX(7.6 / 3.8) = 2`; `ceilX(2.0000001) = 3`; the margin-status tolerance at the boundaries.
5. **Derivation** (§6): the SPEC-004 fixture gives two Oficina zones with wall areas 39.48 and 34.26, the expected `sources`, and the default traffic, schedule and days. Metadata with `quoting` and `rooms[].quoting` overrides them, tagged `app`. An unknown `scheduleCode` falls back to the default and adds a warning. A `bathroom` room with one `toilet` object and no app fixtures gives `toilets: 1, sinks: 0, urinals: 0`, source `scan` and `FIXTURES_DETECTED`. Corrupt geometry adds `GEOMETRY_UNAVAILABLE`, and the job still completes.
6. **Trigger and backfill:** inserting a measurement creates one quote and one pending `generate` job. An upload that fails (422) leaves neither. Migrating a database that already has a measurement backfills its quote and job.
7. **Worker:** `processNextJob` completes a job and fills every summary column. An injected failing `compute` retries with backoff (`run_after`), then becomes `failed` after the maximum attempts and sets `calculation_state = 'failed'`. `running` jobs reset at startup. There is never more than one pending job per quote, and the kind upgrade follows §7.1. A deleted quote's job is dropped. Recomputing from `snapshot_json` and the stored zones reproduces `result_json` exactly.
8. **Settings API:** validation, the decimal limit, the margin cross-field rule, 409 on deleting a referenced row, inactive references, the computed product fields, inventory stock conversion (L, gal, mL, count units, incompatible units), and the revision incrementing on every change.
9. **Quotes API:** the list protocol (sorts, filters including `isStale`, `q`, `Content-Range`); getOne includes `zones`, `result` and `snapshot`; PUT on quote fields; replacing zones, with updates, [P1] additions and deletions, positions and `manual` sources; missing data is accepted, malformed data is a 422 with the right paths; every PUT enqueues `recalculate`; recalculate, [P1] regenerate (and its 409 without a measurement), delete; deleting a measurement keeps its quote with `measurementId: null`.
10. **Waste control:** Appendix A.4 through the API, deleting with `null`, a product outside the plan → 422, no result → 409, a bad period → 400.
11. **Upload contract:** metadata with every new field is stored and returned. The old `metadata.json` still passes. A malformed `quoting` value is a 422 that names it. `GET /api/quoting/options` matches §8.5.
12. **Seed** [P1]: a fresh seed creates the sample quote, already calculated, matching Appendix A.2.

### 12.2 Web (`vitest`)

- Percentage ↔ fraction conversion without drift, for example `11,15 %` → `0.1115` → `11,15 %`.
- Every cause and warning code has a Spanish message. Status, margin, flat-rate and waste chips map as in §10.5.
- The waste-control preview in the browser matches the API's formula on Appendix A.4.
- Polling: refetches while pending, stops at `done`, and shows the slow-calculation message after 60 s (with fake timers).
- Smoke renders, with a mocked data provider: `/quotes`, `/quotes/1/show` (every tab, with both a `simulation` and a `needsReview` fixture), `/quotes/1` (edit), `/quote-parameters/1`, and the list and edit pages of the four catalogs.

### 12.3 Mobile

§9.5.

---

## 13. Implementation order

1. Migrations 004 and 005, and the settings repositories and routes (§3, §4, §8.1), with their tests.
2. **The engine and its golden tests** (§5, Appendix A). Don't continue until every golden value matches.
3. Zone derivation (§6), then the worker and its configuration (§7).
4. The quotes API, the actions, waste control, the options endpoint, and the upload contract additions (§8).
5. The seed (§11).
6. Web: types and i18n, the settings screens, then the quote list, show and edit, then the measurement link (§10).
7. Mobile (§9).
8. Documentation: `api/README.md` (endpoints, variables, errors, the worker, a curl example of editing a zone and recalculating), `web/README.md` (screens), `mobile/README.md` (the quoting inputs), and the root `README.md` (one paragraph: measurements become quotes). Mark "Implement quoting logic." as done in `TODO.md`.

---

## 14. Definition of done

- `api/`: `npm ci`, `npm run lint`, `npm run typecheck` and `npm test` pass with no warnings. `web/`: `npm ci`, lint, typecheck, test and build pass. Mobile: builds and tests in the Simulator, or the gaps are recorded in `mobile/NOTES.md`, as with SPEC-004.
- Every Appendix A value is reproduced by the engine tests.
- **End-to-end walkthrough** on a disposable database, recorded in `api/README.md` Notes:
  1. `db:reset`. The sample quote is Revisar with exactly one cause, `ASSUMPTIONS_NOT_CONFIRMED`, and a preliminary price of 251,08.
  2. Confirm the assumptions in the admin. After the recalculation it's Simulación, with the same price.
  3. Change `targetMargin` to 40 %. The quote shows "Parámetros modificados", and its price doesn't change. **Recalcular** gives 163.200556 / 0.6 = 272.000927.
  4. Upload the SPEC-004 fixture again with a new `clientId` and a `quoting` block. A second quote appears with `app` sources.
  5. Enter waste-control values for this month and reload. They're still there.
- Every [P1] item is done or listed as skipped.

---

## 15. Out of scope (future work)

- Exporting a quote to PDF or XLSX (`TODO.md`), approval workflow, versioned quote history, and sending quotes to clients.
- Machinery (`Prueba mecanizada`) and equipment-based productivity.
- Roles and permissions over who can confirm assumptions or change parameters.
- Editing quoting inputs on the phone after the upload, and two-way sync.
- AI suggestions of zone types from detected objects beyond the fixture count (`Equipo` item 5). The equivalence table and the person reviewing decide.
- Multiple sites per quote, rotating shifts, overtime, inflation, working capital (`Equipo` row 35).

---

## Appendix A. Golden cases

All expected values were obtained by entering the inputs in the workbook and recalculating it with LibreOffice. They're shown to 6 decimals. Unless stated otherwise, the settings are the §11 defaults.

### A.1 "Clínica de prueba" (four zones; exercises every branch)

**Quote:** `assumptionsConfirmed: true`, `manualPrice: null`, `externalReferencePrice: 3500`. **Parameter override:** `flatRatePerM2 = 2.06`. **Product override:** Detergente neutro `stockContainers = 2`.

| # | name | zone type | floor | walls | traffic | schedule | days | terminals | fixed posts | toilets / urinals / sinks | visits / min / L | paper+soap | excl. floor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Quirófano 1 | Quirófano | 36 | 72 | medium | 24/7 | 30 | null | 1 | 0 / 0 / 0 | — | 0 | false |
| 1 | Baño público | Baño | 12 | 30 | high | Extendido 16 h | 30 | null | 0 | 3 / 1 / 3 | 4 / 3 / 0.5 | 40 | true |
| 2 | Pasillo principal | Pasillo / circulación | 120 | null | high | Extendido 16 h | 30 | null | 0 | 0 / 0 / 0 | — | 0 | false |
| 3 | Oficinas | Oficina | 80 | null | low | Diurno 8 h | 22 | 2 | 0 | 1 / 0 / 1 | 2 / 3 / 0.4 | 8 | true |

**Per zone:**

| Output | Quirófano 1 | Baño público | Pasillo principal | Oficinas |
|---|---|---|---|---|
| `hoursBetweenCleanings` / `cleaningsPerDay` / `cleaningsPerMonth` | 4 / 6 / 180 | 2 / 8 / 240 | 4 / 4 / 120 | 24 / 1 / 22 |
| `terminalsPerMonth` / `terminalArea` | 30 / 108 | 4 / 42 | 2 / 120 | 2 / 80 |
| `fixtures.hours` / `fixtures.solutionLiters` | 0 / 0 | 49.411765 / 420 | 0 / 0 | 5.176471 / 35.2 |
| `dailyCleaningHours` | 127.058824 | 105.882353 | 67.764706 | 18.980392 |
| `terminalHours` | 95.294118 | 7.905882 | 4.705882 | 3.137255 |
| `presenceHours` / `billableHours` | 720 / 720 | 0 / 113.788235 | 0 / 72.470588 | 0 / 22.117647 |
| `nightFraction` / `holidayFraction` | 0.458333 / 0.030137 | 0.1875 / 0 | 0.1875 / 0 | 0 / 0 |
| `laborCost` | 3477.663682 | 502.629394 | 320.119630 | 93.324273 |
| `fte` | 4.595745 | 0.726308 | 0.462578 | 0.141176 |
| `m2PerPersonInService` | 36 | 50.620347 | 794.805195 | 636.595745 |
| `dailySolutionLiters` / `terminalSolutionLiters` | 388.8 / 194.4 | 592.8 / 10.08 | 576 / 9.6 | 105.6 / 6.4 |
| concentrates (cleaning / daily / terminal) | 5.832 / 1.5552 / 1.944 | 6.0288 / 11.856 / 0.2016 | 5.856 / 2.304 / 0.0384 | 1.12 / 0.4224 / 0.0256 |
| `chemicalsTheoretical` | 477.367216 | 39.056139 | 35.701499 | 6.828156 |
| `chemicalsWithWaste` | 501.235577 | 41.008946 | 37.486574 | 7.169563 |
| `eppAndHygiene` | 183.829787 | 50.894618 | 6.938673 | 10.117647 |
| `utensils` | 2.88 | 0.96 | 9.6 | 6.4 |
| `directCost` | 4165.609047 | 595.492958 | 374.144878 | 117.011483 |
| `allocatedIndirect` | 941.851737 | 134.642034 | 84.594833 | 26.456508 |
| `totalCost` | 5107.460784 | 730.134993 | 458.739711 | 143.467991 |
| `targetPrice` | 7857.631975 | 1123.284604 | 705.753402 | 220.719987 |
| `costPerM2` / `pricePerM2` | 141.873911 / 218.267555 | 60.844583 / 93.607050 | 3.822831 / 5.881278 | 1.793350 / 2.759000 |
| `flatRateRevenue` / `flatRateMargin` / `flatRateStatus` | 74.16 / −67.870830 / loss | 24.72 / −28.536205 / loss | 247.2 / −0.855743 / loss | 164.8 / 0.129442 / belowMinimum |
| technical offer: solution per cleaning (L) / disinfectant per cleaning | 2.16 / 8.64 ml | 2.47 / 49.4 ml | 4.8 / 19.2 ml | 4.8 / 19.2 ml |

**Labor:** `annualLaborCost` 7932.5632, `hourlyCost` 4.219449, `fteHoursPerMonth` 156.666667.

**Costs:** labor 4393.736979 · chemicals theoretical 558.953011 · waste 27.947651 · EPP and hygiene 251.780726 · utensils 19.84 · direct 5252.258366 · supervision 213.329061 · equipment 40 · transport 60 · insurance 10 · operating 5575.587428 · administration 557.558743 · contingency 306.657309 · **total 6439.803479** · indirect to allocate 1187.545113.

**Pricing:** target 9907.389968 · minimum 9199.719256 · break-even 6439.803479 · **offered 9907.389968** · profit 3467.586489 · margin 0.35 · `healthy` · VAT 1486.108495 · total with VAT 11393.498463 · annual profit 41611.037864 · price/m² 39.949153 · negotiation room 707.670712.

**Staffing:** person-hours 928.376471 · FTE 5.925807 · people to hire 6 · supervisors 0.237032.

**Chemicals:** with waste 586.900661 · uncontrolled waste 83.842952 · controlled waste 27.947651 · monthly savings 55.895301 · annual savings 670.743613 · share of cost 0.091136.

**Flat rate:** rate 2.06 · revenue 510.88 · margin −11.605315 · zones at loss 3 · below minimum 1. **Reference:** difference 6407.389968 · relative 1.830683.

**Breakdown (share of the price):** labor 0.443481 · chemicals 0.059239 · EPP 0.025413 · utensils 0.002003 · supervision 0.021532 · fixed 110 (0.011103) · administration and contingency 864.216051 (0.087229) · profit 0.35.

**Purchase plan:**

| product | theoretical | waste | total | containers | stock | to buy | purchase cost | waste cost |
|---|---|---|---|---|---|---|---|---|
| Amonio cuaternario 5ª gen | 4.3456 | 0.21728 | 4.56288 | 2 | 0 | 2 | 54.608696 | 1.483172 |
| Detergente neutro | 18.8368 | 0.94184 | 19.77864 | 6 | 2 | 4 | 51.165217 | 3.170358 |
| Hipoclorito de sodio 5% | 12.0576 | 0.60288 | 12.66048 | 4 | 0 | 4 | 23.652174 | 0.938120 |
| Monopersulfato de potasio | 1.944 | 0.0972 | 2.0412 | 41 | 0 | 41 | 471.5 | 22.356 |

Totals: purchase cost 600.926087, waste cost 27.947651. Desengrasante has no row (deviation 3).

**Status:** `simulation`, no causes. **Warnings:** exactly one, `FLAT_RATE_ZONES_AT_LOSS` (n = 3). `WALLS_MISSING` isn't raised, because Pasillo and Oficina don't include walls in the terminal. The checks behind the other warnings pass: cost per m² by risk is critical 141.873911 > semicritical 60.844583 > noncritical 3.011039; the critical density is 36 m² per person; the general density is 340.171804.

**A.1b, manual price:** the same case with `manualPrice: 3000` → offered 3000, profit −3439.803479, margin −1.146601, `loss`, VAT 450, total with VAT 3450, annual profit −41277.641748, price/m² 12.096774, negotiation room 0, reference difference −500, relative −0.142857, breakdown labor share 1.464579 and profit share −1.146601. The warning `OFFERED_MARGIN_BELOW_MINIMUM` is raised. Costs, target and minimum price are unchanged.

### A.2 Sample apartment through the pipeline (SPEC-004 §7 fixture, no `quoting` metadata)

The derived zones are Sala and Dormitorio. Both are Oficina, through the `livingRoom` and `bedroom` equivalences. Floors 20 and 14, walls 39.48 and 34.26, traffic `medium`, schedule Diurno 8 h and 22 days (all `default`), terminals from the zone type (0), fixtures 0/0/0 with paper and soap 0.

- Status `needsReview`, with exactly one cause: `ASSUMPTIONS_NOT_CONFIRMED`.
- Per zone: cleanings per month 22 and 22; daily hours 3.450980 and 2.415686; labor 14.561234 and 10.192864; FTE 0.022028 and 0.015419; total cost 96.000327 and 67.200229; target price 147.692811 and 103.384968.
- Costs: labor 24.754098 · chemicals theoretical 1.824093 · waste 0.091205 · EPP 0.561702 · utensils 2.72 · direct 29.951098 · supervision 1.348085 · operating 141.299183 · administration 14.129918 · contingency 7.771455 · **total 163.200556**.
- Pricing: **offered 251.077779** · minimum 233.143652 · profit 87.877223 · margin 0.35 `healthy` · VAT 37.661667 · total with VAT 288.739445 · price/m² 7.384641 · negotiation room 17.934127.
- Staffing: person-hours 5.866667, FTE 0.037447, people to hire 1.
- Purchase plan: Amonio cuaternario 0.11968 (1 container, 27.304348), Detergente neutro 0.2992 (1 container, 12.791304).
- After `assumptionsConfirmed: true` and a recalculation: status `simulation`, with the same numbers.

### A.3 No zones

A quote with no zones and the defaults: status `needsReview`, with the causes `ASSUMPTIONS_NOT_CONFIRMED` and `NO_ACTIVE_ZONES`. Total cost 127.05 (operating 110, administration 11, contingency 6.05), target price 195.461538, minimum price 181.5, offered 195.461538, profit 68.411538, VAT 29.319231, price/m² 0, people to hire 0.

### A.4 Waste control on A.1, period `2026-11`

Real consumption: Detergente neutro 20.5 L, Amonio cuaternario 4.4 L, Hipoclorito 15 L, Monopersulfato not entered.

| product | real waste rate | excess | excess cost | status |
|---|---|---|---|---|
| Amonio cuaternario 5ª gen | 0.012518 | 0 | 0 | `ok` |
| Detergente neutro | 0.088295 | 0.72136 | 2.428194 | `watch` |
| Hipoclorito de sodio 5% | 0.244029 | 2.33952 | 3.640443 | `alert` |
| Monopersulfato de potasio | null | null | null | `noData` |

`totalExcessCost` = 6.068637.
