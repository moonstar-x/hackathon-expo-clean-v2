import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { publicUrlFor } from '../src/lib/publicUrl.ts';
import { makeApp, testEnv } from './helpers.ts';

describe('public API configuration', () => {
  it('defaults to the configured port and preserves path prefixes', () => {
    expect(loadConfig({ ...testEnv, PUBLIC_URL: undefined, PORT: '4567' }).publicUrl).toBe('http://localhost:4567');
    const config = loadConfig({ ...testEnv, PUBLIC_URL: 'https://example.com/rooms/' });
    expect(publicUrlFor(config, '/api/measurements/1')).toBe('https://example.com/rooms/api/measurements/1');
    expect(publicUrlFor(loadConfig(testEnv), '/health')).toBe('https://api.test/health');
  });
  it.each([undefined, 'http://api.test'])('requires HTTPS in production: %s', (PUBLIC_URL) => {
    expect(() => loadConfig({ ...testEnv, NODE_ENV: 'production', PUBLIC_URL })).toThrow(/PUBLIC_URL/);
  });
  it.each(['ftp://api.test', 'https://u:p@api.test', 'https://api.test?q=1', 'https://api.test#x'])('rejects %s', (PUBLIC_URL) => {
    expect(() => loadConfig({ ...testEnv, PUBLIC_URL })).toThrow(/PUBLIC_URL/);
  });
  it.each<[string, unknown]>([['false', false], ['true', true], ['1', 1], ['loopback, 10.0.0.0/8', ['loopback', '10.0.0.0/8']]])('parses proxy %s', (TRUST_PROXY, expected) => {
    expect(loadConfig({ ...testEnv, TRUST_PROXY }).trustProxy).toEqual(expected);
  });
  it.each(['-1', 'whatever', '10.0.0.0/999'])('rejects proxy %s', (TRUST_PROXY) => {
    expect(() => loadConfig({ ...testEnv, TRUST_PROXY })).toThrow(/TRUST_PROXY/);
  });
  it('counts forwarded login clients separately', async () => {
    const { app, db } = await makeApp({ TRUST_PROXY: '1' });
    try {
      for (let i = 0; i < 10; i++) await request(app).post('/api/auth/login').set('X-Forwarded-For', '192.0.2.1').send({ email: 'a@example.com', password: 'bad' });
      expect((await request(app).post('/api/auth/login').set('X-Forwarded-For', '192.0.2.1').send({ email: 'a@example.com', password: 'bad' })).status).toBe(429);
      expect((await request(app).post('/api/auth/login').set('X-Forwarded-For', '192.0.2.2').send({ email: 'a@example.com', password: 'bad' })).status).toBe(401);
    } finally { db.close(); }
  });
});
