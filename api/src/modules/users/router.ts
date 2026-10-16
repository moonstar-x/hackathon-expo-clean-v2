import type { AppDeps } from '../../app.ts';
import { createCrudRouter } from '../../lib/crudRouter.ts';
import { createUsersRepository, userListSpec } from './repository.ts';
import { USER_FIELDS, userCreateSchema, userUpdateSchema } from './schemas.ts';

export function usersRouter({ db }: AppDeps) {
  return createCrudRouter({
    listSpec: userListSpec,
    repository: createUsersRepository(db),
    createSchema: userCreateSchema,
    updateSchema: userUpdateSchema,
    writableFields: USER_FIELDS,
    label: 'User',
  });
}
