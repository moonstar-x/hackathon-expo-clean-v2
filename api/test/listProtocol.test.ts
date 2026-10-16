import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { escapeLike } from '../src/lib/listQuery.ts';
import type { Category } from '../src/modules/categories/repository.ts';
import { makeClient, ORIGIN, type TestClient } from './helpers.ts';

describe('list protocol', () => {
  let ctx: TestClient;
  beforeEach(async () => {
    ctx = await makeClient();
    for (const name of ['Bravo', 'alpha', 'Charlie', 'delta', 'Echo']) {
      await ctx.api.post('/api/categories', { name, description: `${name} things` });
    }
  });

  it('returns an array with a Content-Range header', async () => {
    const res = await ctx.api.list('/api/categories', { range: [0, 1] });
    expect(res.status).toBe(200);
    expect(res.headers['content-range']).toBe('categories 0-1/5');
    expect(res.body.map((c: Category) => c.name)).toEqual(['alpha', 'Bravo']);
  });

  it('defaults to range [0,24] and sorts text case-insensitively', async () => {
    const res = await ctx.api.get('/api/categories');
    expect(res.headers['content-range']).toBe('categories 0-4/5');
    expect(res.body.map((c: Category) => c.name)).toEqual(['alpha', 'Bravo', 'Charlie', 'delta', 'Echo']);
  });

  it('reports the last partial page', async () => {
    const res = await ctx.api.list('/api/categories', { range: [3, 9] });
    expect(res.headers['content-range']).toBe('categories 3-4/5');
    expect(res.body).toHaveLength(2);
  });

  it('uses */total for an empty page', async () => {
    const past = await ctx.api.list('/api/categories', { range: [10, 19] });
    expect(past.headers['content-range']).toBe('categories */5');
    expect(past.body).toEqual([]);

    const none = await ctx.api.list('/api/categories', { filter: { q: 'zzz' } });
    expect(none.headers['content-range']).toBe('categories */0');
  });

  it('sorts DESC and breaks ties by id', async () => {
    const res = await ctx.api.list('/api/categories', { sort: ['name', 'DESC'] });
    expect(res.body.map((c: Category) => c.name)).toEqual(['Echo', 'delta', 'Charlie', 'Bravo', 'alpha']);
  });

  it.each([
    ['range larger than 1000 rows', { range: JSON.stringify([0, 1000]) }],
    ['range with end < start', { range: JSON.stringify([5, 2]) }],
    ['negative range start', { range: JSON.stringify([-1, 2]) }],
    ['range of the wrong shape', { range: JSON.stringify({ start: 0 }) }],
    ['invalid JSON in sort', { sort: '["name",' }],
    ['unknown sort field', { sort: JSON.stringify(['password', 'ASC']) }],
    ['bad sort order', { sort: JSON.stringify(['name', 'UP']) }],
    ['invalid JSON in filter', { filter: '{q:' }],
    ['non-object filter', { filter: '[1,2]' }],
    ['unknown filter key', { filter: JSON.stringify({ secret: 1 }) }],
    ['badly shaped id filter', { filter: JSON.stringify({ id: 'abc' }) }],
  ])('rejects %s with 400', async (_label, query) => {
    const res = await ctx.api.get('/api/categories', query);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('accepts a range of exactly 1000 rows', async () => {
    const res = await ctx.api.list('/api/categories', { range: [0, 999] });
    expect(res.status).toBe(200);
  });

  it('filters by an array of ids (getMany)', async () => {
    const all = (await ctx.api.list('/api/categories', { sort: ['id', 'ASC'] })).body;
    const res = await ctx.api.list('/api/categories', { filter: { id: [all[0].id, all[2].id] } });
    expect(res.body.map((c: Category) => c.id).sort()).toEqual([all[0].id, all[2].id].sort());
    expect(res.headers['content-range']).toBe('categories 0-1/2');
  });

  it('searches q case-insensitively across fields', async () => {
    const res = await ctx.api.list('/api/categories', { filter: { q: 'CHAR' } });
    expect(res.body.map((c: Category) => c.name)).toEqual(['Charlie']);
    const byDescription = await ctx.api.list('/api/categories', { filter: { q: 'echo THINGS' } });
    expect(byDescription.body.map((c: Category) => c.name)).toEqual(['Echo']);
  });

  it('ignores an empty q', async () => {
    const res = await ctx.api.list('/api/categories', { filter: { q: '' } });
    expect(res.headers['content-range']).toBe('categories 0-4/5');
  });

  it('treats % and _ in q literally', async () => {
    await ctx.api.post('/api/categories', { name: '100% cotton' });
    await ctx.api.post('/api/categories', { name: 'snake_case' });
    await ctx.api.post('/api/categories', { name: 'back\\slash' });

    const percent = await ctx.api.list('/api/categories', { filter: { q: '%' } });
    expect(percent.body.map((c: Category) => c.name)).toEqual(['100% cotton']);
    const underscore = await ctx.api.list('/api/categories', { filter: { q: '_' } });
    expect(underscore.body.map((c: Category) => c.name)).toEqual(['snake_case']);
    const backslash = await ctx.api.list('/api/categories', { filter: { q: '\\' } });
    expect(backslash.body.map((c: Category) => c.name)).toEqual(['back\\slash']);
  });

  it('escapes LIKE wildcards', () => {
    expect(escapeLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });

  it('ignores the Range request header sent by ra-data-simple-rest', async () => {
    const res = await ctx.api.list('/api/categories', { range: [0, 1] }).set('Range', 'categories=0-1');
    expect(res.status).toBe(200);
    expect(res.headers['content-range']).toBe('categories 0-1/5');
  });

  it('exposes Content-Range to the allowed CORS origin', async () => {
    const res = await ctx.api.get('/api/categories').set('Origin', ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-expose-headers']).toMatch(/Content-Range/);
  });

  it('answers CORS preflight requests', async () => {
    const res = await request(ctx.app)
      .options('/api/products')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'authorization,content-type,range');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    // ra-data-simple-rest sends a Range header on getList.
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type,Authorization,Range');
  });

  it('does not allow other origins', async () => {
    const res = await ctx.api.get('/api/categories').set('Origin', 'http://evil.test');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
