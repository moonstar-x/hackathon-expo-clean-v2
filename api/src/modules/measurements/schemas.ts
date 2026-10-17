import { z } from 'zod';
import { type FieldErrors, validationError } from '../../lib/errors.ts';
import { roundQuantity } from '../../lib/numbers.ts';
import { nullableText, requiredText } from '../../lib/validation.ts';
import { zodIssuesToErrors } from '../../middleware/errorHandler.ts';

const number = z.number().min(0).max(1_000_000).transform(roundQuantity);
const count = z.number().int().min(0).max(1_000_000);
const uuid = z.uuid().transform((s) => s.toLowerCase());
export const measurementUpdateSchema = z.object({ name: requiredText(100), notes: nullableText(1000) });
const traffic = z.enum(['low','medium','high']).nullish();
const quotingSchema = z.object({ scheduleCode: z.string().max(50).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).nullish(), daysPerMonth: z.number().int().min(1).max(31).nullish(), traffic }).nullish();
const roomQuotingSchema = z.object({ traffic, fixedPosts: z.number().int().min(0).max(100).optional(), fixtures: z.object({ toilets:z.number().int().min(0).max(500), urinals:z.number().int().min(0).max(500), sinks:z.number().int().min(0).max(500) }).nullish() }).nullish();
export const metadataSchema = z.object({
  quoting: quotingSchema,
  clientId: uuid, name: requiredText(100),
  scannedAt: z.iso.datetime({ offset: true }).transform((v) => new Date(v).toISOString()),
  footprint: z.object({ width: number, length: number }).nullable(),
  isMerged: z.boolean(), geometryVersion: z.number().int().min(1).max(1_000_000),
  rooms: z.array(z.object({
    locationType: z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,49}$/).nullish(), quoting:roomQuotingSchema,
    id: uuid, index: count, name: requiredText(100),
    type: z.enum(['bedroom', 'bathroom', 'kitchen', 'livingRoom', 'diningRoom']).nullable(),
    floorArea: number.nullable(), isFloorApproximate: z.boolean(), perimeter: number,
    ceilingHeight: number.nullable(), wallCount: count, doorCount: count,
    windowCount: count, openingCount: count, objectCount: count,
  })).min(1).max(100).superRefine((rooms, ctx) => {
    const ids = new Set<string>();
    const indexes = new Set<number>();
    rooms.forEach((r, i) => {
      if (ids.has(r.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: 'Room IDs must be unique' });
      if (indexes.has(r.index) || r.index >= rooms.length) ctx.addIssue({ code: 'custom', path: [i, 'index'], message: 'Room indexes must be consecutive from zero' });
      ids.add(r.id); indexes.add(r.index);
    });
  }),
  appVersion: nullableText(50), deviceModel: nullableText(50),
});
export type MeasurementUpdate = z.output<typeof measurementUpdateSchema>;
export type MeasurementMetadata = z.output<typeof metadataSchema>;
export const FILE_TYPES = Object.freeze({ geometry: 'application/json', floorPlan: 'image/png', thumbnail: 'image/png', model: 'model/vnd.usdz+zip', csv: 'text/csv; charset=utf-8', raw: 'application/json' });
export const FILE_SUFFIXES = Object.freeze({ geometry: '.geometria.json', floorPlan: '-plano.png', thumbnail: '-miniatura.png', model: '.usdz', csv: '-medidas.csv', raw: '.roomplan.json' });
export type FileKind = keyof typeof FILE_TYPES;
/** Multipart parts by field name, shaped like multer's `req.files`. Only the first part of each is read. */
export type UploadedFiles = Record<string, { buffer: Buffer }[]>;
const png = Buffer.from('89504e470d0a1a0a', 'hex');
const zip = Buffer.from('504b0304', 'hex');
const decode = (b: Buffer) => new TextDecoder('utf-8', { fatal: true }).decode(b);
export function validateUpload(metadata: unknown, files: UploadedFiles): MeasurementMetadata {
  const result = metadataSchema.safeParse(metadata);
  const errors: FieldErrors = result.success ? {} : zodIssuesToErrors(result.error.issues);
  if (!result.success && result.error.issues.some((i) => i.path.length === 0)) errors.metadata = 'Must be an object';
  for (const kind of ['geometry', 'floorPlan']) if (!files[kind]?.length) errors[kind] = 'Required';
  for (const [kind, parts] of Object.entries(files)) {
    const b = parts[0].buffer;
    try {
      if (['floorPlan', 'thumbnail'].includes(kind) && !b.subarray(0, 8).equals(png)) throw new Error('Must be a PNG image');
      if (kind === 'model' && !b.subarray(0, 4).equals(zip)) throw new Error('Must be a USDZ zip archive');
      if (kind === 'csv') decode(b);
      if (['geometry', 'raw'].includes(kind)) {
        const json = JSON.parse(decode(b));
        if (kind === 'geometry') {
          if (!json || !Number.isInteger(json.version) || !Array.isArray(json.rooms)) throw new Error('Invalid geometry');
          if (result.success) {
            if (json.version !== result.data.geometryVersion) throw new Error('Geometry version must match geometryVersion');
            const ids = json.rooms.map((r: { id?: unknown } | null) => typeof r?.id === 'string' ? r.id.toLowerCase() : '').sort();
            const expected = result.data.rooms.map((r) => r.id).sort();
            if (JSON.stringify(ids) !== JSON.stringify(expected)) throw new Error('Geometry room IDs must match metadata rooms');
          }
        }
      }
    } catch (err) { errors[kind] = err instanceof SyntaxError || err instanceof TypeError ? 'Must contain valid UTF-8 JSON or text' : (err as Error).message; }
  }
  // A failed parse always leaves at least one entry in `errors`.
  if (!result.success || Object.keys(errors).length) throw validationError(errors);
  return result.data;
}
