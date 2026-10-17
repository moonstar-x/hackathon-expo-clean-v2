export interface Money { value: number; text: string }            // value in USD with ≤ 2 decimals; text "9.907,39"
export interface Area  { value: number; text: string }            // text "248,00"

export interface QuoteDocument {
  metadata: { subject: string; issueInstant: string };
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
export type { QuoteDocumentData, QuoteDocumentSettings } from './schemas.ts';
