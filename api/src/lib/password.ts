import crypto from 'node:crypto';
import { promisify } from 'node:util';

// Passwords are hashed with Node's built-in scrypt, so no native dependency is
// needed. A stored hash looks like `scrypt$<N>$<r>$<p>$<salt>$<key>` (base64
// salt and key). The cost parameters travel with the hash, so they can be raised
// later without breaking existing passwords.

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

/** OWASP's lower-memory scrypt setting: about 16 MB and ~150 ms per hash. */
export const DEFAULT_SCRYPT_PARAMS: Readonly<ScryptParams> = Object.freeze({ N: 2 ** 14, r: 8, p: 5 });

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const HASH_PATTERN = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([A-Za-z0-9+/]+=*)\$([A-Za-z0-9+/]+=*)$/;

// scrypt needs about 128 * N * r bytes. Node's default cap (32 MB) is too tight
// for some valid settings, so allow twice that.
const options = ({ N, r, p }: ScryptParams): crypto.ScryptOptions => ({ N, r, p, maxmem: 256 * N * r });

// The same password typed on different keyboards can arrive in different Unicode forms.
const normalize = (password: string) => password.normalize('NFC');

export async function hashPassword(password: string, params: ScryptParams = DEFAULT_SCRYPT_PARAMS): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const key = await scrypt(normalize(password), salt, KEY_BYTES, options(params));
  return ['scrypt', params.N, params.r, params.p, salt.toString('base64'), key.toString('base64')].join('$');
}

function parseHash(stored: unknown) {
  const match = typeof stored === 'string' ? HASH_PATTERN.exec(stored) : null;
  if (!match) return null;
  const [N, r, p] = match.slice(1, 4).map(Number);
  // Refuse absurd costs rather than letting a corrupt row exhaust memory.
  if (N < 2 || N > 2 ** 20 || (N & (N - 1)) !== 0 || r < 1 || r > 32 || p < 1 || p > 16) return null;
  return { params: { N, r, p }, salt: Buffer.from(match[4], 'base64'), key: Buffer.from(match[5], 'base64') };
}

/** True when `password` matches `stored`. A malformed hash never matches. */
export async function verifyPassword(password: string, stored: unknown): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed || parsed.key.length === 0) return false;
  const key = await scrypt(normalize(password), parsed.salt, parsed.key.length, options(parsed.params));
  return crypto.timingSafeEqual(key, parsed.key);
}
