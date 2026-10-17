import { createHash } from 'node:crypto';
import express from 'express';
import multer from 'multer';
import type { AppDeps } from '../../app.ts';
import { HttpError, badRequest, conflict, validationError } from '../../lib/errors.ts';
import { fileStore } from '../../lib/fileStore.ts';
import { parseListQuery, sendList } from '../../lib/listQuery.ts';
import { parseId, requireObjectBody } from '../../lib/validation.ts';
import { quotesRepository } from '../quotes/repository.ts';
import { createQuoteFromTdr } from './quote.ts';
import { sniffContentType, tdrFileName, tdrListSpec, tdrRepository } from './repository.ts';
import { extractionSchema, TDR_MAX_BYTES } from './schemas.ts';

const NOT_A_TDR = 'Must be a PDF or Word (.docx) file';
const TOO_LARGE = 'Must be at most 20 MB';

/** `/api/tdr-documents` (SPEC-009 §5). `nudge` starts the analysis worker; `nudgeQuotes` the quote worker. */
export function tdrDocumentsRouter({ db, config }: AppDeps, { nudge = () => {}, nudgeQuotes = () => {} }: { nudge?: () => void; nudgeQuotes?: () => void } = {}) {
  const router = express.Router();
  const repo = tdrRepository(db);
  const files = fileStore(config.filesPath);
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: TDR_MAX_BYTES, files: 1, fields: 0, parts: 1 } }).single('file');

  router.get('/', (req, res) => {
    const parsed = parseListQuery(req.query, tdrListSpec);
    const { records, total } = repo.list(parsed);
    sendList(res, 'tdr-documents', parsed.range, records, total);
  });

  router.post('/', (req, res, next) => {
    if (!req.is('multipart/form-data')) return next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected multipart/form-data'));
    upload(req, res, (err?: unknown) => {
      try {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') throw validationError({ file: TOO_LARGE });
        if (err) throw badRequest(err instanceof multer.MulterError ? 'Invalid multipart body: send one "file"' : 'Malformed multipart body');
        const file = req.file;
        if (!file || file.size === 0) throw validationError({ file: 'Required' });
        const contentType = sniffContentType(file.buffer);
        if (!contentType) throw validationError({ file: NOT_A_TDR });
        // Browsers send the name in UTF-8 but multer reads it as Latin-1.
        const fileName = (Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[\\/\0]/g, '_').trim() || 'documento').slice(0, 255);
        const now = new Date().toISOString();
        const id = db.transaction(() => {
          const id = Number(db.prepare(`INSERT INTO tdr_documents (file_name, content_type, size, sha256, run_after, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(fileName, contentType, file.size, createHash('sha256').update(file.buffer).digest('hex'), now, req.user!.email, now, now).lastInsertRowid);
          // Inside the transaction: a file that can't be written leaves no entry without one.
          files.write(tdrFileName({ id, content_type: contentType }), file.buffer);
          return id;
        })();
        req.log.info({ tdrDocumentId: id, contentType, size: file.size }, 'tdr upload');
        res.status(201).json(repo.get(id));
        nudge();
      } catch (error) { next(error); }
    });
  });

  router.get('/:id', (req, res) => res.json(repo.get(parseId(req.params.id))));

  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const row = repo.row(id);
    if (row.status !== 'done') throw conflict('The document has not been analyzed yet');
    const body = requireObjectBody(req.body);
    const parsed = extractionSchema.safeParse(body.extraction);
    if (!parsed.success) {
      const errors = Object.fromEntries(parsed.error.issues.map((i) => [['extraction', ...i.path.map(String)].join('.'), i.message]).reverse());
      throw validationError(errors);
    }
    db.prepare('UPDATE tdr_documents SET extraction_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(parsed.data), new Date().toISOString(), id);
    res.json(repo.get(id));
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const current = repo.get(id);
    const row = repo.row(id);
    db.prepare('DELETE FROM tdr_documents WHERE id = ?').run(id);
    files.remove(tdrFileName(row));
    res.json(current);
  });

  router.post('/:id/analyze', (req, res) => {
    const id = parseId(req.params.id);
    const row = repo.row(id);
    if (row.status === 'pending' || row.status === 'running') throw conflict('The document is already being analyzed');
    const now = new Date().toISOString();
    db.prepare("UPDATE tdr_documents SET status = 'pending', attempts = 0, run_after = ?, error = NULL, error_detail = NULL, updated_at = ? WHERE id = ?").run(now, now, id);
    res.status(202).json(repo.get(id));
    nudge();
  });

  router.post('/:id/quote', (req, res) => {
    const id = parseId(req.params.id);
    const quoteId = createQuoteFromTdr(db, repo.row(id), req.user!.email);
    res.status(201).json(quotesRepository(db).get(quoteId));
    nudgeQuotes();
  });

  router.get('/:id/file', (req, res) => {
    const row = repo.row(parseId(req.params.id));
    const data = files.read(tdrFileName(row));
    if (!data) throw new HttpError(404, 'NOT_FOUND', 'File not found');
    res.attachment(row.file_name);
    if (req.query.download !== '1') res.set('Content-Disposition', res.get('Content-Disposition')!.replace(/^attachment/, 'inline'));
    res.set({ 'Content-Type': row.content_type, 'Content-Length': String(data.length), 'Cache-Control': 'private, no-cache' });
    res.send(data);
  });

  return router;
}
