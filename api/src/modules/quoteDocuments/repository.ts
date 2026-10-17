import type Database from 'better-sqlite3';
import { mapRow, snake } from '../quotes/settings.ts';
import { mergeForUpdate } from '../../lib/validation.ts';
import { dataSchema, emptyData, settingsSchema, type QuoteDocumentData, type QuoteDocumentSettings } from './schemas.ts';

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
    exports: (id: number) => (db.prepare('SELECT id, format, number, revision, content_hash, exported_by, exported_at FROM quote_document_exports WHERE quote_id = ? ORDER BY id DESC LIMIT 100').all(id) as Record<string, string | number | null>[]).map(mapRow) as unknown as DocumentExport[],
  };
}
