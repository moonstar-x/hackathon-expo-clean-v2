import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import forge from 'node-forge';

// Regenerates the test electronic signatures in test/fixtures/quote-document/ (needs the openssl CLI):
// a test authority, its signer "ANA MARÍA EJEMPLO PÉREZ" valid until 2126, and her .p12 files, all
// with the password below. OpenSSL writes them as the Ecuadorian authorities and today's tools do;
// forge builds the one with two keys, as Banco Central's files come.
const PASSWORD = 'clave-de-prueba', out = new URL('../test/fixtures/quote-document/', import.meta.url).pathname;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signature-fixtures-')), file = (name: string) => path.join(dir, name);
const openssl = (...args: string[]) => execFileSync('openssl', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const extensions = (usage: string) => { fs.writeFileSync(file(`${usage}.cnf`), `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,${usage}\n`); return file(`${usage}.cnf`); };
const subject = '/C=EC/O=Empresa de prueba S.A./CN=ANA MARÍA EJEMPLO PÉREZ';
function certificate(name: string, usage: string, from: string, to: string, serial: string) {
  openssl('req', '-new', '-newkey', 'rsa:2048', '-nodes', '-utf8', '-subj', subject, '-keyout', `${name}.key`, '-out', `${name}.csr`);
  openssl('x509', '-req', '-in', `${name}.csr`, '-CA', 'ca.pem', '-CAkey', 'ca.key', '-set_serial', serial, '-not_before', from, '-not_after', to, '-sha256', '-extfile', extensions(usage), '-out', `${name}.pem`);
}
const p12 = (name: string, key: string, ...options: string[]) => openssl('pkcs12', '-export', '-inkey', `${key}.key`, '-in', `${key}.pem`, '-certfile', 'ca.pem', '-name', 'Signing Key', '-passout', `pass:${PASSWORD}`, '-out', path.join(out, name), ...options);

openssl('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-utf8', '-subj', '/C=EC/O=Entidad de prueba/CN=AUTORIDAD DE CERTIFICACION DE PRUEBA', '-keyout', 'ca.key', '-out', 'ca.pem', '-not_before', '20260101000000Z', '-not_after', '21260101000000Z', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign');
certificate('signer', 'digitalSignature,nonRepudiation', '20260101000000Z', '21260101000000Z', '0x1A2B3C');
certificate('expired', 'digitalSignature,nonRepudiation', '20200101000000Z', '20210101000000Z', '0x1A2B3D');
certificate('encryption', 'keyEncipherment,dataEncipherment', '20260101000000Z', '21260101000000Z', '0x1A2B3E');
p12('signature.p12', 'signer');
p12('signature-legacy.p12', 'signer', '-legacy');
p12('signature-expired.p12', 'expired');
p12('signature-iterations.p12', 'signer', '-iter', '500000');
openssl('pkcs12', '-export', '-nokeys', '-in', 'signer.pem', '-passout', `pass:${PASSWORD}`, '-out', path.join(out, 'signature-no-key.p12'));
fs.copyFileSync(file('ca.pem'), path.join(out, 'signature-ca.pem'));

// Two key bags in one file, the encryption key first: forge writes one key per file, so two files'
// contents are joined and the MAC computed again.
const { asn1, pki, pkcs12 } = forge;
const contents = (key: string, cert: string) => {
  const pfx = pkcs12.toPkcs12Asn1(pki.privateKeyFromPem(fs.readFileSync(file(`${key}.key`), 'utf8')), [pki.certificateFromPem(fs.readFileSync(file(`${cert}.pem`), 'utf8'))], PASSWORD, { algorithm: '3des', useMac: false }) as forge.asn1.Asn1 & { value: forge.asn1.Asn1[] };
  const data = ((pfx.value[1].value as forge.asn1.Asn1[])[1].value as forge.asn1.Asn1[])[0].value as string;
  return asn1.fromDer(data).value as forge.asn1.Asn1[];
};
const safe = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [...contents('encryption', 'encryption'), ...contents('signer', 'signer')]);
const salt = forge.random.getBytesSync(8), mac = forge.hmac.create(); mac.start('sha1', pkcs12.generateKey(PASSWORD, forge.util.createBuffer(salt), 3, 2048, 20)); mac.update(asn1.toDer(safe).getBytes());
const universal = (type: number, value: string | forge.asn1.Asn1[]) => asn1.create(asn1.Class.UNIVERSAL, type, Array.isArray(value), value);
const pfx = universal(asn1.Type.SEQUENCE, [
  universal(asn1.Type.INTEGER, asn1.integerToDer(3).getBytes()),
  universal(asn1.Type.SEQUENCE, [universal(asn1.Type.OID, asn1.oidToDer(pki.oids.data).getBytes()), asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [universal(asn1.Type.OCTETSTRING, asn1.toDer(safe).getBytes())])]),
  universal(asn1.Type.SEQUENCE, [universal(asn1.Type.SEQUENCE, [universal(asn1.Type.SEQUENCE, [universal(asn1.Type.OID, asn1.oidToDer(pki.oids.sha1).getBytes()), universal(asn1.Type.NULL, '')]), universal(asn1.Type.OCTETSTRING, mac.digest().getBytes())]), universal(asn1.Type.OCTETSTRING, salt), universal(asn1.Type.INTEGER, asn1.integerToDer(2048).getBytes())]),
]);
fs.writeFileSync(path.join(out, 'signature-two-keys.p12'), Buffer.from(asn1.toDer(pfx).getBytes(), 'binary'));
fs.rmSync(dir, { recursive: true, force: true });
console.log(`Regenerated the test signatures in ${out}`);
