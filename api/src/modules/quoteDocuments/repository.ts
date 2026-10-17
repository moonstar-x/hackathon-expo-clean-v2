import type Database from 'better-sqlite3';
import { mapRow, snake } from '../quotes/settings.ts';
import { mergeForUpdate } from '../../lib/validation.ts';
import type { LogoInfo } from './logo.ts';
import { dataSchema, emptyData, settingsSchema, type QuoteDocumentData, type QuoteDocumentSettings } from './schemas.ts';
import type { SignatureInfo } from './signature.ts';

export interface LogoRecord extends LogoInfo { size: number; updatedBy: string; updatedAt: string }
/** The electronic signature's certificate details; `sha256` is the .p12's, which names its sealed file. */
export interface SignatureRecord extends SignatureInfo { sha256: string; size: number; updatedBy: string; updatedAt: string }
export interface DocumentExport { id: number; format: 'pdf' | 'xlsx'; number: string; revision: number; contentHash: string; exportedBy: string; exportedAt: string }
export function documentRepository(db: Database.Database) {
  const row = (sql: string, ...params: number[]) => { const r = db.prepare(sql).get(...params) as Record<string, string | number | null> | undefined; return r ? mapRow(r) : null; };
  return {
    settings: () => row('SELECT * FROM quote_document_settings WHERE id = 1') as unknown as QuoteDocumentSettings,
    data: (id: number) => {
      const r = row('SELECT * FROM quote_documents WHERE quote_id = ?', id);
      return Object.fromEntries(Object.keys(emptyData).map(k => [k, r?.[k] ?? emptyData[k as keyof QuoteDocumentData]])) as unknown as QuoteDocumentData;
    },
    saveSettings(current: QuoteDocumentSettings, body: Record<string, unknown>, user: string) {
      const value = settingsSchema.parse(mergeForUpdate(current, body, Object.keys(settingsSchema.shape)));
      const keys = Object.keys(value) as (keyof typeof value)[];
      db.prepare(`UPDATE quote_document_settings SET ${keys.map(k => `${snake(k)} = ?`).join(', ')}, updated_by = ?, updated_at = ? WHERE id = 1`).run(...keys.map(k => value[k]), user, new Date().toISOString());
    },
    saveData(id: number, current: QuoteDocumentData, body: Record<string, unknown>, user: string) {
      const value = dataSchema.parse(mergeForUpdate(current, body, Object.keys(dataSchema.shape)));
      const keys = Object.keys(value) as (keyof typeof value)[];
      db.prepare(`INSERT INTO quote_documents (quote_id, ${keys.map(snake).join(', ')}, updated_by, updated_at) VALUES (?, ${keys.map(() => '?').join(', ')}, ?, ?) ON CONFLICT(quote_id) DO UPDATE SET ${keys.map(k => `${snake(k)} = excluded.${snake(k)}`).join(', ')}, updated_by = excluded.updated_by, updated_at = excluded.updated_at`).run(id, ...keys.map(k => value[k]), user, new Date().toISOString());
    },
    // The logo's details only: its bytes are a file on disk (companyLogo in logo.ts).
    logo: () => row('SELECT content_type, width, height, size, sha256, updated_by, updated_at FROM quote_document_logo WHERE id = 1') as unknown as LogoRecord | null,
    saveLogo(info: LogoInfo, size: number, user: string) {
      db.prepare('INSERT INTO quote_document_logo (id, content_type, width, height, size, sha256, updated_by, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET content_type = excluded.content_type, width = excluded.width, height = excluded.height, size = excluded.size, sha256 = excluded.sha256, updated_by = excluded.updated_by, updated_at = excluded.updated_at').run(info.contentType, info.width, info.height, size, info.sha256, user, new Date().toISOString());
    },
    deleteLogo: () => { db.prepare('DELETE FROM quote_document_logo WHERE id = 1').run(); },
    // The certificate's details only: the .p12 and its password are a sealed file (companySignature in signature.ts).
    signature: () => row('SELECT signer_name, issuer_name, serial_number, valid_from, valid_to, certificate_sha256, sha256, size, updated_by, updated_at FROM quote_document_signature WHERE id = 1') as unknown as SignatureRecord | null,
    saveSignature(s: SignatureInfo & { sha256: string; size: number }, user: string) {
      db.prepare('INSERT INTO quote_document_signature (id, signer_name, issuer_name, serial_number, valid_from, valid_to, certificate_sha256, size, sha256, updated_by, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET signer_name = excluded.signer_name, issuer_name = excluded.issuer_name, serial_number = excluded.serial_number, valid_from = excluded.valid_from, valid_to = excluded.valid_to, certificate_sha256 = excluded.certificate_sha256, size = excluded.size, sha256 = excluded.sha256, updated_by = excluded.updated_by, updated_at = excluded.updated_at').run(s.signerName, s.issuerName, s.serialNumber, s.validFrom, s.validTo, s.certificateSha256, s.size, s.sha256, user, new Date().toISOString());
    },
    deleteSignature: () => { db.prepare('DELETE FROM quote_document_signature WHERE id = 1').run(); },
    exports: (id: number) => (db.prepare('SELECT id, format, number, revision, content_hash, exported_by, exported_at FROM quote_document_exports WHERE quote_id = ? ORDER BY id DESC LIMIT 100').all(id) as Record<string, string | number | null>[]).map(mapRow) as unknown as DocumentExport[],
  };
}
