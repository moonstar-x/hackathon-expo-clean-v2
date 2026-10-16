import express from 'express';
import { notFound } from './errors.js';
import { parseListQuery, sendList } from './listQuery.js';
import { mergeForUpdate, parseId, requireObjectBody } from './validation.js';

/**
 * Builds the five ra-data-simple-rest endpoints for a resource.
 *
 * The repository must implement:
 *   list(parsedQuery) → { records, total }
 *   findById(id) → record | null
 *   create(data, ctx) → record
 *   update(id, data, current, ctx) → record
 *   remove(id, current, ctx) → void
 *
 * `create`, `update` and `remove` may return a promise. `ctx.user` is the caller.
 *
 * PUT uses merge semantics: the current record's writable fields are
 * overridden by the ones present in the body, and the result is validated as
 * a whole. Read-only and unknown body fields are ignored.
 */
export function createCrudRouter({ listSpec, repository, createSchema, updateSchema, writableFields, label }) {
  const router = express.Router();

  const load = (rawId) => {
    const id = parseId(rawId);
    const record = repository.findById(id);
    if (!record) throw notFound(`${label} ${id} not found`);
    return record;
  };

  router.get('/', (req, res) => {
    const parsed = parseListQuery(req.query, listSpec);
    const { records, total } = repository.list(parsed);
    sendList(res, listSpec.resource, parsed.range, records, total);
  });

  router.get('/:id', (req, res) => {
    res.json(load(req.params.id));
  });

  router.post('/', async (req, res) => {
    const data = createSchema.parse(requireObjectBody(req.body));
    res.status(201).json(await repository.create(data, { user: req.user }));
  });

  router.put('/:id', async (req, res) => {
    const current = load(req.params.id);
    const body = requireObjectBody(req.body);
    const data = updateSchema.parse(mergeForUpdate(current, body, writableFields));
    res.json(await repository.update(current.id, data, current, { user: req.user }));
  });

  router.delete('/:id', async (req, res) => {
    const current = load(req.params.id);
    await repository.remove(current.id, current, { user: req.user });
    res.json(current);
  });

  return router;
}
