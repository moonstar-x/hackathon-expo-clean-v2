import express, { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../app.ts';
import { HttpError, notFound } from '../../lib/errors.ts';
import { fileStore } from '../../lib/fileStore.ts';
import { parseId, requireObjectBody } from '../../lib/validation.ts';
import { quotesRepository } from '../quotes/repository.ts';
import { buildQuoteDocument, dateInZone, documentHash, readiness } from './builder.ts';
import { LOGO_MAX_BYTES, LOGO_TYPES, companyLogo, type LogoInfo } from './logo.ts';
import { documentRepository } from './repository.ts';

export function quoteDocumentsRouter({ db, config }: AppDeps) {
  const router = Router(), repo = documentRepository(db), logos = companyLogo(repo, fileStore(config.filesPath));
  // The logo's details only: its bytes are read where a file is rendered.
  function state(id: number, logo: LogoInfo | null = logos.info()) {
    const quote = quotesRepository(db).get(id), data = repo.data(id), settings = repo.settings();
    const { blockers, warnings } = readiness(quote, data, settings);
    const number = data.number ?? `${settings.numberPrefix}-${String(id).padStart(5, '0')}`;
    const defaults = { issueDate: quote.calculation.calculatedAt ? dateInZone(quote.calculation.calculatedAt as string, config.quoteDocumentTimezone) : null, validityDays: settings.validityDays, paymentTerms: settings.paymentTerms };
    const base = { quoteId: id, ready: !blockers.length, blockers, warnings, data, defaults, number };
    if (blockers.length) return { ...base, contentHash: null, revision: null, fileNames: null, document: null };
    const input = { quote, data, settings, number, timezone: config.quoteDocumentTimezone, revision: 1, logo };
    const initial = buildQuoteDocument(input), contentHash = documentHash(initial), last = repo.exports(id)[0];
    const revision = last ? last.revision + (last.contentHash === contentHash ? 0 : 1) : 1;
    const document = revision === 1 ? initial : buildQuoteDocument({ ...input, revision });
    return { ...base, contentHash, revision, fileNames: { pdf: `${document.fileBaseName}.pdf`, xlsx: `${document.fileBaseName}.xlsx` }, document };
  }
  const readyState = (id: number, logo?: LogoInfo | null) => { const s = state(id, logo); if (!s.document) throw new HttpError(409, 'DOCUMENT_NOT_READY', 'The quote document is not ready'); return s as typeof s & { document: NonNullable<typeof s.document>; contentHash: string; revision: number; fileNames: { pdf: string; xlsx: string } }; };
  router.get('/quote-document-settings/:id', (req, res) => { if (parseId(req.params.id) !== 1) throw notFound(); res.json(repo.settings()); });
  router.put('/quote-document-settings/:id', (req, res) => { if (parseId(req.params.id) !== 1) throw notFound(); repo.saveSettings(repo.settings(), requireObjectBody(req.body), req.user!.email); res.json(repo.settings()); });
  const logoPath = '/quote-document-settings/:id/logo', singleton = (id: string) => { if (parseId(id) !== 1) throw notFound(); };
  router.get(logoPath, (req, res) => {
    singleton(req.params.id); const logo = logos.file(); if (!logo) throw notFound('Logo not found');
    const etag = `"${logo.info.sha256}"`; res.set({ 'Content-Type': logo.info.contentType, ETag: etag, 'Cache-Control': 'private, no-cache' });
    if (req.get('If-None-Match')?.split(/,\s*/).includes(etag)) return res.status(304).end();
    res.send(logo.data);
  });
  // Check the type before reading the body, so another kind of file is refused without being buffered.
  router.put(logoPath, (req, _res, next) => { singleton(req.params.id); if (req.is([...LOGO_TYPES]) === false) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Logo must be a PNG or JPEG image'); next(); }, express.raw({ type: [...LOGO_TYPES], limit: LOGO_MAX_BYTES }), (req, res) => {
    res.json(logos.save(Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0), req.user!.email));
  });
  router.delete(logoPath, (req, res) => { singleton(req.params.id); logos.remove(); res.status(204).end(); });
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
    // One read of the logo, before any await, gives the document and the renderer the same file.
    const id = parseId(req.params.id), logo = logos.file(), s = readyState(id, logo?.info ?? null), start = performance.now();
    const bytes = format === 'pdf' ? await (await import('./pdf.ts')).renderPdf(s.document, logo?.data ?? null) : await (await import('./xlsx.ts')).renderXlsx(s.document, logo?.data ?? null);
    req.log.info({ quoteId: id, format, revision: s.revision, bytes: bytes.length, durationMs: Math.round(performance.now() - start) }, 'quote document rendered');
    const name = s.fileNames[format], ascii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').replace(/["\\]/g, '');
    const encoded = encodeURIComponent(name).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    res.set({ 'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encoded}`, 'Cache-Control': 'no-store', 'X-Document-Hash': s.contentHash, 'X-Document-Revision': String(s.revision) }).send(bytes);
  });
  return router;
}
