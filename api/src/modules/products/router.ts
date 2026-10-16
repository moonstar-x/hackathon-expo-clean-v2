import type { AppDeps } from '../../app.ts';
import { createCrudRouter } from '../../lib/crudRouter.ts';
import { createProductsRepository, productListSpec } from './repository.ts';
import { PRODUCT_FIELDS, productCreateSchema, productUpdateSchema } from './schemas.ts';

export function productsRouter({ db }: AppDeps) {
  return createCrudRouter({
    listSpec: productListSpec,
    repository: createProductsRepository(db),
    createSchema: productCreateSchema,
    updateSchema: productUpdateSchema,
    writableFields: PRODUCT_FIELDS,
    label: 'Product',
  });
}
