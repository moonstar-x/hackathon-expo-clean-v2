import type { ReactNode } from 'react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

export interface Money { value: number; text: string }            // value in USD with ≤ 2 decimals; text "9.907,39"
export interface Area  { value: number; text: string }            // text "248,00"

export interface QuoteDocument {
  metadata: { subject: string; issueInstant: string };
  templateVersion: 2;
  number: string;                                          // "COT-00007"
  revision: number;                                        // ≥ 1
  title: string;                                           // "COTIZACIÓN"
  numberText: string;                                      // "N.º COT-00007 · Rev. 2"
  issueDate: string; issueDateText: string;                // "2026-10-16", "16/10/2026"
  validUntil: string; validUntilText: string;
  validityDays: number;
  paperSize: 'A4' | 'LETTER';
  issuer: { tradeName: string; lines: string[] };          // §3.3, already joined, empty lines removed
  logo: DocumentLogo | null;                               // printed in place of the trade name
  colors: DocumentColors;                                  // from the company's main color
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
  signature?: DocumentSignature;                           // absent when the company doesn't sign
  footer: string;                                          // "CleanCode · COT-00007 Rev. 2"
  fileBaseName: string;                                    // §7.4
}

export type DocumentFormat = 'pdf' | 'xlsx';
export interface QuoteDocumentData {
  clientLegalName: string | null; clientTaxId: string | null; clientContactName: string | null; clientContactTitle: string | null;
  clientEmail: string | null; clientPhone: string | null; clientAddress: string | null; issueDate: string | null;
  validityDays: number | null; paymentTerms: string | null; clientNotes: string | null; lineMode: 'perZone' | 'single'; contractMonths: number | null; number: string | null;
}
export interface DocumentIssue { code: string; params?: { field: string } }
export interface DocumentState {
  quoteId: number; ready: boolean; blockers: DocumentIssue[]; warnings: DocumentIssue[]; data: QuoteDocumentData;
  defaults: { issueDate: string | null; validityDays: number; paymentTerms: string | null };
  contentHash: string | null; revision: number | null; number: string;
  fileNames: Record<DocumentFormat, string> | null; document: QuoteDocument | null;
}
export interface DocumentExport { id: number; format: DocumentFormat; number: string; revision: number; contentHash: string; exportedBy: string; exportedAt: string }

export type LogoType = 'image/png' | 'image/jpeg';
/** The company logo a document was drawn with; its bytes are fetched apart (providers/companyLogo). */
export interface DocumentLogo { sha256: string; contentType: LogoType; width: number; height: number }
/**
 * The quote document's colors, all from the company's main color: `accent` fills the table headers,
 * `onAccent` is the text on them, `ink` the title and headings on white, `tint` the alternate rows.
 */
export interface DocumentColors { accent: string; onAccent: string; ink: string; tint: string }
/** What the API answers once it saved a logo. */
export interface LogoInfo extends DocumentLogo { size: number; updatedBy: string; updatedAt: string }

/** The company logo, and saving or removing it; both update the logo every screen shows. */
export interface CompanyLogo {
  logo: UseQueryResult<Blob | null, Error>;
  upload: UseMutationResult<Blob, Error, Blob>;
  remove: UseMutationResult<void, Error, void>;
}
/** The company's electronic signature on a document: the PDF is signed with it and stamps its QR in the company's signature box. */
export interface DocumentSignature { signerName: string; certificateSha256: string; reason: string; location: string | null }
/** Whether the stored signature signs: it may have expired, or the API may no longer open it (it must be loaded again). */
export type SignatureStatus = 'valid' | 'expired' | 'unavailable';
/** The certificate of the company's electronic signature, as the API describes it: never the .p12 or its password. */
export interface SignatureInfo {
  signerName: string; issuerName: string; serialNumber: string; validFrom: string; validTo: string; certificateSha256: string;
  size: number; sha256: string; status: SignatureStatus; updatedBy: string; updatedAt: string;
}
/** A .p12 and its password, sent together. */
export interface SignatureUpload { file: File; password: string }
/** The company's electronic signature, and loading or removing it; both update what every screen shows. */
export interface CompanySignature {
  signature: UseQueryResult<SignatureInfo | null, Error>;
  upload: UseMutationResult<SignatureInfo, Error, SignatureUpload>;
  remove: UseMutationResult<void, Error, void>;
}
export interface SignaturePreviewProps {
  /** A signature that signs; without one the box keeps the space to sign by hand. */
  signerName: string | undefined;
  loading: boolean;
}
export interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  upload: CompanySignature['upload'];
}
/** What to fix before a signature loads, in Spanish, by field. */
export interface SignatureFieldErrors { file?: string; password?: string }
/** A titled block of the document settings: each field with its width on the form's grid. */
export interface SettingGroup { title: string; hint?: string; fields: [string, number][] }
export interface DocumentSettingsEditProps {
  /** Translation key of the page title. */
  title: string;
  groups: SettingGroup[];
  /** The settings this page saves: the API merges a partial PUT, so the other page's fields stay as saved. */
  fields: readonly string[];
  /** Sections after the groups (Empresa's "Firma electrónica" and "Logo y colores"). */
  children?: ReactNode;
}
export interface HeaderPreviewProps {
  /** Object URL of the logo; the trade name stands in without one. */
  logoUrl: string | undefined;
  loading: boolean;
  /** A file dropped on the preview. */
  onFile: (file: File) => void;
  /** The shown logo's natural width, once it loads. */
  onLogoWidth: (width: number) => void;
}
export interface ColorInputProps {
  /** Colors taken from the logo, offered as swatches. */
  suggestions: string[];
}
