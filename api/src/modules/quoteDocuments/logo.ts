import { createHash } from 'node:crypto';
import zlib from 'node:zlib';
import { HttpError } from '../../lib/errors.ts';
import type { QuoteDocument } from './types.ts';

export const LOGO_MAX_BYTES = 1024 * 1024, LOGO_MAX_SIDE = 2000, LOGO_TYPES = ['image/png', 'image/jpeg'] as const;
export interface LogoInfo { sha256: string; contentType: typeof LOGO_TYPES[number]; width: number; height: number }
const NOT_IMAGE = 'Must be a PNG or JPEG image', PNG_FORMAT = 'Must be an 8-bit RGB or RGBA PNG', JPEG_FORMAT = 'Must be an RGB JPEG without EXIF metadata';
const invalid = (message: string) => new HttpError(422, 'VALIDATION_ERROR', 'Validation failed', { logo: message });
const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');
function size(width: number, height: number) {
  if (!width || !height) throw invalid(NOT_IMAGE);
  if (width > LOGO_MAX_SIDE || height > LOGO_MAX_SIDE) throw invalid(`Must be at most ${LOGO_MAX_SIDE} px wide and tall`);
  return { width, height };
}
// pdfkit decodes PNGs inside a zlib callback whose errors would take the process down, so a PNG is decoded here
// first. Only the 8-bit, non-interlaced RGB(A) PNGs that browser canvases write are accepted.
function pngSize(b: Buffer) {
  if (b.length < 33 || b.readUInt32BE(8) !== 13 || b.toString('latin1', 12, 16) !== 'IHDR') throw invalid(NOT_IMAGE);
  const [depth, colorType, , , interlace] = b.subarray(24, 29);
  if (depth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) throw invalid(PNG_FORMAT);
  const { width, height } = size(b.readUInt32BE(16), b.readUInt32BE(20)), row = 1 + width * (colorType === 6 ? 4 : 3), idat: Buffer[] = [];
  for (let pos = 33; ; ) {
    if (pos + 12 > b.length) throw invalid(NOT_IMAGE);
    const length = b.readUInt32BE(pos), type = b.toString('latin1', pos + 4, pos + 8), end = pos + 12 + length;
    if (end > b.length) throw invalid(NOT_IMAGE);
    if (type === 'IEND') break;
    if (type === 'IDAT') idat.push(b.subarray(pos + 8, pos + 8 + length));
    pos = end;
  }
  let pixels: Buffer;
  try { pixels = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: row * height + 1 }); } catch { throw invalid(NOT_IMAGE); }
  if (pixels.length !== row * height) throw invalid(NOT_IMAGE);
  for (let r = 0; r < height; r++) if (pixels[r * row] > 4) throw invalid(NOT_IMAGE);
  return { width, height };
}
// pdfkit embeds a JPEG verbatim, so EXIF (location, orientation Excel ignores) would reach the client, and CMYK
// prints inverted.
function jpegSize(b: Buffer) {
  let frame: { width: number; height: number } | null = null;
  for (let pos = 2; ; ) {
    if (pos + 2 > b.length || b[pos] !== 0xff) throw invalid(NOT_IMAGE);
    const marker = b[pos + 1];
    if (marker === 0xff) { pos++; continue; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { pos += 2; continue; }
    if (marker === 0xda && frame) return frame;
    if (marker === 0xd9 || marker === 0xda || pos + 4 > b.length) throw invalid(NOT_IMAGE);
    const length = b.readUInt16BE(pos + 2), end = pos + 2 + length;
    if (length < 2 || end > b.length) throw invalid(NOT_IMAGE);
    if (marker === 0xe1 && b.toString('latin1', pos + 4, pos + 10) === 'Exif\0\0') throw invalid(JPEG_FORMAT);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (length < 8) throw invalid(NOT_IMAGE);
      if (b[pos + 9] !== 3) throw invalid(JPEG_FORMAT);
      frame = size(b.readUInt16BE(pos + 7), b.readUInt16BE(pos + 5));
    }
    pos = end;
  }
}
/** Checks an uploaded logo's bytes and reads its type and pixel size, without an image library. */
export function readLogo(data: Buffer): LogoInfo {
  if (data.length > 8 && data.readUInt32BE(0) === 0x89504e47 && data.readUInt32BE(4) === 0x0d0a1a0a) return { sha256: sha256(data), contentType: 'image/png', ...pngSize(data) };
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { sha256: sha256(data), contentType: 'image/jpeg', ...jpegSize(data) };
  throw invalid(NOT_IMAGE);
}
/** The logo bytes for a document's renderers: they must be the logo the document was built with. */
export function documentLogo(d: QuoteDocument, data: Buffer | null): Buffer | null {
  if ((data ? sha256(data) : null) !== (d.logo?.sha256 ?? null)) throw new Error('The logo does not match the document');
  return data;
}
