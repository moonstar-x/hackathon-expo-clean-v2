import { createCrudRouter } from '../../lib/crudRouter.js';
import { createProductsRepository, productListSpec } from './repository.js';
import { PRODUCT_FIELDS, productCreateSchema, productUpdateSchema } from './schemas.js';

export function productsRouter({ db }) {
  return createCrudRouter({
    listSpec: productListSpec,
    repository: createProductsRepository(db),
    createSchema: productCreateSchema,
    updateSchema: productUpdateSchema,
    writableFields: PRODUCT_FIELDS,
    label: 'Product',
  });
}
