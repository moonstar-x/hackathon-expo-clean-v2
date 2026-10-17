import express from 'express';
import multer from 'multer';
import type { AppDeps } from '../../app.ts';
import { createCrudRouter } from '../../lib/crudRouter.ts';
import { HttpError, badRequest, notFound } from '../../lib/errors.ts';
import { publicUrlFor } from '../../lib/publicUrl.ts';
import { parseId } from '../../lib/validation.ts';
import { createMeasurementsRepository, measurementListSpec } from './repository.ts';
import { FILE_SUFFIXES, FILE_TYPES, type FileKind, measurementUpdateSchema, validateUpload } from './schemas.ts';

export function measurementsRouter({ db, config }: AppDeps, nudge: () => void = () => {}) {
  const repository = createMeasurementsRepository(db, config);
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.uploadMaxFileBytes, fields: 1, files: 6, parts: 7, fieldSize: 1024 * 1024 } }).fields(Object.keys(FILE_TYPES).map((name) => ({ name, maxCount: 1 })));
  router.post('/', (req, res, next) => {
    if (!req.is('multipart/form-data')) return next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Expected multipart/form-data'));
    upload(req, res, (err?: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) return next(err);
        return next(badRequest('Malformed multipart body'));
      }
      try {
        if (Object.keys(req.body ?? {}).some((k) => k !== 'metadata') || Array.isArray(req.body?.metadata)) throw badRequest('Unknown or duplicate multipart field');
        let metadata: unknown = {};
        if (req.body?.metadata !== undefined) {
          try { metadata = JSON.parse(req.body.metadata); } catch { throw badRequest('Metadata must be valid JSON'); }
        }
        // `.fields()` always produces the by-name form of `req.files`.
        const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
        const data = validateUpload(metadata, files);
        // Mounted behind requireAuth, so `req.user` is set.
        const result = repository.upload(data, files, req.user!);
        req.log.info({ measurementId: result.record.id, clientId: data.clientId, fileKinds: Object.keys(files), totalBytes: Object.values(files).reduce((n, a) => n + a[0].size, 0) }, 'measurement upload');
        if (result.created) res.location(publicUrlFor(config, `/api/measurements/${result.record.id}`));
        res.status(result.created ? 201 : 200).json(result.record);
        nudge();
      } catch (error) { next(error); }
    });
  });
  router.get('/:id/files/:kind', (req, res) => {
    const id = parseId(req.params.id), kind = req.params.kind as FileKind;
    const measurement = repository.findById(id);
    if (!measurement || !Object.hasOwn(FILE_TYPES, kind)) throw notFound('Measurement file not found');
    const file = repository.file(id, kind);
    if (!file) throw notFound('Measurement file not found');
    const etag = `"${file.sha256}"`;
    res.set({ 'Content-Type': file.content_type, 'Content-Length': String(file.size), ETag: etag, 'Cache-Control': 'private, max-age=31536000, immutable' });
    const base = measurement.name.replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-') || `medicion-${id}`;
    res.attachment(base + FILE_SUFFIXES[kind]);
    if (req.query.download !== '1') res.set('Content-Disposition', res.get('Content-Disposition')!.replace(/^attachment/, 'inline'));
    // attachment() infers a MIME type from the filename; the stored type is authoritative.
    res.setHeader('Content-Type', file.content_type);
    if (req.get('If-None-Match')?.split(/,\s*/).includes(etag)) return res.status(304).end();
    res.send(file.data);
  });
  router.use(createCrudRouter({ listSpec: measurementListSpec, repository, updateSchema: measurementUpdateSchema, writableFields: ['name', 'notes'], label: 'Measurement' }));
  return router;
}
