import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_TITLE, DEFAULT_CURRENCY, parseConfig } from './config';

describe('parseConfig', () => {
  it('accepts a valid configuration and applies defaults', () => {
    expect(parseConfig({ VITE_API_URL: 'https://inventory.example.com/api' })).toEqual({
      ok: true,
      config: { apiUrl: 'https://inventory.example.com/api', appTitle: DEFAULT_APP_TITLE, currency: DEFAULT_CURRENCY },
    });
  });

  it('strips trailing slashes and trims values', () => {
    const result = parseConfig({ VITE_API_URL: ' http://localhost:4000/api/ ', VITE_APP_TITLE: ' Stock ', VITE_CURRENCY: 'eur' });
    expect(result).toEqual({ ok: true, config: { apiUrl: 'http://localhost:4000/api', appTitle: 'Stock', currency: 'EUR' } });
  });

  it.each([undefined, '', '   '])('reports a missing VITE_API_URL (%j)', (value) => {
    const result = parseConfig({ VITE_API_URL: value });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/VITE_API_URL is not set/);
  });

  it.each(['/api', 'localhost:4000/api', 'ftp://example.com/api', 'not a url'])(
    'reports an invalid VITE_API_URL (%s)',
    (value) => {
      const result = parseConfig({ VITE_API_URL: value });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toMatch(/VITE_API_URL must be an absolute http\(s\) URL/);
    },
  );

  it('reports an invalid currency', () => {
    const result = parseConfig({ VITE_API_URL: 'http://api.test/api', VITE_CURRENCY: 'DOLLARS' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/VITE_CURRENCY/);
  });
});
