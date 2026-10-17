import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import forge from 'node-forge';
import { HttpError } from '../../lib/errors.ts';
import type { FileStore } from '../../lib/fileStore.ts';
import type { documentRepository, SignatureRecord } from './repository.ts';
import type { QuoteDocument } from './types.ts';

export const SIGNATURE_MAX_BYTES = 64 * 1024;
export const NOT_P12 = 'Must be a PKCS#12 (.p12 or .pfx) file', WRONG_PASSWORD = 'Wrong password', NO_KEY = 'Must contain an RSA private key and its certificate', UNSUPPORTED = 'Uses unsupported encryption', EXPIRED = 'The certificate has expired', NOT_YET_VALID = 'The certificate is not valid yet';
// Ecuadorian authorities and OpenSSL write a few thousand iterations; forge derives keys synchronously, so a
// file asking for millions would hold every other request.
const MAX_ITERATIONS = 100_000;
export interface SignatureInfo { signerName: string; issuerName: string; serialNumber: string; validFrom: string; validTo: string; certificateSha256: string }
export interface Signer { key: forge.pki.rsa.PrivateKey; certificate: forge.pki.Certificate; chain: forge.pki.Certificate[]; certificateSha256: string }
export type SignatureStatus = 'valid' | 'expired' | 'unavailable';
const invalid = (field: 'file' | 'password', message: string) => new HttpError(422, 'VALIDATION_ERROR', 'Validation failed', { [field]: message });
const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const der = (certificate: forge.pki.Certificate) => Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes(), 'binary');
type Kdf = (...args: unknown[]) => unknown;
// While a file is read, the three key derivations forge can use refuse more than MAX_ITERATIONS. The read is
// synchronous, so nothing else runs while they are swapped.
function bounded<T>(read: () => T): T {
  const kdfs = forge as unknown as { pbe: { generatePkcs12Key: Kdf }; pkcs12: { generateKey: Kdf }; pkcs5: { pbkdf2: Kdf } };
  const originals = [kdfs.pbe.generatePkcs12Key, kdfs.pkcs12.generateKey, kdfs.pkcs5.pbkdf2] as const;
  const guard = (kdf: Kdf, count: number): Kdf => (...args) => { if (Number(args[count]) > MAX_ITERATIONS) throw invalid('file', UNSUPPORTED); return kdf(...args); };
  [kdfs.pbe.generatePkcs12Key, kdfs.pkcs12.generateKey, kdfs.pkcs5.pbkdf2] = [guard(originals[0], 3), guard(originals[1], 3), guard(originals[2], 2)];
  try { return read(); } finally { [kdfs.pbe.generatePkcs12Key, kdfs.pkcs12.generateKey, kdfs.pkcs5.pbkdf2] = originals; }
}
// forge keeps a name's value as the bytes of its ASN.1 string.
function name(field: forge.pki.Certificate['subject'], shortName: string): string | null {
  const attribute = field.getField(shortName) as { value: string; valueTagClass: number } | null;
  if (!attribute) return null;
  try {
    if (attribute.valueTagClass === forge.asn1.Type.BMPSTRING) return Buffer.from(attribute.value, 'binary').swap16().toString('utf16le');
    return attribute.valueTagClass === forge.asn1.Type.UTF8 ? forge.util.decodeUtf8(attribute.value) : attribute.value;
  } catch { return attribute.value; }
}
/**
 * Opens a .p12 (an electronic signature as Ecuadorian authorities issue it, RC2 and 3DES included) and
 * picks its signing key: the one whose certificate may sign, as Banco Central's files also hold an
 * encryption key, then the one valid at `now`. Refusals name the field to fix.
 */
export function readSignature(data: Buffer, password: string, now = new Date()): { info: SignatureInfo; signer: Signer } {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    // Strict outside, so a cut file is no .p12 (rather than one whose MAC is gone); lenient inside, as some tools write.
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(data.toString('binary')), true);
    p12 = bounded(() => forge.pkcs12.pkcs12FromAsn1(asn1, false, password));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    // forge's words for a MAC or a key that the password doesn't open.
    const message = error instanceof Error ? error.message : '';
    throw /invalid password|wrong password|failed to decrypt/i.test(message) ? invalid('password', WRONG_PASSWORD) : invalid('file', /unsupported/i.test(message) ? UNSUPPORTED : NOT_P12);
  }
  const { oids } = forge.pki, bags = (type: string) => p12.getBags({ bagType: type })[type] ?? [];
  const keys = [...bags(oids.pkcs8ShroudedKeyBag), ...bags(oids.keyBag)].flatMap(bag => bag.key ? [bag.key] : []);
  const certificates = bags(oids.certBag).flatMap(bag => bag.cert ? [bag.cert] : []);
  const signs = (c: forge.pki.Certificate) => { const usage = c.getExtension('keyUsage') as { digitalSignature?: boolean; nonRepudiation?: boolean } | undefined; return !usage || !!(usage.digitalSignature || usage.nonRepudiation); };
  const score = (c: forge.pki.Certificate) => (signs(c) ? 2 : 0) + (c.validity.notBefore <= now && now <= c.validity.notAfter ? 1 : 0);
  const pairs = keys.flatMap(key => certificates.filter(c => { const k = c.publicKey as forge.pki.rsa.PublicKey; return !!k?.n && key.n.compareTo(k.n) === 0 && key.e.compareTo(k.e) === 0; }).map(certificate => ({ key, certificate })));
  const pair = pairs.sort((a, b) => score(b.certificate) - score(a.certificate))[0], signerName = pair && (name(pair.certificate.subject, 'CN') ?? name(pair.certificate.subject, 'O'));
  if (!pair || !signerName) throw invalid('file', NO_KEY);
  const { certificate } = pair, certificateSha256 = sha256(der(certificate));
  const chain = certificates.filter(c => c !== certificate && (c.getExtension('basicConstraints') as { cA?: boolean } | undefined)?.cA);
  const info = { signerName, issuerName: name(certificate.issuer, 'CN') ?? name(certificate.issuer, 'O') ?? '', serialNumber: certificate.serialNumber.toUpperCase(), validFrom: certificate.validity.notBefore.toISOString(), validTo: certificate.validity.notAfter.toISOString(), certificateSha256 };
  return { info, signer: { key: pair.key, certificate, chain, certificateSha256 } };
}
/** The signature's folder under FILES_PATH. */
export const SIGNATURE_FOLDER = 'signatures';
const fileName = (record: { sha256: string }) => `${SIGNATURE_FOLDER}/${record.sha256}.sealed`;
// The .p12 and its password are kept together, encrypted with a key derived from JWT_SECRET: the database
// holds no secret, and the files alone open nothing.
const sealKey = (secret: string) => Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'quote-document-signature', 32));
function seal(key: Buffer, value: { file: string; password: string }, id: string): Buffer {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv).setAAD(Buffer.from(id));
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}
function unseal(key: Buffer, sealed: Buffer, id: string): { file: string; password: string } {
  const decipher = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12)).setAAD(Buffer.from(id)); decipher.setAuthTag(sealed.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]).toString());
}
/**
 * The company's electronic signature: its certificate's details in the database (the document model and its
 * hash use them) and the sealed .p12 as a file under FILES_PATH, written before the row points to it, as the
 * logo is. A row whose file is missing counts as no signature; one that can't be opened any more (JWT_SECRET
 * changed) is unavailable until the signature is loaded again.
 */
export function companySignature(repo: ReturnType<typeof documentRepository>, files: FileStore, secret: string) {
  const key = sealKey(secret);
  let opened: { sha256: string; signer: Signer | null } | null = null;
  const record = () => { const r = repo.signature(); return r && files.exists(fileName(r)) ? r : null; };
  // Opened once per file: deriving its keys is slow on purpose.
  function signer(r: SignatureRecord) {
    if (opened?.sha256 !== r.sha256) {
      let value: Signer | null;
      try { const { file, password } = unseal(key, files.read(fileName(r))!, r.sha256); value = readSignature(Buffer.from(file, 'base64'), password).signer; } catch { value = null; }
      opened = { sha256: r.sha256, signer: value };
    }
    return opened.signer;
  }
  const status = (r: SignatureRecord, now: Date): SignatureStatus => !signer(r) || now < new Date(r.validFrom) ? 'unavailable' : now > new Date(r.validTo) ? 'expired' : 'valid';
  const info = (now: Date) => { const r = record(); return r && { ...r, status: status(r, now) }; };
  return {
    info,
    /** What a document made at `now` carries: the signature and its key, or why it can't sign. */
    current(now: Date): { info: SignatureRecord; signer: Signer } | { warning: 'SIGNATURE_EXPIRED' | 'SIGNATURE_UNAVAILABLE' } | null {
      const r = record(), s = r && status(r, now);
      if (!r) return null;
      return s === 'valid' ? { info: r, signer: signer(r)! } : { warning: s === 'expired' ? 'SIGNATURE_EXPIRED' : 'SIGNATURE_UNAVAILABLE' };
    },
    save(data: Buffer, password: string, user: string, now: Date) {
      const read = readSignature(data, password, now), previous = repo.signature(), id = sha256(data);
      if (now > new Date(read.info.validTo)) throw invalid('file', EXPIRED);
      if (now < new Date(read.info.validFrom)) throw invalid('file', NOT_YET_VALID);
      files.write(fileName({ sha256: id }), seal(key, { file: data.toString('base64'), password }, id)); repo.saveSignature({ ...read.info, sha256: id, size: data.length }, user);
      if (previous && previous.sha256 !== id) files.remove(fileName(previous));
      opened = { sha256: id, signer: read.signer };
      return info(now);
    },
    remove() { const previous = repo.signature(); repo.deleteSignature(); if (previous) files.remove(fileName(previous)); opened = null; },
  };
}
/** A PDF's signing: the key, when it signs, and that moment as the QR prints it. */
export interface PdfSigning { signer: Signer; at: Date; time: string }
/** `at` as ISO 8601 in the documents' timezone, the way Ecuadorian signature stamps print the date. */
export function signingTime(at: Date, timezone: string): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset' }).formatToParts(at).map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${p.timeZoneName === 'GMT' ? '+00:00' : p.timeZoneName.slice(3)}`;
}
/** The signing for a document's PDF: it must be the certificate the document was built with. */
export function documentSigning(d: QuoteDocument, signing: PdfSigning | null): PdfSigning | null {
  if ((signing?.signer.certificateSha256 ?? null) !== (d.signature?.certificateSha256 ?? null)) throw new Error('The signature does not match the document');
  return signing;
}
const SIGNATURE_BYTES = 16384, BYTE_RANGE = `[0 /${'*'.repeat(10)} /${'*'.repeat(10)} /${'*'.repeat(10)}]`;
// The parts of pdfkit a signature field needs: new objects, the open (last) page and the catalog's form.
interface PdfWriter { ref(data: object): { end(): void }; page: { dictionary: unknown; annotations: unknown[] }; initForm(): void; _root: { data: { AcroForm: { data: { Fields: unknown[]; NeedAppearances?: boolean; SigFlags?: number } } } } }
/**
 * Adds an invisible signature field to the last page of a PDF being written, with room for the signature
 * (`signPdf` fills it). The stamp people see is drawn with the page; validators read the field.
 */
export function addSignatureField(document: PDFKit.PDFDocument, s: NonNullable<QuoteDocument['signature']>, at: Date) {
  const pdf = document as unknown as PdfWriter;
  const value = pdf.ref({ Type: 'Sig', Filter: 'Adobe.PPKLite', SubFilter: 'adbe.pkcs7.detached', ByteRange: [0, '*'.repeat(10), '*'.repeat(10), '*'.repeat(10)], Contents: Buffer.alloc(SIGNATURE_BYTES), Name: new String(s.signerName), Reason: new String(s.reason), ...(s.location ? { Location: new String(s.location) } : {}), M: at });
  const field = pdf.ref({ Type: 'Annot', Subtype: 'Widget', FT: 'Sig', Rect: [0, 0, 0, 0], V: value, T: new String('Firma'), F: 4, P: pdf.page.dictionary });
  pdf.page.annotations.push(field);
  // pdfkit's own form writes the catalog entry; regenerating appearances would break the signature.
  pdf.initForm(); const form = pdf._root.data.AcroForm.data; delete form.NeedAppearances; form.SigFlags = 3; form.Fields.push(field);
  value.end(); field.end();
}
/** Signs a PDF written with `addSignatureField`: a detached PKCS#7 (adbe.pkcs7.detached, SHA-256) of every byte but the signature's. */
export function signPdf(pdf: Buffer, { key, certificate, chain }: Signer, at: Date): Buffer {
  const range = pdf.indexOf(BYTE_RANGE), start = pdf.indexOf('<', pdf.indexOf('/Contents', range)), end = pdf.indexOf('>', start) + 1;
  if (range < 0 || start < 0) throw new Error('The PDF has no signature field');
  pdf.write(`[0 ${start} ${end} ${pdf.length - end}]`.padEnd(BYTE_RANGE.length), range, 'latin1');
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(Buffer.concat([pdf.subarray(0, start), pdf.subarray(end)]).toString('binary'));
  for (const c of [certificate, ...chain]) p7.addCertificate(c);
  // In DER order (by encoding), as validators re-encode the attributes they check.
  p7.addSigner({ key, certificate, digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.signingTime, value: at.toISOString() }, { type: forge.pki.oids.messageDigest }] });
  p7.sign({ detached: true });
  const signature = Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
  if (signature.length > SIGNATURE_BYTES) throw new Error('The signature does not fit its field');
  pdf.write(signature.toString('hex'), start + 1, 'latin1');
  return pdf;
}
