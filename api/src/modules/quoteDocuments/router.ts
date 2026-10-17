import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../app.ts';
import { HttpError, notFound } from '../../lib/errors.ts';
import { parseId, requireObjectBody } from '../../lib/validation.ts';
import { quotesRepository } from '../quotes/repository.ts';
import { buildQuoteDocument, dateInZone, documentHash, readiness } from './builder.ts';
import { documentRepository } from './repository.ts';

export function quoteDocumentsRouter({ db, config }: AppDeps) {
  const router = Router(), repo = documentRepository(db);
  function state(id: number) {
    const quote = quotesRepository(db).get(id), data = repo.data(id), settings = repo.settings();
    const { blockers, warnings } = readiness(quote, data, settings);
    const number = data.number ?? `${settings.numberPrefix}-${String(id).padStart(5, '0')}`;
    const defaults = { issueDate: quote.calculation.calculatedAt ? dateInZone(quote.calculation.calculatedAt as string, config.quoteDocumentTimezone) : null, validityDays: settings.validityDays, paymentTerms: settings.paymentTerms };
    const base = { quoteId: id, ready: !blockers.length, blockers, warnings, data, defaults, number };
    if (blockers.length) return { ...base, contentHash: null, revision: null, fileNames: null, document: null };
    const input = { quote, data, settings, number, timezone: config.quoteDocumentTimezone, revision: 1 };
    const initial = buildQuoteDocument(input), contentHash = documentHash(initial), last = repo.exports(id)[0];
    const revision = last ? last.revision + (last.contentHash === contentHash ? 0 : 1) : 1;
    const document = revision === 1 ? initial : buildQuoteDocument({ ...input, revision });
    return { ...base, contentHash, revision, fileNames: { pdf: `${document.fileBaseName}.pdf`, xlsx: `${document.fileBaseName}.xlsx` }, document };
  }
  const readyState = (id: number) => { const s = state(id); if (!s.document) throw new HttpError(409, 'DOCUMENT_NOT_READY', 'The quote document is not ready'); return s as typeof s & { document: NonNullable<typeof s.document>; contentHash: string; revision: number; fileNames: { pdf: string; xlsx: string } }; };
  router.get('/quote-document-settings/:id', (req, res) => { if (parseId(req.params.id) !== 1) throw notFound(); res.json(repo.settings()); });
  router.put('/quote-document-settings/:id', (req, res) => { if (parseId(req.params.id) !== 1) throw notFound(); repo.saveSettings(repo.settings(), requireObjectBody(req.body), req.user!.email); res.json(repo.settings()); });
  router.get('/quotes/:id/document', (req, res) => res.json(state(parseId(req.params.id))));
  router.put('/quotes/:id/document', (req, res) => { const id = parseId(req.params.id); quotesRepository(db).get(id); repo.saveData(id, repo.data(id), requireObjectBody(req.body), req.user!.email); res.json(state(id)); });
  router.get('/quotes/:id/document/exports', (req, res) => { const id = parseId(req.params.id); quotesRepository(db).get(id); res.json(repo.exports(id)); });
  router.post('/quotes/:id/document/exports', (req, res) => {
    const id = parseId(req.params.id);
    const body = z.object({ format: z.enum(['pdf', 'xlsx']), contentHash: z.string().regex(/^[a-f0-9]{64}$/) }).parse(req.body);
    const result = db.transaction(() => {
      const s = readyState(id);
      if (body.contentHash !== s.contentHash) throw new HttpError(409, 'DOCUMENT_CHANGED', 'The quote changed after the preview');
      repo.saveData(id, repo.data(id), {}, req.user!.email);
      db.prepare('UPDATE quote_documents SET number = coalesce(number, ?) WHERE quote_id = ?').run(s.number, id);
      const exportedAt = new Date().toISOString();
      const inserted = db.prepare('INSERT INTO quote_document_exports (quote_id, format, number, revision, content_hash, document_json, exported_by, exported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, body.format, s.number, s.revision, s.contentHash, JSON.stringify(s.document), req.user!.email, exportedAt);
      return { id: Number(inserted.lastInsertRowid), format: body.format, number: s.number, revision: s.revision, contentHash: s.contentHash, exportedBy: req.user!.email, exportedAt };
    }).immediate();
    res.status(201).json(result);
  });
  for (const format of ['pdf', 'xlsx'] as const) router.get(`/quotes/:id/document/${format}`, async (req, res) => {
    const id = parseId(req.params.id), s = readyState(id), start = performance.now();
    const bytes = format === 'pdf' ? await (await import('./pdf.ts')).renderPdf(s.document) : await (await import('./xlsx.ts')).renderXlsx(s.document);
    req.log.info({ quoteId: id, format, revision: s.revision, bytes: bytes.length, durationMs: Math.round(performance.now() - start) }, 'quote document rendered');
    const name = s.fileNames[format], ascii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').replace(/["\\]/g, '');
    const encoded = encodeURIComponent(name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    res.set({ 'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encoded}`, 'Cache-Control': 'no-store', 'X-Document-Hash': s.contentHash, 'X-Document-Revision': String(s.revision) }).send(bytes);
  });
  return router;
}
