import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createLogger } from '../src/app.ts';
import { seed } from '../src/db/seed.ts';
import { documentColors } from '../src/modules/quoteDocuments/colors.ts';
import { LOGO_MAX_BYTES } from '../src/modules/quoteDocuments/logo.ts';
import { createQuoteWorker } from '../src/modules/quotes/worker.ts';
import { documentFixture } from './documentFixture.ts';
import { makeClient, type TestClient } from './helpers.ts';

let ctx: TestClient | undefined;
afterEach(() => { if (ctx) { ctx.db.close(); fs.rmSync(ctx.config.filesPath, { recursive: true, force: true }); } ctx = undefined; });
const logoFiles = () => { const dir = path.join(ctx!.config.filesPath, 'logos'); return fs.existsSync(dir) ? fs.readdirSync(dir) : []; };
const LOGO = fs.readFileSync(new URL('./fixtures/quote-document/logo.png', import.meta.url));
const u16 = (n: number) => Buffer.from([n >> 8, n & 255]);
// A PNG with the given header and zeroed pixels, unless `idat` replaces the compressed data.
function png(width: number, height: number, { depth = 8, colorType = 6, interlace = 0, filter = 0, idat }: { depth?: number; colorType?: number; interlace?: number; filter?: number; idat?: Buffer } = {}) {
  const chunk = (type: string, body: Buffer) => { const head = Buffer.alloc(8); head.writeUInt32BE(body.length); head.write(type, 4, 'latin1'); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), body]))); return Buffer.concat([head, body, crc]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header.set([depth, colorType, 0, 0, interlace], 8);
  const row = 1 + width * (colorType === 6 ? 4 : 3), pixels = Buffer.alloc(row * height); for (let r = 0; r < height; r++) pixels[r * row] = filter;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', idat ?? zlib.deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
// A JPEG's markers around an empty scan: enough for the header checks, not to be decoded.
function jpeg(width: number, height: number, { components = 3, exif = false } = {}) {
  const segment = (marker: number, body: Buffer) => Buffer.concat([Buffer.from([0xff, marker]), u16(body.length + 2), body]);
  const frame = Buffer.concat([Buffer.from([8]), u16(height), u16(width), Buffer.from([components]), ...Array.from({ length: components }, (_, i) => Buffer.from([i + 1, 0x11, 0]))]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), segment(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')), ...(exif ? [segment(0xe1, Buffer.from('Exif\0\0MM\0*', 'latin1'))] : []), segment(0xc0, frame), segment(0xda, Buffer.from([1, 1, 0, 0, 63, 0])), Buffer.from([0, 0xff, 0xd9])]);
}
const upload = (body: Buffer | string, type = 'image/png', path = '/api/quote-document-settings/1/logo') => request(ctx!.app).put(path).set('Authorization', `Bearer ${ctx!.token}`).set('Content-Type', type).send(body);
const binary = (req: request.Test) => req.buffer(true).parse((res, done) => { const chunks: Buffer[] = []; res.on('data', (c: Buffer) => chunks.push(c)); res.on('end', () => done(null, Buffer.concat(chunks))); });

describe('company logo', () => {
  it('stores, serves, replaces and removes the logo', async () => {
    ctx = await makeClient(); const { api } = ctx;
    expect((await api.get('/api/quote-document-settings/1/logo')).status).toBe(404);
    let r = await upload(LOGO); expect(r.status).toBe(200);
    expect(r.body).toEqual({ contentType: 'image/png', width: 800, height: 151, size: LOGO.length, sha256: expect.stringMatching(/^[a-f0-9]{64}$/), updatedBy: 'admin@example.com', updatedAt: expect.any(String) });
    const etag = `"${r.body.sha256}"`;
    // The bytes are a file named after them; the database keeps only the logo's details.
    expect(logoFiles()).toEqual([`${r.body.sha256}.png`]); expect(Buffer.compare(fs.readFileSync(path.join(ctx.config.filesPath, 'logos', `${r.body.sha256}.png`)), LOGO)).toBe(0);
    expect((ctx.db.prepare('PRAGMA table_info(quote_document_logo)').all() as { name: string }[]).map(c => c.name)).not.toContain('data');
    r = await binary(api.get('/api/quote-document-settings/1/logo')); expect(r.status).toBe(200); expect(r.headers['content-type']).toBe('image/png'); expect(r.headers.etag).toBe(etag); expect(r.headers['cache-control']).toBe('private, no-cache'); expect(Buffer.compare(r.body, LOGO)).toBe(0);
    expect((await api.get('/api/quote-document-settings/1/logo').set('If-None-Match', etag)).status).toBe(304);
    const photo = jpeg(640, 480); r = await upload(photo, 'image/jpeg'); expect(r.body).toMatchObject({ contentType: 'image/jpeg', width: 640, height: 480, size: photo.length });
    expect(logoFiles()).toEqual([`${r.body.sha256}.jpg`]);
    r = await binary(api.get('/api/quote-document-settings/1/logo')); expect(r.headers['content-type']).toBe('image/jpeg'); expect(Buffer.compare(r.body, photo)).toBe(0);
    expect((await api.delete('/api/quote-document-settings/1/logo')).status).toBe(204); expect(logoFiles()).toEqual([]);
    r = await api.get('/api/quote-document-settings/1/logo'); expect(r.status).toBe(404); expect(r.body.message).toBe('Logo not found');
    expect((await api.delete('/api/quote-document-settings/1/logo')).status).toBe(204);
  });
  it('refuses other files, corrupt or unsupported images and large ones, and keeps serving', async () => {
    ctx = await makeClient();
    const r = await upload('hola', 'text/plain'); expect(r.status).toBe(415); expect(r.body).toEqual({ code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Logo must be a PNG or JPEG image' });
    const refused = async (body: Buffer, logo: string, type = 'image/png') => { const res = await upload(body, type); expect(res.status).toBe(422); expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR', errors: { logo } }); };
    for (const body of [Buffer.from('not an image'), Buffer.alloc(0), LOGO.subarray(0, 200), png(4, 4, { idat: Buffer.from('not zlib data') }), png(4, 4, { idat: zlib.deflateSync(Buffer.alloc(10)) }), png(4, 4, { filter: 9 })]) await refused(body, 'Must be a PNG or JPEG image');
    for (const options of [{ colorType: 3 }, { colorType: 0 }, { depth: 16 }, { interlace: 1 }]) await refused(png(4, 4, options), 'Must be an 8-bit RGB or RGBA PNG');
    await refused(png(2001, 10), 'Must be at most 2000 px wide and tall'); await refused(jpeg(10, 2001), 'Must be at most 2000 px wide and tall', 'image/jpeg');
    for (const body of [jpeg(64, 64, { exif: true }), jpeg(64, 64, { components: 4 }), jpeg(64, 64, { components: 1 })]) await refused(body, 'Must be an RGB JPEG without EXIF metadata', 'image/jpeg');
    await refused(jpeg(64, 64).subarray(0, 12), 'Must be a PNG or JPEG image', 'image/jpeg');
    const large = await upload(Buffer.concat([LOGO, Buffer.alloc(LOGO_MAX_BYTES)])); expect(large.status).toBe(413); expect(large.body.code).toBe('PAYLOAD_TOO_LARGE');
    expect((await ctx.api.get('/api/quote-document-settings/1/logo')).status).toBe(404); expect((await ctx.api.get('/api/quote-document-settings/1')).status).toBe(200);
  });
  it('treats a logo whose file has gone missing as no logo, and takes a new one', async () => {
    ctx = await makeClient(); const { api } = ctx;
    const { sha256 } = (await upload(LOGO)).body; fs.rmSync(path.join(ctx.config.filesPath, 'logos', `${sha256}.png`));
    expect((await api.get('/api/quote-document-settings/1/logo')).status).toBe(404);
    expect((await upload(LOGO)).status).toBe(200); expect((await api.get('/api/quote-document-settings/1/logo')).status).toBe(200);
  });
  it('only knows logo 1', async () => {
    ctx = await makeClient(); const { api } = ctx;
    expect((await api.get('/api/quote-document-settings/2/logo')).status).toBe(404); expect((await upload(LOGO, 'image/png', '/api/quote-document-settings/2/logo')).status).toBe(404); expect((await api.delete('/api/quote-document-settings/2/logo')).status).toBe(404);
  });
  it('puts the logo and the company color on the quote document as a new revision, without the logo bytes in the export log', async () => {
    ctx = await makeClient(); seed(ctx.db, { createdBy: 'admin@example.com' }); const { api, db } = ctx;
    const input = documentFixture(); await api.put('/api/quote-document-settings/1', input.settings); await api.put('/api/quotes/1/document', input.data); await api.put('/api/quotes/1', { assumptionsConfirmed: true });
    createQuoteWorker({ db, config: ctx.config, logger: createLogger(ctx.config) }).processNextJob();
    let s = (await api.get('/api/quotes/1/document')).body; expect(s.ready).toBe(true); expect(s.document.logo).toBeNull(); expect(s.document.colors).toEqual(documentColors('#4F46E5'));
    expect((await api.post('/api/quotes/1/document/exports', { format: 'pdf', contentHash: s.contentHash })).body.revision).toBe(1);
    const plain = s.contentHash; await api.put('/api/quote-document-settings/1', { brandColor: '#16a34a' });
    s = (await api.get('/api/quotes/1/document')).body; expect(s.document.colors).toEqual(documentColors('#16A34A')); expect(s.contentHash).not.toBe(plain); expect(s.revision).toBe(2);
    const colored = s.contentHash, { sha256 } = (await upload(LOGO)).body;
    s = (await api.get('/api/quotes/1/document')).body; expect(s.document.logo).toEqual({ sha256, contentType: 'image/png', width: 800, height: 151 }); expect(s.contentHash).not.toBe(colored); expect(s.revision).toBe(2);
    const pdf = await binary(api.get('/api/quotes/1/document/pdf')); expect(pdf.status).toBe(200); expect(pdf.headers['x-document-hash']).toBe(s.contentHash); expect((pdf.body as Buffer).includes('/Subtype /Image')).toBe(true);
    const book = new ExcelJS.Workbook(); await book.xlsx.load((await binary(api.get('/api/quotes/1/document/xlsx'))).body as ExcelJS.Buffer);
    const main = book.getWorksheet('Cotización')!; expect(main.getImages()).toHaveLength(1);
    let header: ExcelJS.Row | undefined; main.eachRow(row => { if (row.getCell(2).value === 'Descripción') header = row; });
    expect((header!.getCell(2).fill as ExcelJS.FillPattern).fgColor?.argb).toBe('16A34A'); expect(header!.getCell(2).font.color?.argb).toBe('0F172A');
    expect((await api.post('/api/quotes/1/document/exports', { format: 'xlsx', contentHash: s.contentHash })).body.revision).toBe(2);
    const json = (db.prepare('SELECT document_json FROM quote_document_exports ORDER BY id DESC').get() as { document_json: string }).document_json;
    expect(JSON.parse(json).logo).toEqual({ sha256, contentType: 'image/png', width: 800, height: 151 }); expect(json).not.toContain(LOGO.subarray(0, 64).toString('base64'));
    await api.delete('/api/quote-document-settings/1/logo'); s = (await api.get('/api/quotes/1/document')).body; expect(s.document.logo).toBeNull(); expect(s.revision).toBe(3);
  });
});
