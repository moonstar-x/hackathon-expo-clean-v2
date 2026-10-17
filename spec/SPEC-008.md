# SPEC-008: The company's electronic signature on quote PDFs

| | |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-10-17 |
| **Builds on** | [SPEC-006](SPEC-006.md) (quote documents), [SPEC-007](SPEC-007.md) (Empresa, the acceptance box) |
| **Supersedes** | SPEC-006 §15 ("electronic signatures", out of scope until now). SPEC-007 §5.4: the issuer's acceptance box gains the signature's stamp when the company signs. Everything else stands. |
| **Deliverables** | `api/`: the signature's storage, validation and routes, the PDF's QR stamp and its signature · `web/`: **Firma electrónica** on Empresa, the signature warnings on Documento |

The keywords **MUST**, **MUST NOT**, **SHOULD** and **MAY** are used as in RFC 2119.

---

## 1. Summary

In Ecuador a company signs through its legal representative's electronic signature: a `.p12` file issued by an accredited authority (Banco Central, Security Data, Uanataca…), the one FirmaEC signs with. The company can now load that file once, with its password, on **Empresa**. From then on every quote PDF is electronically signed with it, and the company's signature box shows the stamp Ecuadorian documents carry: a QR code with the signature's data beside "Firmado electrónicamente por:" and the holder's name.

It is **optional**: a company that never loads one sees nothing change, and no quote ever waits on it.

## 2. Decisions

| Topic | Decision | Why |
|---|---|---|
| Optional | Never a blocker. A missing, expired or unusable signature leaves the PDF unsigned, with the space to sign by hand, and the Documento page says why (§4.3). | Asked for as optional; a quote must never be stuck on it. |
| What is signed | The PDF, with a real signature: `adbe.pkcs7.detached`, SHA-256, the signer's certificate and its chain, in an invisible signature field. The stamp is drawn on the page. The Excel file is neither signed nor stamped. | A stamp without a signature would claim one that doesn't exist. A workbook can't hold a PDF signature. `adbe.pkcs7.detached` is what FirmaEC writes. |
| Stamp | In the issuer's acceptance box, over its line, in a row of its own so both signature lines stay level: the QR, then "Firmado electrónicamente por:" and the certificate holder's name (its CN). | Where the representative would sign by hand. |
| QR | `FIRMADO POR: {holder}`, `RAZON: Cotización {number}`, `LOCALIZACION: {company city}` (left out when empty), `FECHA: {signing time, ISO 8601 in QUOTE_DOCUMENT_TIMEZONE}`, `VALIDAR CON: www.firmadigital.gob.ec`, one per line, ECC M. | FirmaEC's lines and words, which readers recognize, and where the national validator is. |
| Signing time | When the PDF is generated. The admin downloads the PDF it previewed (SPEC-006), so the file carries the preview's time. | A signature's time is when it was made; preview equals download keeps holding. |
| Model | `signature?: { signerName, certificateSha256, reason, location }`, part of the hash: loading, replacing or removing the signature is a new revision. It is **absent**, not null, when the company doesn't sign. | Documents of companies that never sign keep the hash and revision they had. |
| Storage | The `.p12` and its password sealed together (AES-256-GCM, key derived with HKDF from `JWT_SECRET`) as `FILES_PATH/signatures/{sha256 of the .p12}.sealed`. The database keeps the certificate's details only. | The API signs without asking each time, so it must keep the password; neither the database nor the files reveal it alone. |
| Which key | The key whose certificate may sign (key usage `digitalSignature` or `nonRepudiation`), then the one valid now. | Banco Central's files also hold an encryption key. |
| Reading `.p12` files | node-forge, which opens the RC2-40 and 3DES files with a SHA-1 MAC that Ecuadorian authorities issue as well as AES-256 / PBKDF2 / SHA-256 ones. | Node's OpenSSL 3 no longer opens RC2 without its legacy provider. |

## 3. API

### 3.1 Routes

All behind authentication; any id other than 1 → 404. No route ever returns the file or the password.

| Method | Path | Request | Response |
|---|---|---|---|
| `GET` | `/api/quote-document-settings/1/signature` | | 200 `{ signerName, issuerName, serialNumber, validFrom, validTo, certificateSha256, size, sha256, status, updatedBy, updatedAt }`, `status` being `valid`, `expired` or `unavailable` (it can no longer be opened); 404 "Signature not found" |
| `PUT` | `/api/quote-document-settings/1/signature` | `{ "file": "<the .p12 in base64>", "password": "…" }` | 200, as GET |
| `DELETE` | `/api/quote-document-settings/1/signature` | | 204, also when there is none |

### 3.2 Validation

422 `VALIDATION_ERROR` with the field to fix:

| Case | `errors` |
|---|---|
| No file or no password | `file` / `password`: "Required" |
| Not base64, or not a PKCS#12 file | `file`: "Must be a PKCS#12 (.p12 or .pfx) file" |
| Over 64 KB once decoded | `file`: "Must be at most 64 KB" |
| A password that doesn't open it | `password`: "Wrong password" |
| No RSA key with its certificate | `file`: "Must contain an RSA private key and its certificate" |
| More than 100 000 key-derivation iterations, or unknown algorithms | `file`: "Uses unsupported encryption" |
| A certificate expired, or not valid yet | `file`: "The certificate has expired" / "The certificate is not valid yet" |

forge derives keys synchronously, so the iteration cap bounds how long any file can hold the API (real files use about 2 000).

### 3.3 Storage

Migration `009_company_signature.sql` adds the single-row `quote_document_signature` (holder, issuer, serial number, validity, certificate hash, the `.p12`'s size and hash, who loaded it and when). As with the logo, the sealed file is written before the row points to it and a replaced one deleted after; a row whose file is missing counts as no signature; `db:reset` deletes the `signatures` folder. Changing `JWT_SECRET` makes a stored signature `unavailable` until it is loaded again.

### 3.4 Document and readiness

- `buildQuoteDocument` takes the signature's certificate details and adds `signature` to the model.
- When the stored signature can't sign now, the document leaves it out and `warnings` gains `SIGNATURE_EXPIRED` or `SIGNATURE_UNAVAILABLE`. Neither is a blocker.
- The file routes read the signature once, before rendering, as they read the logo. `renderPdf(document, logo, signing)` refuses a key whose certificate isn't the document's, as `documentLogo` refuses another logo.

## 4. Admin

### 4.1 Empresa

**Firma electrónica** comes after Representante legal and before Logo y colores, last:

- A miniature of the company's signature box on white paper: the stamp (a QR glyph, "Firmado electrónicamente por:" and the holder) or, without a signature that signs, the space to sign by hand; then the line and the representative's name, title and legal name, following the form as it is edited.
- Beside it: the holder, the issuer and "Vigente hasta"; **Cargar firma** (or **Cambiar firma**) opens a dialog with the file (`.p12` or `.pfx`, at most 64 KB) and its password; **Quitar firma** asks first. Both save at once, like the logo, and never submit the settings form. The dialog shows each refusal under its field.
- A note under the miniature: no signature, expired, unavailable, or expiring within 30 days.

### 4.2 Copy

"Firma electrónica", "Cargar firma", "Cambiar firma", "Quitar firma", "Titular", "Emitida por", "Vigente hasta", "Contraseña de la firma"; every API refusal has its Spanish message (`src/i18n/apiErrors.ts`).

### 4.3 Documento

`SIGNATURE_EXPIRED` and `SIGNATURE_UNAVAILABLE` show as warnings that say the PDF goes out unsigned, with **Ir a Empresa**.

## 5. Tests

- **API:** the authorities' formats (RC2/3DES, AES), Banco Central's two keys, every refusal of §3.2 (the iteration cap within 1.5 s), sealing (no password or `.p12` bytes in the database or the file), replacing and removing; a signed PDF checked with Node's own crypto (byte ranges over the whole file, the message digest, the signature against the holder's key, the certificate against the test authority); the stamp's text, the QR's lines and the timezone; the hash with and without a signature; expired and unavailable signatures; the workbook without a stamp. Fixtures come from `api/scripts/signature-fixtures.ts`.
- **Web:** the provider (base64 body, 404 as none, refusals kept by field), the Empresa section in each state, the dialog's checks and refusals, the settings form never saved by it, removal, the Documento warning and its link.

## 6. Out of scope

- Signing the Excel file or any other document.
- Time-stamping (TSA) and long-term validation: the signature is PAdES's basic level.
- Signatures kept on a USB token, which can't be loaded as a file.
- Several signatures, or one per user.
- A visible signature field: pdfmake doesn't tell where an unbreakable block lands, so the field is invisible and the stamp is page content.
