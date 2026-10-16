import { z } from 'zod';
import { requiredText, nullableText } from '../../lib/validation.js';
import { roundQuantity } from '../../lib/numbers.js';
import { validationError } from '../../lib/errors.js';
import { zodIssuesToErrors } from '../../middleware/errorHandler.js';

const number = z.number().min(0).max(1_000_000).transform(roundQuantity);
const count = z.number().int().min(0).max(1_000_000);
const uuid = z.uuid().transform((s) => s.toLowerCase());
export const measurementUpdateSchema = z.object({ name: requiredText(100), notes: nullableText(1000) });
export const metadataSchema = z.object({
  clientId: uuid, name: requiredText(100),
  scannedAt: z.iso.datetime({ offset: true }).transform((v) => new Date(v).toISOString()),
  footprint: z.object({ width: number, length: number }).nullable(),
  isMerged: z.boolean(), geometryVersion: z.number().int().min(1).max(1_000_000),
  rooms: z.array(z.object({
    id: uuid, index: count, name: requiredText(100),
    type: z.enum(['bedroom', 'bathroom', 'kitchen', 'livingRoom', 'diningRoom']).nullable(),
    floorArea: number.nullable(), isFloorApproximate: z.boolean(), perimeter: number,
    ceilingHeight: number.nullable(), wallCount: count, doorCount: count,
    windowCount: count, openingCount: count, objectCount: count,
  })).min(1).max(100).superRefine((rooms, ctx) => {
    const ids = new Set();
    const indexes = new Set();
    rooms.forEach((r, i) => {
      if (ids.has(r.id)) ctx.addIssue({ code: 'custom', path: [i, 'id'], message: 'Room IDs must be unique' });
      if (indexes.has(r.index) || r.index >= rooms.length) ctx.addIssue({ code: 'custom', path: [i, 'index'], message: 'Room indexes must be consecutive from zero' });
      ids.add(r.id); indexes.add(r.index);
    });
  }),
  appVersion: nullableText(50), deviceModel: nullableText(50),
});
export const FILE_TYPES = Object.freeze({ geometry: 'application/json', floorPlan: 'image/png', thumbnail: 'image/png', model: 'model/vnd.usdz+zip', csv: 'text/csv; charset=utf-8', raw: 'application/json' });
export const FILE_SUFFIXES = Object.freeze({ geometry: '.geometria.json', floorPlan: '-plano.png', thumbnail: '-miniatura.png', model: '.usdz', csv: '-medidas.csv', raw: '.roomplan.json' });
const png = Buffer.from('89504e470d0a1a0a', 'hex');
const zip = Buffer.from('504b0304', 'hex');
const decode = (b) => new TextDecoder('utf-8', { fatal: true }).decode(b);
export function validateUpload(metadata, files) {
  const result = metadataSchema.safeParse(metadata);
  const errors = result.success ? {} : zodIssuesToErrors(result.error.issues);
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
            const ids = json.rooms.map((r) => typeof r?.id === 'string' ? r.id.toLowerCase() : '').sort();
            const expected = result.data.rooms.map((r) => r.id).sort();
            if (JSON.stringify(ids) !== JSON.stringify(expected)) throw new Error('Geometry room IDs must match metadata rooms');
          }
        }
      }
    } catch (err) { errors[kind] = err instanceof SyntaxError || err instanceof TypeError ? 'Must contain valid UTF-8 JSON or text' : err.message; }
  }
  if (Object.keys(errors).length) throw validationError(errors);
  return result.data;
}
