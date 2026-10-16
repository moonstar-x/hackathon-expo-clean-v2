import { createUsersRepository } from './repository.js';
import { userCreateSchema } from './schemas.js';

/**
 * Creates the first account from ADMIN_EMAIL / ADMIN_PASSWORD when the users
 * table is empty, so a fresh install has someone who can log in. Once any user
 * exists this does nothing: accounts are managed through /api/users.
 * @returns {Promise<ReturnType<typeof import('./repository.js').toUser> | null>} the created user, or null
 */
export async function ensureInitialUser(db, config, options) {
  const users = createUsersRepository(db, options);
  if (users.count() > 0) return null;
  const data = userCreateSchema.parse({ email: config.adminEmail, name: null, password: config.adminPassword, active: true });
  return users.create(data);
}
