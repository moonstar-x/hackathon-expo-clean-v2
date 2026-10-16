import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../src/db/seed.ts';
import { login, makeClient, type TestClient } from './helpers.ts';
const geometry = readFileSync(new URL('./fixtures/two-room-apartment.geometry.json', import.meta.url));
const original = JSON.parse(readFileSync(new URL('./fixtures/metadata.json', import.meta.url), 'utf8'));
const png = Buffer.from('89504e470d0a1a0a0000000049454e44ae426082', 'hex');
let ctx: TestClient;
beforeEach(async () => { ctx = await makeClient({ UPLOAD_MAX_FILE_MB: '1' }); });
afterEach(() => ctx.db.close());
interface UploadOptions { metadata?: unknown; parts?: Record<string, Buffer>; token?: string | null }
function upload({ metadata = original, parts = { geometry, floorPlan: png }, token = ctx.token }: UploadOptions = {}) {
  let req = request(ctx.app).post('/api/measurements');
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  req = req.field('metadata', typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
  for (const [kind, buffer] of Object.entries(parts)) req = req.attach(kind, buffer, `${kind}.bin`);
  return req;
}
describe('measurements', () => {
  it('stores complete uploads atomically, derives totals, and builds public links', async () => {
    const res = await upload();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ roomCount: 2, totalFloorArea: 34, isAreaApproximate: false, createdBy: 'admin@example.com' });
    expect(res.headers.location).toBe(`https://api.test/api/measurements/${res.body.id}`);
    expect(res.body.files.floorPlan).toMatchObject({ url: `${res.headers.location}/files/floorPlan`, contentType: 'image/png', size: png.length });
  });
  it('serves exact files with private cache, conditional GET and international filenames', async () => {
    const { body: m } = await upload({ metadata: { ...original, name: 'Habitación ✨' }, parts: { geometry, floorPlan: png, thumbnail: png, model: Buffer.from('504b0304abcd', 'hex'), csv: Buffer.from('nombre,área\nSala,20'), raw: Buffer.from('{"rooms":[]}') } });
    for (const [kind, info] of Object.entries<{ contentType: string }>(m.files)) {
      const res = await ctx.api.get(`/api/measurements/${m.id}/files/${kind}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(info.contentType);
      expect(res.headers.etag).toMatch(/^"[a-f0-9]{64}"$/);
      expect(res.headers['cache-control']).toContain('private');
      expect(res.headers['content-disposition']).toContain('inline');
      const cached = await request(ctx.app).get(`/api/measurements/${m.id}/files/${kind}`).set('Authorization', `Bearer ${ctx.token}`).set('If-None-Match', res.headers.etag);
      expect(cached.status).toBe(304);
    }
    const img = await ctx.api.get(`/api/measurements/${m.id}/files/floorPlan`);
    expect(img.body).toEqual(png);
    const download = await ctx.api.get(`/api/measurements/${m.id}/files/floorPlan`, { download: 1 });
    expect(download.headers['content-disposition']).toContain('attachment');
    // Characters outside latin1 require RFC 5987; latin1 remains valid in filename=.
    await ctx.api.put(`/api/measurements/${m.id}`, { name: 'Habitación 日本' });
    expect((await ctx.api.get(`/api/measurements/${m.id}/files/floorPlan`)).headers['content-disposition']).toContain("filename*=UTF-8''");
    expect((await ctx.api.get(`/api/measurements/${m.id}/files/unknown`)).status).toBe(404);
  });
  it('replays only for the original account', async () => {
    const first = await upload();
    const replay = await upload();
    expect(replay.status).toBe(200); expect(replay.body.id).toBe(first.body.id);
    const user = await ctx.api.post('/api/users', { email: 'other@example.com', password: 'password123', active: true });
    expect(user.status).toBe(201);
    const token = await login(ctx.app, 'other@example.com', 'password123');
    expect((await upload({ token })).status).toBe(409);
    expect(ctx.db.prepare('SELECT COUNT(*) FROM measurements').pluck().get()).toBe(1);
  });
  it.each(['geometry', 'floorPlan'])('requires %s', async (kind) => {
    const parts: Record<string, Buffer> = { geometry, floorPlan: png }; delete parts[kind];
    const res = await upload({ parts });
    expect(res.status).toBe(422); expect(res.body.errors[kind]).toBe('Required');
  });
  it('collects schema and file errors without inserting partial data', async () => {
    const metadata = structuredClone(original); metadata.rooms[0].name = ''; metadata.rooms[1].id = metadata.rooms[0].id; metadata.rooms[1].index = 3;
    const res = await upload({ metadata, parts: { geometry, floorPlan: Buffer.from('jpeg') } });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(['rooms.0.name', 'rooms.1.id', 'rooms.1.index', 'floorPlan']));
    expect(ctx.db.prepare('SELECT COUNT(*) FROM measurement_files').pluck().get()).toBe(0);
  });
  it('rejects mismatched geometry ids and versions and invalid UTF8', async () => {
    type Geometry = { version: number; rooms: { id: string }[] };
    for (const edit of [(g: Geometry) => { g.version = 2; }, (g: Geometry) => { g.rooms[0].id = crypto.randomUUID(); }]) {
      const g: Geometry = JSON.parse(geometry.toString()); edit(g);
      expect((await upload({ parts: { geometry: Buffer.from(JSON.stringify(g)), floorPlan: png } })).status).toBe(422);
    }
    expect((await upload({ parts: { geometry, floorPlan: png, csv: Buffer.from([0xff]) } })).status).toBe(422);
  });
  it('normalizes UUIDs, rounds Float metrics and ignores unknown fields', async () => {
    const m = structuredClone(original);m.clientId = m.clientId.toUpperCase();m.rooms[0].floorArea = 20.123456;m.roomCount = 99;
    const res = await upload({ metadata: m });
    expect(res.body.clientId).toBe(original.clientId); expect(res.body.totalFloorArea).toBe(34.123); expect(res.body.roomCount).toBe(2);
  });
  it('enforces multipart authentication, syntax, names, uniqueness and limits', async () => {
    expect((await upload({ token: null })).status).toBe(401);
    expect((await ctx.api.post('/api/measurements', {})).status).toBe(415);
    expect((await upload({ metadata: '{broken' })).status).toBe(400);
    expect((await upload({ parts: { geometry, floorPlan: png, other: png } })).status).toBe(400);
    expect((await upload({ parts: { geometry, floorPlan: Buffer.alloc(1024 * 1024 + 1) } })).status).toBe(413);
    expect((await upload().attach('floorPlan', png, 'again.png')).status).toBe(400);
    expect((await upload().field('metadata', '{}')).status).toBe(400);
    expect((await upload({ metadata: 'a'.repeat(1024 * 1024 + 1) })).status).toBe(413);
  });
  it('supports the list protocol, read-only fields, merge updates and cascading deletes', async () => {
    const first = (await upload()).body;
    await upload({ metadata: { ...original, clientId: crypto.randomUUID(), name: 'Otra', scannedAt: '2026-10-17T12:00:00Z' } });
    for (const filter of [{ q: 'ejemplo' }, { createdBy: first.createdBy }, { userId: first.userId }, { scannedAt_gte: '2026-10-16', scannedAt_lte: '2026-10-16' }]) {
      const res = await ctx.api.list('/api/measurements', { filter, sort: ['scannedAt', 'ASC'] });
      expect(res.status).toBe(200); expect(res.body[0].id).toBe(first.id); expect(res.headers['content-range']).toMatch(/^measurements 0-/);
    }
    const changed = await ctx.api.put(`/api/measurements/${first.id}`, { name: 'Nuevo', notes: ' prueba ', userId: 99, totalFloorArea: 0 });
    expect(changed.body).toMatchObject({ name: 'Nuevo', notes: 'prueba', userId: first.userId, totalFloorArea: 34 });
    expect((await ctx.api.put(`/api/measurements/${first.id}`, { notes: '' })).body.notes).toBeNull();
    expect((await ctx.api.delete(`/api/measurements/${first.id}`)).body.id).toBe(first.id);
    expect(ctx.db.prepare('SELECT COUNT(*) FROM measurement_files WHERE measurement_id = ?').pluck().get(first.id)).toBe(0);
  });
  it('retains audit attribution after deleting the uploader', async () => {
    const m = (await upload()).body;
    ctx.db.prepare('DELETE FROM users WHERE id = ?').run(m.userId);
    const row = ctx.db.prepare('SELECT user_id, created_by FROM measurements WHERE id = ?').get(m.id);
    expect(row).toEqual({ user_id: null, created_by: m.createdBy });
  });
  it('seeds independently from products and does not duplicate the sample', () => {
    seed(ctx.db, { createdBy: 'admin@example.com' }); seed(ctx.db, { createdBy: 'admin@example.com' });
    expect(ctx.db.prepare('SELECT COUNT(*) FROM measurements').pluck().get()).toBe(1);
    expect(ctx.db.prepare('SELECT kind FROM measurement_files ORDER BY kind').pluck().all()).toEqual(['floorPlan', 'geometry', 'thumbnail']);
    ctx.db.prepare('DELETE FROM measurements').run();
    seed(ctx.db, { createdBy: 'admin@example.com' });
    expect(ctx.db.prepare('SELECT COUNT(*) FROM measurements').pluck().get()).toBe(1);
  });
});
