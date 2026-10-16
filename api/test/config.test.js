import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig, PLACEHOLDERS } from '../src/config.js';
import { testEnv } from './helpers.js';

describe('loadConfig', () => {
  it('returns a frozen config with defaults applied', () => {
    const config = loadConfig({
      CORS_ORIGIN: 'http://localhost:5173, https://admin.example.com/',
      JWT_SECRET: 'x'.repeat(32),
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'password1',
    });
    expect(config).toMatchObject({
      env: 'development',
      port: 4000,
      jwtExpiresIn: '8h',
      logLevel: 'info',
      corsOrigins: ['http://localhost:5173', 'https://admin.example.com'],
    });
    expect(config.databasePath).toMatch(/data[/\\]inventory\.db$/);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('keeps :memory: as-is', () => {
    expect(loadConfig(testEnv).databasePath).toBe(':memory:');
  });

  it('names every missing required variable', () => {
    const { JWT_SECRET: _a, ADMIN_EMAIL: _b, CORS_ORIGIN: _c, ...rest } = testEnv;
    let error;
    try {
      loadConfig(rest);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain('JWT_SECRET');
    expect(error.message).toContain('ADMIN_EMAIL');
    expect(error.message).toContain('CORS_ORIGIN');
    expect(error.problems.map((p) => p.variable).sort()).toEqual(['ADMIN_EMAIL', 'CORS_ORIGIN', 'JWT_SECRET']);
  });

  it('treats empty strings as missing', () => {
    expect(() => loadConfig({ ...testEnv, ADMIN_PASSWORD: '' })).toThrow(/ADMIN_PASSWORD/);
  });

  it('rejects a short JWT_SECRET', () => {
    expect(() => loadConfig({ ...testEnv, JWT_SECRET: 'too-short' })).toThrow(/JWT_SECRET.*32/);
  });

  it('rejects invalid values', () => {
    expect(() => loadConfig({ ...testEnv, PORT: '70000' })).toThrow(/PORT/);
    expect(() => loadConfig({ ...testEnv, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ ...testEnv, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => loadConfig({ ...testEnv, ADMIN_EMAIL: 'not-an-email' })).toThrow(/ADMIN_EMAIL/);
    expect(() => loadConfig({ ...testEnv, ADMIN_PASSWORD: 'short' })).toThrow(/ADMIN_PASSWORD/);
    expect(() => loadConfig({ ...testEnv, ADMIN_PASSWORD: 'x'.repeat(129) })).toThrow(/ADMIN_PASSWORD/);
    expect(() => loadConfig({ ...testEnv, JWT_EXPIRES_IN: 'soon' })).toThrow(/JWT_EXPIRES_IN/);
    expect(() => loadConfig({ ...testEnv, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
    expect(() => loadConfig({ ...testEnv, CORS_ORIGIN: 'not a url' })).toThrow(/CORS_ORIGIN/);
  });

  it('rejects .env.example placeholders in production', () => {
    let error;
    try {
      loadConfig({ ...testEnv, NODE_ENV: 'production', ...PLACEHOLDERS });
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain('JWT_SECRET');
    expect(error.message).toContain('ADMIN_PASSWORD');
  });

  it('allows the placeholders outside production', () => {
    expect(() => loadConfig({ ...testEnv, NODE_ENV: 'development', ...PLACEHOLDERS })).not.toThrow();
  });
});
