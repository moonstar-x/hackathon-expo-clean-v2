import type { AppDeps } from '../../app.ts';
import { createCrudRouter } from '../../lib/crudRouter.ts';
import { createSuppliersRepository, supplierListSpec } from './repository.ts';
import { SUPPLIER_FIELDS, supplierSchema } from './schemas.ts';

export function suppliersRouter({ db }: AppDeps) {
  return createCrudRouter({
    listSpec: supplierListSpec,
    repository: createSuppliersRepository(db),
    createSchema: supplierSchema,
    updateSchema: supplierSchema,
    writableFields: SUPPLIER_FIELDS,
    label: 'Supplier',
  });
}
