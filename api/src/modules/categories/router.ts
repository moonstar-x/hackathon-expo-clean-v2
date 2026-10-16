import type { AppDeps } from '../../app.ts';
import { createCrudRouter } from '../../lib/crudRouter.ts';
import { categoryListSpec, createCategoriesRepository } from './repository.ts';
import { CATEGORY_FIELDS, categorySchema } from './schemas.ts';

export function categoriesRouter({ db }: AppDeps) {
  return createCrudRouter({
    listSpec: categoryListSpec,
    repository: createCategoriesRepository(db),
    createSchema: categorySchema,
    updateSchema: categorySchema,
    writableFields: CATEGORY_FIELDS,
    label: 'Category',
  });
}
