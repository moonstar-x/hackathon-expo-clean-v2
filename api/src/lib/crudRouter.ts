import express from 'express';
import type { z } from 'zod';
import type { AuthUser } from '../middleware/auth.ts';
import { notFound } from './errors.ts';
import { type ListSpec, type ParsedListQuery, parseListQuery, sendList } from './listQuery.ts';
import { mergeForUpdate, parseId, requireObjectBody } from './validation.ts';

/** Passed to repository writes. `user` is the caller. */
export interface RequestContext {
  user: AuthUser;
}

/**
 * What a resource's repository must implement for `createCrudRouter`.
 * `create`, `update` and `remove` may return a promise. `create` is only
 * needed when a `createSchema` is given.
 */
export interface CrudRepository<T extends { id: number }, C, U> {
  list(parsed: ParsedListQuery): { records: T[]; total: number };
  findById(id: number): T | null;
  create?(data: C, ctx: RequestContext): T | Promise<T>;
  update(id: number, data: U, current: T, ctx: RequestContext): T | Promise<T>;
  remove(id: number, current: T, ctx: RequestContext): void | Promise<void>;
}

interface CrudRouterOptions<T extends { id: number }, CS extends z.ZodType, US extends z.ZodType> {
  listSpec: ListSpec;
  repository: CrudRepository<T, z.output<CS>, z.output<US>>;
  /** Omit when the resource registers its own POST route (e.g. a multipart upload). */
  createSchema?: CS;
  updateSchema: US;
  writableFields: readonly string[];
  label: string;
}

/**
 * Builds the five ra-data-simple-rest endpoints for a resource.
 *
 * PUT uses merge semantics: the current record's writable fields are
 * overridden by the ones present in the body, and the result is validated as
 * a whole. Read-only and unknown body fields are ignored.
 */
export function createCrudRouter<T extends { id: number }, CS extends z.ZodType, US extends z.ZodType>({
  listSpec,
  repository,
  createSchema,
  updateSchema,
  writableFields,
  label,
}: CrudRouterOptions<T, CS, US>) {
  const router = express.Router();

  const load = (rawId: string) => {
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

  // `req.user` is always set here: these routes are mounted behind requireAuth.
  if (createSchema) {
    router.post('/', async (req, res) => {
      const data = createSchema.parse(requireObjectBody(req.body));
      res.status(201).json(await repository.create!(data, { user: req.user! }));
    });
  }

  router.put('/:id', async (req, res) => {
    const current = load(req.params.id);
    const body = requireObjectBody(req.body);
    const data = updateSchema.parse(mergeForUpdate(current, body, writableFields));
    res.json(await repository.update(current.id, data, current, { user: req.user! }));
  });

  router.delete('/:id', async (req, res) => {
    const current = load(req.params.id);
    await repository.remove(current.id, current, { user: req.user! });
    res.json(current);
  });

  return router;
}
