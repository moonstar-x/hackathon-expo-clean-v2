import { describe, expect, it } from 'vitest';
import { initials, isAppIdentity } from '../../src/utils/identity';

describe('initials', () => {
  it.each([
    ['ana.perez@limpieza.ec', 'AP'],
    ['admin@example.com', 'AD'],
    ['Ana Pérez', 'AP'],
    ['María José', 'MJ'],
  ])('%s → %s', (name: string, letters: string): void => {
    expect(initials(name)).toBe(letters);
  });
});

describe('isAppIdentity', () => {
  it('needs the numeric id, a name and the email', (): void => {
    expect(isAppIdentity({ id: 1, fullName: 'Ana Pérez', email: 'ana@limpieza.ec' })).toBe(true);
    expect(isAppIdentity({ id: 1, fullName: 'Ana Pérez' })).toBe(false);
    expect(isAppIdentity({ id: 'sub', fullName: 'Ana Pérez', email: 'ana@limpieza.ec' })).toBe(false);
    expect(isAppIdentity(undefined)).toBe(false);
  });
});
