import { createCrudRouter } from '../../lib/crudRouter.js';
import { categoryListSpec, createCategoriesRepository } from './repository.js';
import { CATEGORY_FIELDS, categorySchema } from './schemas.js';

export function categoriesRouter({ db }) {
  return createCrudRouter({
    listSpec: categoryListSpec,
    repository: createCategoriesRepository(db),
    createSchema: categorySchema,
    updateSchema: categorySchema,
    writableFields: CATEGORY_FIELDS,
    label: 'Category',
  });
}
