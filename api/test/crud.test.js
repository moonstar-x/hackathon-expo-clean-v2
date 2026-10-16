import { beforeEach, describe, expect, it } from 'vitest';
import { createProduct, makeClient, productFixture } from './helpers.js';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('categories', () => {
  let api;
  beforeEach(async () => ({ api } = await makeClient()));

  it('supports create, read, update (merge) and delete', async () => {
    const created = await api.post('/api/categories', { name: '  Floor Care ', description: 'Mops & wax' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: expect.any(Number), name: 'Floor Care', description: 'Mops & wax' });
    expect(created.body.createdAt).toMatch(ISO);
    expect(created.body.updatedAt).toBe(created.body.createdAt);

    const id = created.body.id;
    expect((await api.get(`/api/categories/${id}`)).body).toEqual(created.body);

    const updated = await api.put(`/api/categories/${id}`, { name: 'Floors' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ id, name: 'Floors', description: 'Mops & wax' });

    const deleted = await api.delete(`/api/categories/${id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body).toMatchObject({ id, name: 'Floors' });
    expect((await api.get(`/api/categories/${id}`)).status).toBe(404);
  });

  it('ignores read-only and unknown fields', async () => {
    const { body } = await api.post('/api/categories', { name: 'A', id: 999, createdAt: 'x', hacker: true });
    expect(body.id).not.toBe(999);
    expect(body).not.toHaveProperty('hacker');
    const updated = await api.put(`/api/categories/${body.id}`, { ...body, id: 5000, createdAt: '1999-01-01', bogus: 1 });
    expect(updated.status).toBe(200);
    expect(updated.body.id).toBe(body.id);
    expect(updated.body.createdAt).toBe(body.createdAt);
  });

  it('stores empty nullable strings as null', async () => {
    const { body } = await api.post('/api/categories', { name: 'A', description: '   ' });
    expect(body.description).toBeNull();
  });

  it('returns 404 for bad or unknown ids', async () => {
    for (const id of ['abc', '0', '-1', '1.5', '99999']) {
      const res = await api.get(`/api/categories/${id}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    }
    expect((await api.put('/api/categories/99999', { name: 'x' })).status).toBe(404);
    expect((await api.delete('/api/categories/99999')).status).toBe(404);
  });

  it('requires a name', async () => {
    const res = await api.post('/api/categories', { description: 'x' });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR', errors: { name: 'Required' } });
    expect((await api.post('/api/categories', { name: '   ' })).body.errors.name).toBe('Required');
    expect((await api.post('/api/categories', { name: 'x'.repeat(101) })).status).toBe(422);
  });

  it('rejects a non-object body', async () => {
    const res = await api.post('/api/categories', [1, 2]);
    expect(res.status).toBe(400);
  });

  it('rejects duplicate names case-insensitively', async () => {
    await api.post('/api/categories', { name: 'Disinfectants' });
    const res = await api.post('/api/categories', { name: 'DISINFECTANTS' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CONFLICT', errors: { name: expect.any(String) } });

    const other = (await api.post('/api/categories', { name: 'Other' })).body;
    expect((await api.put(`/api/categories/${other.id}`, { name: 'disinfectants' })).status).toBe(409);
    // Renaming a record to its own name (different case) is fine.
    expect((await api.put(`/api/categories/${other.id}`, { name: 'OTHER' })).status).toBe(200);
  });

  it('refuses to delete a category that has products', async () => {
    const product = await createProduct(api);
    const res = await api.delete(`/api/categories/${product.categoryId}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(res.body.message).toMatch(/^Category ".+" is used by 1 product\(s\)$/);
    expect((await api.get(`/api/categories/${product.categoryId}`)).status).toBe(200);
  });
});

describe('suppliers', () => {
  let api;
  beforeEach(async () => ({ api } = await makeClient()));

  it('supports CRUD with merge semantics', async () => {
    const created = await api.post('/api/suppliers', {
      name: 'Acme',
      contactName: 'Dana',
      email: 'dana@acme.test',
      phone: '555',
      notes: '',
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Acme', contactName: 'Dana', email: 'dana@acme.test', notes: null });

    const updated = await api.put(`/api/suppliers/${created.body.id}`, { phone: '' });
    expect(updated.body).toMatchObject({ name: 'Acme', contactName: 'Dana', phone: null });

    expect((await api.delete(`/api/suppliers/${created.body.id}`)).status).toBe(200);
  });

  it('validates email', async () => {
    const res = await api.post('/api/suppliers', { name: 'X', email: 'nope' });
    expect(res.status).toBe(422);
    expect(res.body.errors.email).toBeDefined();
  });

  it('rejects duplicate names and deleting a supplier in use', async () => {
    const supplier = (await api.post('/api/suppliers', { name: 'Acme' })).body;
    expect((await api.post('/api/suppliers', { name: 'acme' })).status).toBe(409);
    await createProduct(api, { supplierId: supplier.id });
    const res = await api.delete(`/api/suppliers/${supplier.id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/is used by 1 product\(s\)/);
  });

  it('searches name, contact and email', async () => {
    await api.post('/api/suppliers', { name: 'Acme', contactName: 'Dana Whitfield' });
    await api.post('/api/suppliers', { name: 'Sparkle', email: 'sales@sparkle.test' });
    expect((await api.list('/api/suppliers', { filter: { q: 'whitfield' } })).body.map((s) => s.name)).toEqual(['Acme']);
    expect((await api.list('/api/suppliers', { filter: { q: 'SALES@' } })).body.map((s) => s.name)).toEqual(['Sparkle']);
  });
});

describe('products', () => {
  let api;
  beforeEach(async () => ({ api } = await makeClient()));

  it('creates a product with defaults and computed fields', async () => {
    const body = await productFixture(api, { sku: 'dis-bleach-5', unitCost: 1.35, reorderLevel: 20 });
    const res = await api.post('/api/products', { ...body, initialQuantity: 40 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      sku: 'DIS-BLEACH-5',
      quantity: 40,
      reorderLevel: 20,
      unitCost: 1.35,
      supplierId: null,
      description: null,
      hazardous: false,
      active: true,
      isLowStock: false,
      stockValue: 54,
    });
    expect(res.body).not.toHaveProperty('initialQuantity');
  });

  it('applies merge semantics and ignores read-only fields on PUT', async () => {
    const product = await createProduct(api, { initialQuantity: 3, description: 'keep me' });
    const res = await api.put(`/api/products/${product.id}`, {
      name: 'Renamed',
      quantity: 999,
      isLowStock: false,
      stockValue: 1,
      initialQuantity: 50,
      unknownField: 'x',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Renamed', description: 'keep me', quantity: 3, sku: product.sku });

    // React Admin sends the whole record back.
    const full = await api.put(`/api/products/${product.id}`, { ...res.body, description: '', quantity: 0 });
    expect(full.body).toMatchObject({ description: null, quantity: 3 });
  });

  it('archives with active=false', async () => {
    const product = await createProduct(api);
    const res = await api.put(`/api/products/${product.id}`, { active: false });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });

  it('computes isLowStock and stockValue', async () => {
    const low = await createProduct(api, { initialQuantity: 5, reorderLevel: 5, unitCost: 0.3333 });
    expect(low.isLowStock).toBe(true);
    expect(low.stockValue).toBe(1.67);
  });

  it('filters by category, supplier, unit, active, hazardous and lowStock', async () => {
    const supplier = (await api.post('/api/suppliers', { name: 'S' })).body;
    const a = await createProduct(api, { unit: 'kg', hazardous: true, supplierId: supplier.id, initialQuantity: 1 });
    const b = await createProduct(api, { unit: 'L', active: false, initialQuantity: 100 });
    const ids = (res) => res.body.map((p) => p.id).sort();

    expect(ids(await api.list('/api/products', { filter: { categoryId: a.categoryId } }))).toEqual([a.id]);
    expect(ids(await api.list('/api/products', { filter: { categoryId: [a.categoryId, b.categoryId] } }))).toEqual([a.id, b.id]);
    expect(ids(await api.list('/api/products', { filter: { supplierId: supplier.id } }))).toEqual([a.id]);
    expect(ids(await api.list('/api/products', { filter: { unit: 'kg' } }))).toEqual([a.id]);
    expect(ids(await api.list('/api/products', { filter: { active: true } }))).toEqual([a.id]);
    expect(ids(await api.list('/api/products', { filter: { active: false } }))).toEqual([b.id]);
    expect(ids(await api.list('/api/products', { filter: { hazardous: true } }))).toEqual([a.id]);
    expect(ids(await api.list('/api/products', { filter: { lowStock: true } }))).toEqual([a.id]);
    expect(ids(await api.list('/api/products', { filter: { lowStock: false } }))).toEqual([b.id]);
    await api.post('/api/stock-movements', { productId: a.id, type: 'OUT', quantity: 1 });
    expect(ids(await api.list('/api/products', { filter: { outOfStock: true } }))).toEqual([a.id]);
    expect(ids(await api.list('/api/products', { filter: { outOfStock: false } }))).toEqual([b.id]);
    expect((await api.list('/api/products', { filter: { unit: 'parsec' } })).status).toBe(400);
    expect((await api.list('/api/products', { filter: { active: 'maybe' } })).status).toBe(400);
  });

  it('sorts by computed stockValue', async () => {
    const cheap = await createProduct(api, { initialQuantity: 1, unitCost: 1 });
    const pricey = await createProduct(api, { initialQuantity: 10, unitCost: 5 });
    const res = await api.list('/api/products', { sort: ['stockValue', 'DESC'] });
    expect(res.body.map((p) => p.id)).toEqual([pricey.id, cheap.id]);
  });

  it('searches sku, name and description', async () => {
    const p = await createProduct(api, { sku: 'GLS-01', name: 'Glass cleaner', description: 'Streak free' });
    await createProduct(api, { name: 'Other' });
    for (const q of ['gls-0', 'GLASS', 'streak']) {
      expect((await api.list('/api/products', { filter: { q } })).body.map((x) => x.id)).toEqual([p.id]);
    }
  });

  it('deletes a product without movements', async () => {
    const product = await createProduct(api);
    const res = await api.delete(`/api/products/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(product.id);
  });

  it('refuses to delete a product with movements', async () => {
    const product = await createProduct(api, { initialQuantity: 1 });
    const res = await api.delete(`/api/products/${product.id}`);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CONFLICT', message: 'Product has stock history; set it inactive instead' });
  });

  it('rejects a duplicate SKU in a different case', async () => {
    await createProduct(api, { sku: 'ABC-1' });
    const res = await api.post('/api/products', await productFixture(api, { sku: 'abc-1' }));
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CONFLICT', errors: { sku: 'SKU already exists' } });
  });
});

describe('validation', () => {
  let api;
  beforeEach(async () => ({ api } = await makeClient()));

  it('reports every missing required product field', async () => {
    const res = await api.post('/api/products', {});
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.errors).sort()).toEqual(['categoryId', 'name', 'reorderLevel', 'sku', 'unit']);
    expect(res.body.errors.sku).toBe('Required');
  });

  it.each([
    ['bad unit', { unit: 'bucket' }, 'unit'],
    ['bad sdsUrl', { sdsUrl: 'ftp://example.com/sds.pdf' }, 'sdsUrl'],
    ['non-URL sdsUrl', { sdsUrl: 'not a url' }, 'sdsUrl'],
    ['bad sku characters', { sku: 'has space' }, 'sku'],
    ['too many quantity decimals', { reorderLevel: 1.2345 }, 'reorderLevel'],
    ['too many cost decimals', { unitCost: 1.23456 }, 'unitCost'],
    ['too many initialQuantity decimals', { initialQuantity: 0.0001 }, 'initialQuantity'],
    ['negative number', { unitCost: -1 }, 'unitCost'],
    ['number too large', { reorderLevel: 1_000_000_001 }, 'reorderLevel'],
    ['numeric string', { reorderLevel: '5' }, 'reorderLevel'],
    ['string boolean', { hazardous: 'yes' }, 'hazardous'],
    ['non-existent category', { categoryId: 99999 }, 'categoryId'],
    ['non-existent supplier', { supplierId: 99999 }, 'supplierId'],
  ])('rejects %s with 422', async (_label, overrides, field) => {
    const res = await api.post('/api/products', await productFixture(api, overrides));
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty(field);
  });

  it('names the missing category', async () => {
    const res = await api.post('/api/products', await productFixture(api, { categoryId: 99 }));
    expect(res.body.errors.categoryId).toBe('Category 99 does not exist');
  });

  it('accepts the maximum number of decimals', async () => {
    const res = await api.post('/api/products', await productFixture(api, { reorderLevel: 1.125, unitCost: 0.1234 }));
    expect(res.status).toBe(201);
  });

  it('validates the merged record on PUT', async () => {
    const product = await createProduct(api);
    const res = await api.put(`/api/products/${product.id}`, { name: '' });
    expect(res.status).toBe(422);
    expect(res.body.errors.name).toBe('Required');
  });
});
