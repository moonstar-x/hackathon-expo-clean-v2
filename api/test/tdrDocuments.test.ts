import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fileStore } from '../src/lib/fileStore.ts';
import { computeQuote } from '../src/modules/quotes/engine/index.ts';
import { readZones } from '../src/modules/quotes/repository.ts';
import { createQuoteWorker } from '../src/modules/quotes/worker.ts';
import { extractTdr, OPENROUTER_URL, parseReply, requestBody, TdrError, type Extractor } from '../src/modules/tdrDocuments/extractor.ts';
import { tdrCatalog } from '../src/modules/tdrDocuments/repository.ts';
import { DOCX_TYPE, extractionSchema, normalizeExtraction, PDF_TYPE, type TdrCatalog, type TdrExtraction } from '../src/modules/tdrDocuments/schemas.ts';
import { createTdrWorker, TDR_MAX_ATTEMPTS } from '../src/modules/tdrDocuments/worker.ts';
import { makeClient, type TestClient } from './helpers.ts';

const logger = pino({ level: 'silent' });
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
const DOCX = fs.readFileSync(new URL('./fixtures/tdr/sample.docx', import.meta.url));
const EMPTY_DOCX = fs.readFileSync(new URL('./fixtures/tdr/empty.docx', import.meta.url));
const catalog: TdrCatalog = { zoneTypes: [{ id: 9, name: 'UCI', risk: 'critical' }, { id: 2, name: 'Área administrativa (hospital)', risk: 'noncritical' }], schedules: [{ id: 1, name: 'Diurno 8 h', serviceHoursPerDay: 8 }, { id: 4, name: '24/7', serviceHoursPerDay: 24 }] };

/** What the model would answer for the sample hospital TDR. */
const reply = {
  title: 'Servicio integral de limpieza hospitalaria',
  summary: 'Limpieza y desinfección 24 horas.',
  client: { legalName: 'Hospital General San Francisco de Quito', taxId: '1760004650001', contactName: null, contactTitle: null, email: 'no es un correo', phone: null, address: null },
  city: 'Quito', installationType: 'publicHospital', referencePrice: 93507.74, contractMonths: 12, paymentTerms: 'Mensual', totalArea: 28000,
  serviceHours: '24 horas, 365 días',
  zones: [
    { name: 'UCI', risk: 'critical', zoneTypeId: 9, floorArea: null, fixedPosts: 1, hoursPerDay: 24, daysPerMonth: 30.4, notes: 'Área crítica' },
    { name: 'Planta baja (oficinas)', risk: 'noncritical', zoneTypeId: 2, floorArea: 450, fixedPosts: 3, hoursPerDay: 8, daysPerMonth: null, notes: null },
  ],
  staff: [{ role: 'Auxiliar de limpieza', count: 86, notes: null }],
  equipment: [{ description: 'Máquina abrillantadora', quantity: 4, notes: null }],
  supplies: [{ description: 'Detergente enzimático', presentation: 'Caja (12 sobres)', quantity: 42, frequency: 'mensual' }],
  requirements: [{ text: 'Garantía de fiel cumplimiento del 5 %' }],
};

let ctx: TestClient;
beforeEach(async () => { ctx = await makeClient({ OPENROUTER_API_KEY: 'sk-or-test' }); });
afterEach(() => ctx.db.close());

const upload = (name: string, data: Buffer) => request(ctx.app).post('/api/tdr-documents').set('Authorization', `Bearer ${ctx.token}`).attach('file', data, name);
const worker = (extract: Extractor) => createTdrWorker({ db: ctx.db, logger, config: ctx.config, files: fileStore(ctx.config.filesPath), extract });
const answering = (value: unknown = reply): Extractor => async (input) => normalizeExtraction(value, input.catalog);
async function analyzed(value: unknown = reply) {
  const id = (await upload('ficha.pdf', PDF)).body.id as number;
  // The worker takes the oldest entry first: run it until this one is analyzed.
  const w = worker(answering(value));
  while (await w.processNext()) { /* next */ }
  return id;
}

describe('upload', () => {
  it('stores a PDF or a .docx as a pending entry, and refuses anything else', async () => {
    expect((await ctx.api.post('/api/tdr-documents', {})).status).toBe(415);
    const none = await request(ctx.app).post('/api/tdr-documents').set('Authorization', `Bearer ${ctx.token}`).field('x', '1');
    expect(none.status).toBe(400);
    expect((await upload('notes.txt', Buffer.from('hello'))).body.errors).toEqual({ file: 'Must be a PDF or Word (.docx) file' });
    // A renamed file is judged by its content.
    expect((await upload('ficha.pdf', Buffer.from('PK\x03\x04 not a document'))).status).toBe(422);

    const pdf = await upload('Ficha técnica.pdf', PDF);
    expect(pdf.status).toBe(201);
    expect(pdf.body).toMatchObject({ fileName: 'Ficha técnica.pdf', contentType: PDF_TYPE, size: PDF.length, status: 'pending', attempts: 0, extraction: null, quoteId: null, createdBy: 'admin@example.com' });
    const docx = await upload('tdr.docx', DOCX);
    expect(docx.body.contentType).toBe(DOCX_TYPE);
    expect(fs.existsSync(path.join(ctx.config.filesPath, 'tdr', `${pdf.body.id}.pdf`))).toBe(true);

    const file = await ctx.api.get(`/api/tdr-documents/${pdf.body.id}/file`, { download: '1' });
    expect(file.headers['content-type']).toBe(PDF_TYPE);
    expect(file.headers['content-disposition']).toMatch(/^attachment/);
    expect(Buffer.from(file.body)).toEqual(PDF);

    const list = await ctx.api.list('/api/tdr-documents', { filter: { status: 'pending' } });
    expect(list.headers['content-range']).toBe('tdr-documents 0-1/2');
    expect(list.body[0]).not.toHaveProperty('extraction');
  });

  it('refuses a file over 20 MB', async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(20 * 1024 * 1024)]);
    expect((await upload('big.pdf', big)).body.errors).toEqual({ file: 'Must be at most 20 MB' });
  });
});

describe('analysis job', () => {
  it('stores the extraction, with zone types and schedules only from the catalog', async () => {
    const id = await analyzed();
    const doc = (await ctx.api.get(`/api/tdr-documents/${id}`)).body;
    expect(doc).toMatchObject({ status: 'done', attempts: 1, error: null, model: 'anthropic/claude-haiku-5.5', title: reply.title, zoneCount: 2 });
    expect(doc.extraction.zones.map((z: TdrExtraction['zones'][number]) => [z.zoneTypeId, z.scheduleId])).toEqual([[9, 4], [2, 1]]);
    expect(extractionSchema.parse(doc.extraction)).toEqual(doc.extraction);
    expect((await ctx.api.list('/api/tdr-documents', { filter: { q: 'limpieza hospitalaria' } })).body).toHaveLength(1);
    expect(await worker(answering()).processNext()).toBe(false);
  });

  it('retries passing failures with backoff, then fails for good; fails at once otherwise', async () => {
    const id = (await upload('ficha.pdf', PDF)).body.id;
    const flaky = worker(async () => { throw new TdrError('OPENROUTER_UNAVAILABLE', 'HTTP 503', true); });
    await flaky.processNext();
    const row = () => ctx.db.prepare('SELECT status, attempts, error, error_detail, run_after FROM tdr_documents WHERE id = ?').get(id) as { status: string; attempts: number; error: string; error_detail: string; run_after: string };
    expect(row()).toMatchObject({ status: 'pending', attempts: 1, error: 'OPENROUTER_UNAVAILABLE' });
    expect(new Date(row().run_after).getTime()).toBeGreaterThan(Date.now() + 5000);
    expect(await flaky.processNext()).toBe(false);
    for (let i = 1; i < TDR_MAX_ATTEMPTS; i++) {
      ctx.db.prepare("UPDATE tdr_documents SET run_after = '2000'").run();
      await flaky.processNext();
    }
    expect(row()).toMatchObject({ status: 'failed', attempts: TDR_MAX_ATTEMPTS, error_detail: 'HTTP 503' });

    const other = (await upload('ficha.pdf', PDF)).body.id;
    await worker(async () => { throw new TdrError('OPENROUTER_AUTH', 'Invalid key'); }).processNext();
    expect((await ctx.api.get(`/api/tdr-documents/${other}`)).body).toMatchObject({ status: 'failed', error: 'OPENROUTER_AUTH', attempts: 1 });
  });

  it('fails when the stored file is gone, and Volver a analizar queues it again', async () => {
    const id = (await upload('ficha.pdf', PDF)).body.id;
    fs.rmSync(path.join(ctx.config.filesPath, 'tdr', `${id}.pdf`));
    await worker(answering()).processNext();
    expect((await ctx.api.get(`/api/tdr-documents/${id}`)).body.error).toBe('FILE_MISSING');
    const again = await ctx.api.post(`/api/tdr-documents/${id}/analyze`);
    expect(again.status).toBe(202);
    expect(again.body).toMatchObject({ status: 'pending', attempts: 0, error: null });
    expect((await ctx.api.post(`/api/tdr-documents/${id}/analyze`)).status).toBe(409);
  });

  it('never resurrects an entry deleted while it was analyzed', async () => {
    const id = (await upload('ficha.pdf', PDF)).body.id;
    await worker(async (input) => { await ctx.api.delete(`/api/tdr-documents/${id}`); return normalizeExtraction(reply, input.catalog); }).processNext();
    expect(ctx.db.prepare('SELECT count(*) FROM tdr_documents').pluck().get()).toBe(0);
    expect(fs.existsSync(path.join(ctx.config.filesPath, 'tdr', `${id}.pdf`))).toBe(false);
  });
});

describe('review', () => {
  it('saves the edited extraction only once analyzed, naming the field to fix', async () => {
    const pending = (await upload('ficha.pdf', PDF)).body.id;
    expect((await ctx.api.put(`/api/tdr-documents/${pending}`, { extraction: reply })).status).toBe(409);
    const id = await analyzed();
    const current = (await ctx.api.get(`/api/tdr-documents/${id}`)).body.extraction as TdrExtraction;
    const bad = await ctx.api.put(`/api/tdr-documents/${id}`, { extraction: { ...current, zones: [{ ...current.zones[0], name: ' ' }], referencePrice: -1 } });
    expect(bad.status).toBe(422);
    expect(bad.body.errors).toMatchObject({ 'extraction.zones.0.name': 'Required', 'extraction.referencePrice': 'Must be at least 0' });
    const saved = await ctx.api.put(`/api/tdr-documents/${id}`, { extraction: { ...current, title: 'Limpieza HGSFQ', zones: [current.zones[1]] } });
    expect(saved.body).toMatchObject({ title: 'Limpieza HGSFQ', zoneCount: 1 });
  });
});

describe('quote', () => {
  it('creates a quote with the document zones and client data, which the engine calculates', async () => {
    const pending = (await upload('ficha.pdf', PDF)).body.id;
    expect((await ctx.api.post(`/api/tdr-documents/${pending}/quote`)).status).toBe(409);
    const id = await analyzed();
    const created = await ctx.api.post(`/api/tdr-documents/${id}/quote`);
    expect(created.status).toBe(201);
    const quote = created.body;
    expect(quote).toMatchObject({ measurementId: null, name: reply.title, installationType: 'publicHospital', city: 'Quito', measurementOrigin: 'estimate', externalReferencePrice: 93507.74, assumptionsConfirmed: false, calculation: { state: 'pending' } });
    expect(quote.notes).toBe('Creada desde el documento TDR «ficha.pdf».\n\nLimpieza y desinfección 24 horas.');
    expect(quote.zones.map((z: Record<string, unknown>) => [z.name, z.origin, z.zoneTypeId, z.scheduleId, z.floorArea, z.fixedPosts, z.daysPerMonth, z.traffic, z.measurementSource])).toEqual([
      ['UCI', 'manual', 9, 4, null, 1, 30.4, 'medium', 'estimated'],
      ['Planta baja (oficinas)', 'manual', 2, 1, 450, 3, 22, 'medium', 'estimated'],
    ]);
    expect(quote.zones[1].sources).toMatchObject({ daysPerMonth: 'default', fixedPosts: 'manual', zoneTypeId: 'manual' });
    // An email the document form would refuse is left empty.
    expect((await ctx.api.get(`/api/quotes/${quote.id}/document`)).body.data).toMatchObject({ clientLegalName: 'Hospital General San Francisco de Quito', clientTaxId: '1760004650001', clientEmail: null, paymentTerms: 'Mensual', contractMonths: 12 });
    expect((await ctx.api.get(`/api/tdr-documents/${id}`)).body.quoteId).toBe(quote.id);
    expect((await ctx.api.post(`/api/tdr-documents/${id}/quote`)).body).toMatchObject({ code: 'CONFLICT', errors: { quoteId: String(quote.id) } });

    const quotes = createQuoteWorker({ db: ctx.db, logger, config: ctx.config, compute: computeQuote });
    expect(quotes.processNextJob()).toBe(true);
    const calculated = (await ctx.api.get(`/api/quotes/${quote.id}`)).body;
    expect(calculated).toMatchObject({ status: 'needsReview', calculation: { state: 'done' } });
    expect(readZones(ctx.db, quote.id)).toHaveLength(2);
    // The UCI zone has no area: Revisar names it, and the office zone is priced.
    expect(calculated.result.causes).toContainEqual({ code: 'ZONE_FLOOR_AREA_MISSING', zoneIndex: 0, params: { zona: 'UCI' } });
    expect(calculated.result.zones.map((z: { active: boolean }) => z.active)).toEqual([false, true]);
    expect(calculated.result.reference).not.toBeNull();

    // Deleting the quote lets the document create another.
    await ctx.api.delete(`/api/quotes/${quote.id}`);
    expect((await ctx.api.post(`/api/tdr-documents/${id}/quote`)).status).toBe(201);
  });

  it('needs at least one zone, and skips zone types deactivated since', async () => {
    const empty = await analyzed({ ...reply, zones: [] });
    expect((await ctx.api.post(`/api/tdr-documents/${empty}/quote`)).body.errors).toEqual({ zones: 'Add at least one zone' });
    const id = await analyzed();
    ctx.db.prepare('UPDATE quote_zone_types SET active = 0 WHERE id = 9').run();
    const quote = (await ctx.api.post(`/api/tdr-documents/${id}/quote`)).body;
    expect(quote.zones[0]).toMatchObject({ zoneTypeId: null, sources: { zoneTypeId: 'default' } });
  });

  it('deleting the entry keeps its quote and removes its file', async () => {
    const id = await analyzed();
    const quoteId = (await ctx.api.post(`/api/tdr-documents/${id}/quote`)).body.id;
    expect((await ctx.api.delete(`/api/tdr-documents/${id}`)).status).toBe(200);
    expect((await ctx.api.get(`/api/tdr-documents/${id}`)).status).toBe(404);
    expect((await ctx.api.get(`/api/quotes/${quoteId}`)).status).toBe(200);
  });
});

describe('normalization', () => {
  it('keeps what fits and drops what does not', () => {
    const n = normalizeExtraction({
      title: '  Limpieza\n de oficinas ', referencePrice: '12.500,00'.replace('.', '').replace(',', '.'), contractMonths: 1.5, installationType: 'hospital', totalArea: -3,
      client: 'not an object',
      zones: [{ name: '' }, { name: 'Oficinas', zoneTypeId: 77, hoursPerDay: 8, fixedPosts: -1, daysPerMonth: 40, risk: 'low' }, 'junk'],
      staff: [{ role: 'Supervisor', count: '2' }], requirements: ['Uniformes', { text: '' }], equipment: null,
    }, catalog);
    expect(n).toMatchObject({ title: 'Limpieza de oficinas', referencePrice: 12500, contractMonths: null, installationType: null, totalArea: null, client: { legalName: null }, equipment: [], staff: [{ role: 'Supervisor', count: 2 }], requirements: [{ text: 'Uniformes' }] });
    expect(n.zones).toEqual([{ name: 'Oficinas', risk: null, zoneTypeId: null, scheduleId: 1, floorArea: null, fixedPosts: null, hoursPerDay: 8, daysPerMonth: null, notes: null }]);
    expect(extractionSchema.parse(n)).toEqual(n);
    expect(normalizeExtraction(null, catalog).zones).toEqual([]);
  });

  it('reads the JSON object of a reply, fenced or not', () => {
    expect(parseReply('{"a":1}')).toEqual({ a: 1 });
    expect(parseReply('Aquí está:\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(parseReply('Resultado: {"a":3} fin')).toEqual({ a: 3 });
    expect(() => parseReply('no hay datos')).toThrow(TdrError);
  });
});

describe('OpenRouter', () => {
  const input = { file: PDF, fileName: 'ficha.pdf', contentType: PDF_TYPE, catalog } as const;
  const respond = (status: number, body: unknown) => async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const completion = (content: string, finish = 'stop') => ({ choices: [{ finish_reason: finish, message: { content } }] });
  const run = (f: typeof fetch, apiKey: string | null = 'sk-or-test') => extractTdr(input, { apiKey, model: 'anthropic/claude-haiku-5.5', fetch: f });
  const failure = async (f: typeof fetch, apiKey?: string | null) => { try { await run(f, apiKey); } catch (err) { return err as TdrError; } throw new Error('Expected a failure'); };

  it('sends the PDF as a file with the schema as a forced tool, the catalog and the key', async () => {
    let sent: { url: string; init: RequestInit } | undefined;
    const toolCall = { choices: [{ finish_reason: 'tool_calls', message: { content: null, tool_calls: [{ type: 'function', function: { name: 'registrar_tdr', arguments: JSON.stringify(reply) } }] } }] };
    // OpenRouter may send blank keep-alive lines before the JSON.
    const result = await run(async (url, init) => { sent = { url: String(url), init: init! }; return respond(200, `\n \n${JSON.stringify(toolCall)}`)(); });
    expect(result.title).toBe(reply.title);
    expect(sent!.url).toBe(OPENROUTER_URL);
    expect(new Headers(sent!.init.headers).get('Authorization')).toBe('Bearer sk-or-test');
    const body = JSON.parse(sent!.init.body as string);
    expect(body).toMatchObject({ model: 'anthropic/claude-haiku-5.5', tool_choice: { type: 'function', function: { name: 'registrar_tdr' } }, plugins: [{ id: 'file-parser', pdf: { engine: 'native' } }] });
    expect(body.messages[0].content).toContain('español');
    const [intro, file] = body.messages[1].content;
    expect(intro.text).toContain('9 · UCI · critical');
    expect(file).toEqual({ type: 'file', file: { filename: 'ficha.pdf', file_data: `data:application/pdf;base64,${PDF.toString('base64')}` } });
    // Every property of every object is asked for (null when the document doesn't say).
    const schema = body.tools[0].function.parameters;
    expect(schema.required).toEqual(Object.keys(schema.properties));
    expect(schema.properties.zones.items.required).toEqual(Object.keys(schema.properties.zones.items.properties));
  });

  it('sends a Word document as its text', async () => {
    const body = await requestBody({ ...input, file: DOCX, fileName: 'tdr.docx', contentType: DOCX_TYPE }, 'm');
    expect(JSON.stringify(body.messages[1].content)).toContain('Monthly reference budget: USD 12,500 excluding VAT');
    await expect(requestBody({ ...input, file: EMPTY_DOCX, contentType: DOCX_TYPE }, 'm')).rejects.toMatchObject({ code: 'EMPTY_DOCUMENT' });
  });

  it('maps every failure to a code, retryable or not', async () => {
    const cases: [typeof fetch, string, boolean][] = [
      [respond(401, { error: { message: 'No auth' } }), 'OPENROUTER_AUTH', false],
      [respond(402, { error: { message: 'No credit' } }), 'OPENROUTER_CREDITS', false],
      [respond(400, { error: { message: 'Bad' } }), 'OPENROUTER_REJECTED', false],
      [respond(429, { error: { message: 'Slow down' } }), 'OPENROUTER_UNAVAILABLE', true],
      [respond(503, 'Service unavailable'), 'OPENROUTER_UNAVAILABLE', true],
      [respond(200, { error: { code: 502, message: 'Upstream' } }), 'OPENROUTER_UNAVAILABLE', true],
      [respond(200, completion('{"title":"cut', 'length')), 'INVALID_RESPONSE', true],
      [respond(200, completion('')), 'INVALID_RESPONSE', true],
      [async () => { throw new TypeError('fetch failed'); }, 'OPENROUTER_UNAVAILABLE', true],
    ];
    for (const [f, code, retryable] of cases) expect(await failure(f)).toMatchObject({ code, retryable });
    expect(await failure(respond(200, completion('{}')), null)).toMatchObject({ code: 'OPENROUTER_API_KEY_MISSING', retryable: false });
  });

  it('reads the seeded catalog: active zone types and schedules', () => {
    const c = tdrCatalog(ctx.db);
    expect(c.zoneTypes.find((t) => t.name === 'UCI')).toMatchObject({ risk: 'critical' });
    expect(c.schedules.map((s) => s.serviceHoursPerDay)).toEqual([8, 16, 11, 24]);
  });
});

describe('clip', () => {
  it('cuts long text at a word, not in the middle of one', async () => {
    const { clip } = await import('../src/modules/tdrDocuments/schemas.ts');
    expect(clip('Hospital General San Francisco', 20)).toBe('Hospital General…');
    expect(clip('corto', 20)).toBe('corto');
    expect(clip('Supercalifragilisticoespialidoso', 10)).toBe('Supercali…');
  });
});
