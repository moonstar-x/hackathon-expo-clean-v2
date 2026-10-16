import { createCrudRouter } from '../../lib/crudRouter.js';
import { createSuppliersRepository, supplierListSpec } from './repository.js';
import { SUPPLIER_FIELDS, supplierSchema } from './schemas.js';

export function suppliersRouter({ db }) {
  return createCrudRouter({
    listSpec: supplierListSpec,
    repository: createSuppliersRepository(db),
    createSchema: supplierSchema,
    updateSchema: supplierSchema,
    writableFields: SUPPLIER_FIELDS,
    label: 'Supplier',
  });
}
