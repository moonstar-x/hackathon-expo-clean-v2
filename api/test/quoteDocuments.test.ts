import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { afterEach, describe, expect, it } from 'vitest';
import { makeClient, type TestClient, ORIGIN } from './helpers.ts';
import { seed } from '../src/db/seed.ts';
import { createQuoteWorker } from '../src/modules/quotes/worker.ts';
import { createLogger } from '../src/app.ts';
import { quotesRepository } from '../src/modules/quotes/repository.ts';
import { documentFixture } from './documentFixture.ts';
import { buildQuoteDocument } from '../src/modules/quoteDocuments/builder.ts';
import { renderPdf } from '../src/modules/quoteDocuments/pdf.ts';
import { renderXlsx, numberFormats } from '../src/modules/quoteDocuments/xlsx.ts';
import { openDatabase } from '../src/db/connection.ts';
import { migrate, MIGRATIONS_DIR } from '../src/db/migrate.ts';
import { loadConfig } from '../src/config.ts';
import { testEnv } from './helpers.ts';

let ctx: TestClient | undefined;
afterEach(() => { ctx?.db.close(); ctx = undefined; });
async function setup() {
  ctx = await makeClient(); seed(ctx.db, { createdBy: 'admin@example.com' });
  const input = documentFixture(); await ctx.api.put('/api/quote-document-settings/1', input.settings);
  await ctx.api.put('/api/quotes/1/document', input.data);
  await ctx.api.put('/api/quotes/1', { assumptionsConfirmed: true });
  createQuoteWorker({ db: ctx.db, config: ctx.config, logger: createLogger(ctx.config) }).processNextJob();
  return ctx;
}
describe('document routes', () => {
  it('seeds no invented company facts, validates settings, and leaves engine revisions alone', async () => {
    ctx = await makeClient(); const { api, db } = ctx;
    let s = (await api.get('/api/quote-document-settings/1')).body;
    expect(s).toMatchObject({ tradeName: 'CleanCode', legalName: null, taxId: null, paymentTerms: null, numberPrefix: 'COT', brandColor: '#4F46E5' });
    const before = db.prepare('SELECT revision FROM quote_parameters').pluck().get();
    for (const [field, value] of [['taxId', '12'], ['email', 'invalid'], ['website', 'ftp://test'], ['phone', 'abc'], ['numberPrefix', 'bad'], ['validityDays', 0], ['paperSize', 'A3'], ['brandColor', 'red'], ['brandColor', '#12345'], ['brandColor', null]] as const) {
      const response = await api.put('/api/quote-document-settings/1', { [field]: value }); expect(response.status).toBe(422); expect(response.body.errors).toHaveProperty(field);
    }
    s = (await api.put('/api/quote-document-settings/1', { legalName: '   ' })).body; expect(s.legalName).toBeNull();
    expect((await api.put('/api/quote-document-settings/1', { brandColor: 'red' })).body.errors.brandColor).toBe('Must be a hex color like #4F46E5');
    s = (await api.put('/api/quote-document-settings/1', { brandColor: '#abcdef' })).body; expect(s.brandColor).toBe('#ABCDEF');
    expect(db.prepare('SELECT revision FROM quote_parameters').pluck().get()).toBe(before);
    expect((await api.get('/api/quote-document-settings/2')).status).toBe(404);
    seed(db, { createdBy: 'admin@example.com' }); const state = (await api.get('/api/quotes/1/document')).body;
    expect(state.ready).toBe(false); expect(state.blockers.filter((b: { code: string }) => b.code === 'CLIENT_FIELD_MISSING')).toHaveLength(2);
    expect(state.document).toBeNull(); expect((await api.get('/api/quotes/1/document/pdf')).body.code).toBe('DOCUMENT_NOT_READY');
  });
  it('merges data without jobs, uses A.2 cents, tracks revisions, freezes numbers and rejects stale exports', async () => {
    const { api, db } = await setup(); let s = (await api.get('/api/quotes/1/document')).body;
    expect(s.ready).toBe(true); expect(s.document.lines.map((l: { amount: { value: number } }) => l.amount.value)).toEqual([147.69, 103.39]); expect(s.document.total.value).toBe(288.74);
    const before = quotesRepository(db).get(1); const jobs = db.prepare('SELECT * FROM quote_jobs').all();
    await api.put('/api/quotes/1/document', { clientAddress: 'Nueva dirección', number: 'IGNORED' });
    expect(quotesRepository(db).get(1)).toEqual(before); expect(db.prepare('SELECT * FROM quote_jobs').all()).toEqual(jobs);
    s = (await api.get('/api/quotes/1/document')).body; const firstHash = s.contentHash;
    for (const format of ['pdf', 'xlsx']) { const e = await api.post('/api/quotes/1/document/exports', { format, contentHash: firstHash }); expect(e.status).toBe(201); expect(e.body.revision).toBe(1); }
    await api.put('/api/quote-document-settings/1', { numberPrefix: 'OTRO' }); expect((await api.get('/api/quotes/1/document')).body.number).toBe('COT-00001');
    s = (await api.put('/api/quotes/1/document', { clientContactName: 'Nuevo contacto' })).body; expect(s.revision).toBe(2); expect(s.fileNames.pdf).toMatch(/-Rev2.pdf$/);
    expect((await api.post('/api/quotes/1/document/exports', { format: 'pdf', contentHash: firstHash })).body.code).toBe('DOCUMENT_CHANGED');
    expect((await api.get('/api/quotes/1/document/exports')).body).toHaveLength(2);
    expect((await api.post('/api/quotes/1/document/exports', { format: 'pdf', contentHash: s.contentHash })).body.revision).toBe(2);
    expect(JSON.parse((db.prepare('SELECT document_json FROM quote_document_exports ORDER BY id DESC').get() as { document_json: string }).document_json).revision).toBe(2);
    for (const body of [{ issueDate: '2026-02-30' }, { validityDays: 366 }, { clientEmail: 'bad' }, { lineMode: 'bad' }, { contractMonths: 61 }, { clientTaxId: '$' }]) expect((await api.put('/api/quotes/1/document', body)).status).toBe(422);
    await api.delete('/api/quotes/1'); expect(db.prepare('SELECT count(*) FROM quote_documents').pluck().get()).toBe(0); expect(db.prepare('SELECT count(*) FROM quote_document_exports').pluck().get()).toBe(0);
  });
  it('serves authenticated files with all headers without registering an export', async () => {
    const { api, app } = await setup();
    for (const route of ['/quote-document-settings/1', '/quote-document-settings/1/logo', '/quotes/1/document', '/quotes/1/document/pdf', '/quotes/1/document/xlsx', '/quotes/1/document/exports']) expect((await request(app).get(`/api${route}`)).status).toBe(401);
    for (const route of ['/quote-document-settings/1', '/quote-document-settings/1/logo', '/quotes/1/document']) expect((await request(app).put(`/api${route}`).send({})).status).toBe(401);
    expect((await request(app).delete('/api/quote-document-settings/1/logo')).status).toBe(401);
    expect((await request(app).post('/api/quotes/1/document/exports').send({})).status).toBe(401);
    for (const format of ['pdf', 'xlsx']) {
      const r = await api.get(`/api/quotes/1/document/${format}`, { download: 1 }); expect(r.status).toBe(200); expect(r.headers['content-disposition']).toMatch(/^attachment;.*filename\*=/); expect(r.headers['cache-control']).toBe('no-store'); expect(r.headers['x-document-hash']).toMatch(/^[a-f0-9]{64}$/); expect(r.headers['x-document-revision']).toBe('1');
      expect((await api.get(`/api/quotes/1/document/${format}`)).headers['content-disposition']).toMatch(/^inline/);
    }
    const cors = await api.get('/api/quotes/1/document'); expect(cors.headers['access-control-expose-headers']).toContain('X-Document-Hash');
    expect((await request(app).get('/api/quotes/1/document').set('Origin', ORIGIN).set('Authorization', `Bearer ${ctx!.token}`)).headers['access-control-expose-headers']).toContain('X-Document-Revision');
    expect((await api.get('/api/quotes/1/document/exports')).body).toEqual([]);
  });
});
async function pdfText(bytes: Buffer) {
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const pages = []; for (let i = 1; i <= pdf.numPages; i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items.map(item => 'str' in item ? item.str : '').join(' '));
  return { pdf, text: pages.join(' ') };
}
// The first text drawn on page 1: the title when a logo leads the header, the trade name in its place otherwise.
async function firstText(bytes: Buffer) {
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const item = (await (await pdf.getPage(1)).getTextContent()).items.find(i => 'str' in i && i.str.trim()); await pdf.loadingTask.destroy();
  return item && 'str' in item ? item.str : null;
}
function headerStyle(book: ExcelJS.Workbook) {
  let header: ExcelJS.Row | undefined; book.getWorksheet('Cotización')!.eachRow(row => { if (row.getCell(2).value === 'Descripción') header = row; });
  const cell = header!.getCell(2); return { fill: (cell.fill as ExcelJS.FillPattern).fgColor?.argb, text: cell.font.color?.argb };
}
describe('rendered files', () => {
  it('prints the complete model, typed workbook cells and deterministic metadata, without internal figures', async () => {
    for (const manual of [null, 3000]) {
      const input = documentFixture(manual), d = buildQuoteDocument(input);
      const bytes = await renderPdf(d, input.logoData), { pdf, text } = await pdfText(bytes);
      expect(bytes.includes('/Subtype /Image')).toBe(true); expect(await firstText(bytes)).toBe('COTIZACIÓN');
      for (const expected of [d.number, d.issueDateText, d.validUntilText, ...d.lines.flatMap(l => [l.description, l.amount.text]), d.subtotal.text, d.vat.text, d.total.text, ...d.scope.rows.map(r => r.zone), ...d.conditions.map(c => c.label), 'ACEPTACIÓN', 'Página 1 de']) expect(text).toContain(expected);
      const metadata = await pdf.getMetadata(); expect(metadata.info).toMatchObject({ Title: `Cotización ${d.number}`, Author: 'CleanCode', Creator: 'CleanCode', Subject: d.metadata.subject });
      const info = metadata.info as Record<string, unknown>;
      const pdfDate = `D:${d.metadata.issueInstant.replace(/\D/g, '').slice(0, 14)}Z`;
      expect(info.CreationDate).toBe(pdfDate); expect(info.ModDate).toBe(pdfDate); expect(info.Producer).toBeUndefined();
      const book = new ExcelJS.Workbook(); await book.xlsx.load(await renderXlsx(d, input.logoData) as unknown as ExcelJS.Buffer);
      expect(book.getWorksheet('Cotización')!.getImages()).toHaveLength(1); expect(headerStyle(book)).toEqual({ fill: '4F46E5', text: 'FFFFFF' });
      expect(book.worksheets.map(s => s.name)).toEqual(['Cotización', 'Alcance']); expect(book.created.toISOString()).toBe(d.metadata.issueInstant);
      expect(book.modified.toISOString()).toBe(d.metadata.issueInstant); expect(book.creator).toBe('CleanCode'); expect(book.lastModifiedBy).toBe('CleanCode'); expect(book.title).toBe(`Cotización ${d.number}`);
      const values: unknown[] = []; let dates = 0; const amounts: number[] = [];
      for (const sheet of book.worksheets) {
        expect(sheet.pageSetup.printArea).toBeTruthy(); expect(sheet.pageSetup.printTitlesRow).toBeTruthy();
        sheet.eachRow(row => { expect(row.hidden).toBeFalsy(); row.eachCell(cell => { expect(cell.formula).toBeUndefined(); expect(cell.note).toBeUndefined(); expect(numberFormats).toContain(cell.numFmt); values.push(cell.value); if (cell.value instanceof Date && cell.type !== ExcelJS.ValueType.Merge) dates++; if (cell.numFmt === '#,##0.00') amounts.push(cell.value as number); }); });
      }
      expect(dates).toBe(2); for (const l of d.lines) expect(amounts).toContain(l.amount.value);
      const all = text + JSON.stringify(values) + JSON.stringify(book.model.properties);
      for (const forbidden of ['Margen', 'Costo', 'Ganancia', 'admin@example.com']) expect(all).not.toContain(forbidden);
      const r = input.quote.result!;
      const secrets = [r.costs.totalCost, r.pricing.profit, r.pricing.minimumPrice, r.pricing.breakEvenPrice, r.pricing.negotiationRoom, r.purchasePlan.totalPurchaseCost, 3500, ...(manual ? [r.pricing.targetPrice] : [])];
      for (const n of secrets.filter(n => n > 0)) for (const value of [n.toFixed(2), n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), n.toFixed(2).replace('.', ',')]) expect(all).not.toContain(value);
      await pdf.loadingTask.destroy();
    }
  });
  it('prints the trade name where there is no logo and the company color on headings and bands', async () => {
    const input = documentFixture(); input.logo = null; input.logoData = null; input.settings.brandColor = '#FACC15';
    const d = buildQuoteDocument(input); expect(d.logo).toBeNull(); expect(d.colors).toEqual({ accent: '#FACC15', onAccent: '#0F172A', ink: '#857220', tint: '#FFFAE8' });
    const bytes = await renderPdf(d, null); expect(bytes.includes('/Subtype /Image')).toBe(false); expect(await firstText(bytes)).toBe('CleanCode');
    const book = new ExcelJS.Workbook(); await book.xlsx.load(await renderXlsx(d, null) as unknown as ExcelJS.Buffer);
    const main = book.getWorksheet('Cotización')!; expect(main.getImages()).toHaveLength(0); expect(main.getCell('A1').value).toBe('CleanCode'); expect(main.getCell('A1').alignment?.wrapText).toBeFalsy();
    expect(headerStyle(book)).toEqual({ fill: 'FACC15', text: '0F172A' });
    const other = documentFixture(); expect(() => renderPdf(d, other.logoData)).toThrow('The logo does not match the document'); await expect(renderXlsx(buildQuoteDocument(other), null)).rejects.toThrow('The logo does not match the document');
  });
  it('renders 100 zones in under two seconds with at most twelve pages', async () => {
    const input = documentFixture(); const original = input.quote.result!.technicalOffer[0];
    input.quote.result!.technicalOffer = Array.from({ length: 100 }, (_, i) => ({ ...original, name: `Zona ${i + 1}` }));
    input.quote.zones = Array.from({ length: 100 }, (_, i) => ({ ...input.quote.zones![0], position: i, name: `Zona ${i + 1}` }));
    input.quote.result!.zones = Array.from({ length: 100 }, (_, i) => ({ ...input.quote.result!.zones[0], position: i }));
    const d = buildQuoteDocument(input), start = performance.now(), bytes = await renderPdf(d, input.logoData); expect(performance.now() - start).toBeLessThan(2000);
    const { pdf } = await pdfText(bytes); expect(pdf.numPages).toBeLessThanOrEqual(12); await pdf.loadingTask.destroy();
  });
  it('upgrades an existing quote database without changing quotes', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec006-migrate-')), db = openDatabase(':memory:');
    try {
      for (const file of fs.readdirSync(MIGRATIONS_DIR).filter(f => /^00[1-5]_/.test(f))) fs.copyFileSync(path.join(MIGRATIONS_DIR, file), path.join(directory, file));
      // Raw rows: the repository already reads columns that later migrations add.
      migrate(db, directory); seed(db, { createdBy: 'fixture@example.test' }); const before = db.prepare('SELECT * FROM quotes WHERE id = 1').get() as object;
      expect(migrate(db)).toEqual(['006_quote_documents', '007_quote_target_margin', '008_company_branding']); expect(db.prepare('SELECT * FROM quotes WHERE id = 1').get()).toEqual({ ...before, target_margin: null }); expect(quotesRepository(db).get(1).targetMargin).toBeNull();
      expect(db.prepare('SELECT legal_name, payment_terms, brand_color FROM quote_document_settings').get()).toEqual({ legal_name: null, payment_terms: null, brand_color: '#4F46E5' });
    } finally { db.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
  it('adds the company color and an empty logo to existing document settings', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'spec006-branding-')), db = openDatabase(':memory:');
    try {
      for (const file of fs.readdirSync(MIGRATIONS_DIR).filter(f => /^00[1-6]_/.test(f))) fs.copyFileSync(path.join(MIGRATIONS_DIR, file), path.join(directory, file));
      migrate(db, directory); seed(db, { createdBy: 'fixture@example.test' }); db.prepare("UPDATE quote_document_settings SET legal_name = 'Empresa de prueba S.A.', signer_name = 'Ana Ejemplo'").run();
      expect(migrate(db)).toEqual(['007_quote_target_margin', '008_company_branding']);
      expect(db.prepare('SELECT legal_name, signer_name, brand_color FROM quote_document_settings').get()).toEqual({ legal_name: 'Empresa de prueba S.A.', signer_name: 'Ana Ejemplo', brand_color: '#4F46E5' });
      expect(db.prepare('SELECT count(*) FROM quote_document_logo').pluck().get()).toBe(0);
      expect(() => db.prepare("UPDATE quote_document_settings SET brand_color = '#abcdef'").run()).toThrow(/CHECK/);
    } finally { db.close(); fs.rmSync(directory, { recursive: true, force: true }); }
  });
  it('validates the document timezone at startup', () => {
    expect(loadConfig(testEnv).quoteDocumentTimezone).toBe('America/Guayaquil');
    expect(() => loadConfig({ ...testEnv, QUOTE_DOCUMENT_TIMEZONE: 'Invalid/Zone' })).toThrow('QUOTE_DOCUMENT_TIMEZONE');
  });
});
