import express from 'express';
import { methodNotAllowed, notFound } from '../../lib/errors.js';
import { parseListQuery, sendList } from '../../lib/listQuery.js';
import { parseId, requireObjectBody } from '../../lib/validation.js';
import { createStockMovementsRepository, movementListSpec } from './repository.js';
import { movementSchema } from './schemas.js';

const LEDGER_IS_APPEND_ONLY = 'Stock movements cannot be changed or deleted; record a new movement to correct a mistake';

export function stockMovementsRouter({ db }) {
  const repo = createStockMovementsRepository(db);
  const router = express.Router();

  router.get('/', (req, res) => {
    const parsed = parseListQuery(req.query, movementListSpec);
    const { records, total } = repo.list(parsed);
    sendList(res, movementListSpec.resource, parsed.range, records, total);
  });

  router.get('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const movement = repo.findById(id);
    if (!movement) throw notFound(`Stock movement ${id} not found`);
    res.json(movement);
  });

  router.post('/', (req, res) => {
    const input = movementSchema.parse(requireObjectBody(req.body));
    res.status(201).json(repo.record(input, req.user.email));
  });

  const rejectChange = (_req, res) => {
    res.set('Allow', 'GET');
    throw methodNotAllowed(LEDGER_IS_APPEND_ONLY);
  };
  router.put('/:id', rejectChange);
  router.delete('/:id', rejectChange);

  return router;
}
