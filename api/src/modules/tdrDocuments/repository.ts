import type Database from 'better-sqlite3';
import { enumFilter, type ListSpec, type ParsedListQuery } from '../../lib/listQuery.ts';
import { notFound } from '../../lib/errors.ts';
import { DOCX_TYPE, PDF_TYPE, TDR_EXTENSIONS, TDR_FOLDER, type TdrCatalog, type TdrContentType, type TdrExtraction } from './schemas.ts';

export type TdrStatus = 'pending' | 'running' | 'done' | 'failed';

export interface TdrRow {
  id: number;
  file_name: string;
  content_type: TdrContentType;
  size: number;
  sha256: string;
  status: TdrStatus;
  attempts: number;
  error: string | null;
  error_detail: string | null;
  model: string | null;
  extraction_json: string | null;
  analyzed_at: string | null;
  quote_id: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const tdrListSpec: ListSpec = {
  resource: 'tdr-documents',
  table: 'tdr_documents',
  sortable: { id: 'id', fileName: 'file_name', status: 'status', createdAt: 'created_at', updatedAt: 'updated_at' },
  textSorts: ['fileName'],
  defaultSort: ['createdAt', 'DESC'],
  search: ['file_name', "json_extract(extraction_json, '$.title')", 'created_by'],
  filters: { status: enumFilter('status', ['pending', 'running', 'done', 'failed']) },
};

/** Where an entry's original file lives under FILES_PATH. */
export const tdrFileName = (row: Pick<TdrRow, 'id' | 'content_type'>) => `${TDR_FOLDER}/${row.id}${TDR_EXTENSIONS[row.content_type]}`;

/** The upload's type by its content, not its name: a PDF, a Word .docx (a ZIP with word/document.xml), or null. */
export function sniffContentType(data: Buffer): TdrContentType | null {
  if (data.subarray(0, 5).toString('latin1') === '%PDF-') return PDF_TYPE;
  // ZIP entries' names are stored uncompressed in their local headers.
  if (data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && data.includes('word/document.xml')) return DOCX_TYPE;
  return null;
}

/** The company's active zone types and schedules, which an extraction may point to. */
export function tdrCatalog(db: Database.Database): TdrCatalog {
  return {
    zoneTypes: db.prepare('SELECT id, name, risk FROM quote_zone_types WHERE active = 1 ORDER BY name COLLATE NOCASE').all() as TdrCatalog['zoneTypes'],
    schedules: db.prepare('SELECT id, name, service_hours_per_day AS serviceHoursPerDay FROM quote_schedules WHERE active = 1 ORDER BY id').all() as TdrCatalog['schedules'],
  };
}

export function tdrRepository(db: Database.Database) {
  function record(row: TdrRow, detail: boolean) {
    const extraction = row.extraction_json ? JSON.parse(row.extraction_json) as TdrExtraction : null;
    return {
      id: row.id, fileName: row.file_name, contentType: row.content_type, size: row.size,
      status: row.status, error: row.error, errorDetail: row.error_detail, attempts: row.attempts, model: row.model,
      title: extraction?.title ?? null, zoneCount: extraction?.zones.length ?? null, quoteId: row.quote_id, analyzedAt: row.analyzed_at,
      createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
      ...(detail ? { extraction } : {}),
    };
  }
  const find = (id: number) => db.prepare('SELECT * FROM tdr_documents WHERE id = ?').get(id) as TdrRow | undefined;
  return {
    find,
    row(id: number): TdrRow {
      const row = find(id);
      if (!row) throw notFound();
      return row;
    },
    get(id: number) {
      return record(this.row(id), true);
    },
    list({ where, orderBy, range }: ParsedListQuery) {
      const rows = db.prepare(`SELECT * FROM tdr_documents WHERE ${where.sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...where.params, range.end - range.start + 1, range.start) as TdrRow[];
      const total = db.prepare(`SELECT count(*) FROM tdr_documents WHERE ${where.sql}`).pluck().get(...where.params) as number;
      return { records: rows.map((r) => record(r, false)), total };
    },
  };
}
