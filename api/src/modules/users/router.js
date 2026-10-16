import { createCrudRouter } from '../../lib/crudRouter.js';
import { createUsersRepository, userListSpec } from './repository.js';
import { USER_FIELDS, userCreateSchema, userUpdateSchema } from './schemas.js';

export function usersRouter({ db }) {
  return createCrudRouter({
    listSpec: userListSpec,
    repository: createUsersRepository(db),
    createSchema: userCreateSchema,
    updateSchema: userUpdateSchema,
    writableFields: USER_FIELDS,
    label: 'User',
  });
}
