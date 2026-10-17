import { createHash, verify, X509Certificate } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import forge from 'node-forge';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, createLogger } from '../src/app.ts';
import { seed } from '../src/db/seed.ts';
import { buildQuoteDocument, documentHash } from '../src/modules/quoteDocuments/builder.ts';
import { renderPdf, signatureQr } from '../src/modules/quoteDocuments/pdf.ts';
import { EXPIRED, NO_KEY, NOT_P12, readSignature, signingTime, UNSUPPORTED, WRONG_PASSWORD } from '../src/modules/quoteDocuments/signature.ts';
import { createQuoteWorker } from '../src/modules/quotes/worker.ts';
import { documentFixture } from './documentFixture.ts';
import { clientFor, login, makeClient, type TestClient } from './helpers.ts';

let ctx: TestClient | undefined;
afterEach(() => { if (ctx) { ctx.db.close(); fs.rmSync(ctx.config.filesPath, { recursive: true, force: true }); } ctx = undefined; });
// Test signatures from scripts/signature-fixtures.ts: the same signer and key, as each kind of file holds them.
const fixture = (name: string) => fs.readFileSync(new URL(`./fixtures/quote-document/${name}`, import.meta.url));
const PASSWORD = 'clave-de-prueba', SIGNER = 'ANA MARÍA EJEMPLO PÉREZ', CA = new X509Certificate(fixture('signature-ca.pem'));
const signatureFiles = () => { const dir = path.join(ctx!.config.filesPath, 'signatures'); return fs.existsSync(dir) ? fs.readdirSync(dir) : []; };
const upload = (file: Buffer | string, password: unknown = PASSWORD, id = 1) => request(ctx!.app).put(`/api/quote-document-settings/${id}/signature`).set('Authorization', `Bearer ${ctx!.token}`).send({ file: Buffer.isBuffer(file) ? file.toString('base64') : file, password });
const binary = (req: request.Test) => req.buffer(true).parse((res, done) => { const chunks: Buffer[] = []; res.on('data', (c: Buffer) => chunks.push(c)); res.on('end', () => done(null, Buffer.concat(chunks))); });
async function readyQuote() {
  ctx = await makeClient(); seed(ctx.db, { createdBy: 'admin@example.com' }); const { api, db, config } = ctx;
  const input = documentFixture(); await api.put('/api/quote-document-settings/1', { ...input.settings, city: 'Guayaquil' }); await api.put('/api/quotes/1/document', input.data); await api.put('/api/quotes/1', { assumptionsConfirmed: true });
  createQuoteWorker({ db, config, logger: createLogger(config) }).processNextJob();
  return ctx;
}
// What a validator checks, with Node's own OpenSSL rather than forge: the signed byte ranges cover the whole
// file but the signature, their digest is the signed one, the signature opens with the signer's key, and
// the signer's certificate comes from the test authority.
function verifySignedPdf(bytes: Buffer) {
  const text = bytes.toString('latin1'), [a, b, c, d] = /\/ByteRange \[(\d+) (\d+) (\d+) (\d+)\s*\]/.exec(text)!.slice(1).map(Number);
  expect(a).toBe(0); expect(c + d).toBe(bytes.length); expect([text[b], text[c - 1]]).toEqual(['<', '>']);
  const contents = Buffer.from(text.slice(b + 1, c - 1), 'hex'), cms = contents.subarray(0, 4 + contents.readUInt16BE(2));
  const p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(cms.toString('binary'))) as forge.pkcs7.Captured<forge.pkcs7.PkcsSignedData>;
  const attributes = p7.rawCapture.authenticatedAttributes as forge.asn1.Asn1[], attribute = (oid: string) => attributes.find(x => forge.asn1.derToOid((x.value as forge.asn1.Asn1[])[0].value as string) === oid)!;
  const value = (oid: string) => (((attribute(oid).value as forge.asn1.Asn1[])[1].value as forge.asn1.Asn1[])[0]).value as string;
  const digest = createHash('sha256').update(Buffer.concat([bytes.subarray(0, b), bytes.subarray(c)])).digest();
  expect(Buffer.from(value(forge.pki.oids.messageDigest), 'binary').equals(digest)).toBe(true);
  const signer = new X509Certificate(forge.pki.certificateToPem(p7.certificates[0])), signed = forge.asn1.toDer(forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attributes)).getBytes();
  expect(verify('sha256', Buffer.from(signed, 'binary'), signer.publicKey, Buffer.from(p7.rawCapture.signature as string, 'binary'))).toBe(true);
  expect(signer.verify(CA.publicKey)).toBe(true); expect(signer.subject).toContain(`CN=${SIGNER}`);
  return { signingTime: forge.asn1.utcTimeToDate(value(forge.pki.oids.signingTime)), dictionary: text.slice(text.lastIndexOf('<<', b), text.indexOf('>>', c)) };
}
async function pdfText(bytes: Buffer) {
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise, pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items.map(item => 'str' in item ? item.str : '').join(' '));
  await pdf.loadingTask.destroy(); return pages.join(' ');
}

describe('company electronic signature', () => {
  it('reads the files Ecuadorian authorities issue, legacy encryption included, and picks the signing key', () => {
    const read = (name: string) => readSignature(fixture(name), PASSWORD, new Date('2026-10-17T12:00:00Z'));
    const { info, signer } = read('signature.p12');
    expect(info).toEqual({ signerName: SIGNER, issuerName: 'AUTORIDAD DE CERTIFICACION DE PRUEBA', serialNumber: '1A2B3C', validFrom: '2026-01-01T00:00:00.000Z', validTo: '2126-01-01T00:00:00.000Z', certificateSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(signer.chain.map(c => c.subject.getField('CN').value)).toEqual(['AUTORIDAD DE CERTIFICACION DE PRUEBA']);
    // RC2 and 3DES, which Node's OpenSSL no longer opens; and Banco Central's two keys, the encryption one first.
    expect(read('signature-legacy.p12').info).toEqual(info); expect(read('signature-two-keys.p12').info).toEqual(info);
  });
  it('refuses other files, a wrong password, files without a key, too costly ones and expired certificates, and stores nothing', async () => {
    ctx = await makeClient();
    const refused = async (res: request.Response, field: string, message: string) => { expect(res.status).toBe(422); expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR', errors: { [field]: message } }); };
    await refused(await upload(fixture('signature.p12'), null), 'password', 'Required');
    await refused(await request(ctx.app).put('/api/quote-document-settings/1/signature').set('Authorization', `Bearer ${ctx.token}`).send({ password: PASSWORD }), 'file', 'Required');
    for (const file of ['not base64!', Buffer.from('not a certificate'), fixture('logo.png'), fixture('signature.p12').subarray(0, 900)]) await refused(await upload(file), 'file', NOT_P12);
    for (const name of ['signature.p12', 'signature-legacy.p12']) await refused(await upload(fixture(name), 'otra-clave'), 'password', WRONG_PASSWORD);
    await refused(await upload(fixture('signature-no-key.p12')), 'file', NO_KEY);
    const start = performance.now(); await refused(await upload(fixture('signature-iterations.p12')), 'file', UNSUPPORTED); expect(performance.now() - start).toBeLessThan(1500);
    await refused(await upload(fixture('signature-expired.p12')), 'file', EXPIRED);
    await refused(await upload(Buffer.alloc(64 * 1024 + 3)), 'file', 'Must be at most 64 KB');
    expect((await ctx.api.get('/api/quote-document-settings/1/signature')).status).toBe(404); expect(signatureFiles()).toEqual([]);
  });
  it('keeps the certificate details and a sealed file, answers without secrets, replaces and removes it', async () => {
    ctx = await makeClient(); const { api, db } = ctx, p12 = fixture('signature.p12');
    expect((await api.get('/api/quote-document-settings/1/signature')).body).toEqual({ code: 'NOT_FOUND', message: 'Signature not found' });
    let r = await upload(p12); expect(r.status).toBe(200);
    const sha256 = createHash('sha256').update(p12).digest('hex');
    expect(r.body).toEqual({ signerName: SIGNER, issuerName: 'AUTORIDAD DE CERTIFICACION DE PRUEBA', serialNumber: '1A2B3C', validFrom: '2026-01-01T00:00:00.000Z', validTo: '2126-01-01T00:00:00.000Z', certificateSha256: expect.stringMatching(/^[a-f0-9]{64}$/), size: p12.length, sha256, status: 'valid', updatedBy: 'admin@example.com', updatedAt: expect.any(String) });
    expect((await api.get('/api/quote-document-settings/1/signature')).body).toEqual(r.body); expect(JSON.stringify(r.body)).not.toContain(PASSWORD);
    // Neither the database nor the file gives away the .p12 or its password.
    expect(signatureFiles()).toEqual([`${sha256}.sealed`]);
    const sealed = fs.readFileSync(path.join(ctx.config.filesPath, 'signatures', `${sha256}.sealed`));
    for (const secret of [Buffer.from(PASSWORD), p12.subarray(0, 64), Buffer.from(p12.toString('base64').slice(0, 64))]) expect(sealed.includes(secret)).toBe(false);
    expect(JSON.stringify(db.prepare('SELECT * FROM quote_document_signature').all())).not.toMatch(/clave|password/i);
    r = await upload(fixture('signature-legacy.p12')); expect(r.body.sha256).not.toBe(sha256); expect(signatureFiles()).toEqual([`${r.body.sha256}.sealed`]);
    expect((await api.delete('/api/quote-document-settings/1/signature')).status).toBe(204); expect(signatureFiles()).toEqual([]);
    expect((await api.get('/api/quote-document-settings/1/signature')).status).toBe(404); expect((await api.delete('/api/quote-document-settings/1/signature')).status).toBe(204);
    for (const res of [await api.get('/api/quote-document-settings/2/signature'), await upload(p12, PASSWORD, 2), await api.delete('/api/quote-document-settings/2/signature')]) expect(res.status).toBe(404);
  });
  it('signs the PDF with a QR stamp in the company’s signature box, as a new revision, and only the PDF', async () => {
    const { api, db } = await readyQuote();
    let s = (await api.get('/api/quotes/1/document')).body; const unsigned = s.contentHash;
    expect('signature' in s.document).toBe(false); expect(s.warnings).toEqual([]);
    const plain = await binary(api.get('/api/quotes/1/document/pdf')); expect((plain.body as Buffer).includes('/ByteRange')).toBe(false);
    expect((await api.post('/api/quotes/1/document/exports', { format: 'pdf', contentHash: unsigned })).body.revision).toBe(1);
    const { certificateSha256 } = (await upload(fixture('signature-legacy.p12'))).body;
    s = (await api.get('/api/quotes/1/document')).body;
    expect(s.document.signature).toEqual({ signerName: SIGNER, certificateSha256, reason: 'Cotización COT-00001', location: 'Guayaquil' }); expect(s.contentHash).not.toBe(unsigned); expect(s.revision).toBe(2);
    const before = Date.now(), pdf = await binary(api.get('/api/quotes/1/document/pdf')); expect(pdf.headers['x-document-hash']).toBe(s.contentHash);
    const { signingTime: at, dictionary } = verifySignedPdf(pdf.body as Buffer);
    expect(at.getTime()).toBeGreaterThanOrEqual(Math.floor(before / 1000) * 1000 - 1000); expect(at.getTime()).toBeLessThanOrEqual(Date.now());
    expect(dictionary).toContain('/SubFilter /adbe.pkcs7.detached'); expect(dictionary).toContain('/Location (Guayaquil)');
    const text = await pdfText(pdf.body as Buffer); expect(text).toContain('Firmado electrónicamente por:'); expect(text).toContain(SIGNER);
    // A spreadsheet carries no signature, so it shows no stamp.
    const book = new ExcelJS.Workbook(); await book.xlsx.load((await binary(api.get('/api/quotes/1/document/xlsx'))).body as ExcelJS.Buffer);
    const cells: unknown[] = []; book.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => { cells.push(cell.value); }))); expect(JSON.stringify(cells)).not.toMatch(/Firmado|FIRMADO/);
    expect((await api.post('/api/quotes/1/document/exports', { format: 'pdf', contentHash: s.contentHash })).body.revision).toBe(2);
    const logged = (db.prepare('SELECT document_json FROM quote_document_exports ORDER BY id DESC').get() as { document_json: string }).document_json;
    expect(JSON.parse(logged).signature.signerName).toBe(SIGNER); expect(logged).not.toContain(PASSWORD);
    // Without it, the document is again the one it was before the signature.
    await api.delete('/api/quote-document-settings/1/signature'); s = (await api.get('/api/quotes/1/document')).body; expect(s.contentHash).toBe(unsigned); expect('signature' in s.document).toBe(false);
  });
  it('leaves the PDF unsigned and says why when the signature expired or the server can no longer open it', async () => {
    const { api, db, config } = await readyQuote(); await upload(fixture('signature.p12'));
    db.prepare("UPDATE quote_document_signature SET valid_to = '2026-01-02T00:00:00.000Z'").run();
    let s = (await api.get('/api/quotes/1/document')).body; expect(s.ready).toBe(true); expect(s.warnings).toEqual([{ code: 'SIGNATURE_EXPIRED' }]); expect('signature' in s.document).toBe(false);
    expect(((await binary(api.get('/api/quotes/1/document/pdf'))).body as Buffer).includes('/ByteRange')).toBe(false);
    expect((await api.get('/api/quote-document-settings/1/signature')).body.status).toBe('expired');
    db.prepare("UPDATE quote_document_signature SET valid_to = '2126-01-01T00:00:00.000Z'").run();
    // The same files under another JWT_SECRET: the sealed .p12 no longer opens.
    const other = createApp({ db, config: { ...config, jwtSecret: 'another-secret-that-is-longer-than-32-chars' } }), api2 = clientFor(other, await login(other));
    s = (await api2.get('/api/quotes/1/document')).body; expect(s.warnings).toEqual([{ code: 'SIGNATURE_UNAVAILABLE' }]); expect('signature' in s.document).toBe(false);
    expect((await api2.get('/api/quote-document-settings/1/signature')).body.status).toBe('unavailable');
    expect((await api.get('/api/quotes/1/document')).body.warnings).toEqual([]);
    // A row whose file is gone is no signature at all, as with the logo.
    fs.rmSync(path.join(config.filesPath, 'signatures'), { recursive: true }); expect((await api.get('/api/quote-document-settings/1/signature')).status).toBe(404); expect((await api.get('/api/quotes/1/document')).body.warnings).toEqual([]);
  });
  it('carries the signature in the hashed model only when the company signs, and checks the key against it', async () => {
    const input = documentFixture(), d = buildQuoteDocument(input), { info, signer } = readSignature(fixture('signature.p12'), PASSWORD);
    expect(Object.keys(d)).not.toContain('signature');
    const signed = buildQuoteDocument({ ...input, signature: info }); expect(signed.signature).toEqual({ signerName: SIGNER, certificateSha256: info.certificateSha256, reason: 'Cotización COT-00007', location: null });
    expect(documentHash(signed)).not.toBe(documentHash(d)); expect(documentHash(buildQuoteDocument({ ...input, signature: { ...info, certificateSha256: 'b'.repeat(64) } }))).not.toBe(documentHash(signed));
    const at = new Date('2026-10-17T17:50:56.789Z'), signing = { signer, at, time: signingTime(at, 'America/Guayaquil') };
    expect(() => renderPdf(d, input.logoData, signing)).toThrow('The signature does not match the document'); expect(() => renderPdf(signed, input.logoData)).toThrow('The signature does not match the document');
    expect(verifySignedPdf(await renderPdf(signed, input.logoData, signing)).signingTime.toISOString()).toBe('2026-10-17T17:50:56.000Z');
  });
  it('words the QR as Ecuadorian signing tools do, dated in the documents’ timezone', () => {
    const at = new Date('2026-10-17T17:50:56.789Z');
    expect(signingTime(at, 'America/Guayaquil')).toBe('2026-10-17T12:50:56-05:00'); expect(signingTime(at, 'UTC')).toBe('2026-10-17T17:50:56+00:00'); expect(signingTime(at, 'Asia/Kolkata')).toBe('2026-10-17T23:20:56+05:30');
    const s = { signerName: SIGNER, certificateSha256: 'a'.repeat(64), reason: 'Cotización COT-00007', location: 'Guayaquil' };
    expect(signatureQr(s, '2026-10-17T12:50:56-05:00')).toBe(`FIRMADO POR: ${SIGNER}\nRAZON: Cotización COT-00007\nLOCALIZACION: Guayaquil\nFECHA: 2026-10-17T12:50:56-05:00\nVALIDAR CON: www.firmadigital.gob.ec`);
    expect(signatureQr({ ...s, location: null }, '2026-10-17T12:50:56-05:00')).not.toContain('LOCALIZACION');
  });
});
