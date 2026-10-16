import { describe, expect, it } from 'vitest';
import { DEFAULT_SCRYPT_PARAMS, hashPassword, verifyPassword } from '../src/lib/password.js';
import { FAST_HASH } from './helpers.js';

const cheap = FAST_HASH.hashParams;

describe('password hashing', () => {
  it('hashes with the default scrypt cost and verifies', async () => {
    const hash = await hashPassword('correct horse battery');
    const { N, r, p } = DEFAULT_SCRYPT_PARAMS;
    expect(hash).toMatch(new RegExp(`^scrypt\\$${N}\\$${r}\\$${p}\\$[A-Za-z0-9+/]+=*\\$[A-Za-z0-9+/]+=*$`));
    expect(hash).not.toContain('correct horse battery');
    await expect(verifyPassword('correct horse battery', hash)).resolves.toBe(true);
    await expect(verifyPassword('correct horse batterY', hash)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password', cheap), hashPassword('same-password', cheap)]);
    expect(a).not.toBe(b);
    await expect(verifyPassword('same-password', a)).resolves.toBe(true);
    await expect(verifyPassword('same-password', b)).resolves.toBe(true);
  });

  it('reads the cost from the stored hash', async () => {
    const hash = await hashPassword('pw-12345678', cheap);
    expect(hash.startsWith(`scrypt$${cheap.N}$${cheap.r}$${cheap.p}$`)).toBe(true);
    await expect(verifyPassword('pw-12345678', hash)).resolves.toBe(true);
  });

  it('treats composed and decomposed Unicode as the same password', async () => {
    const hash = await hashPassword('café-secret', cheap);
    await expect(verifyPassword('café-secret', hash)).resolves.toBe(true);
  });

  it.each([
    ['null', null],
    ['an empty string', ''],
    ['plain text', 'hunter2'],
    ['another algorithm', '$2b$10$abcdefghijklmnopqrstuuJ6XqzZbQd6xT6v9f8m3uPq3Gd8hZ5Iu'],
    ['a non-power-of-two cost', 'scrypt$1000$8$1$c2FsdA==$a2V5'],
    ['an absurd cost', `scrypt$${2 ** 24}$8$1$c2FsdA==$a2V5`],
  ])('never matches %s', async (_label, stored) => {
    await expect(verifyPassword('hunter2', stored)).resolves.toBe(false);
  });
});
