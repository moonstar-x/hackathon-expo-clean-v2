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
/** A titled block of the document settings: each field with its width on the form's grid. */
export interface SettingGroup { title: string; hint?: string; fields: [string, number][] }
export interface DocumentSettingsEditProps {
  /** Translation key of the page title. */
  title: string;
  groups: SettingGroup[];
  /** The settings this page saves: the API merges a partial PUT, so the other page's fields stay as saved. */
  fields: readonly string[];
  /** A section after the groups (Empresa's "Logo y colores"). */
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
