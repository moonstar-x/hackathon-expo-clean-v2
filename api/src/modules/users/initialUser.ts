import type Database from 'better-sqlite3';
import type { Config } from '../../config.ts';
import { createUsersRepository, type User, type UsersRepositoryOptions } from './repository.ts';
import { userCreateSchema } from './schemas.ts';

/**
 * Creates the first account from ADMIN_EMAIL / ADMIN_PASSWORD when the users
 * table is empty, so a fresh install has someone who can log in. Once any user
 * exists this does nothing: accounts are managed through /api/users.
 * Returns the created user, or null.
 */
export async function ensureInitialUser(
  db: Database.Database,
  config: Config,
  options?: UsersRepositoryOptions,
): Promise<User | null> {
  const users = createUsersRepository(db, options);
  if (users.count() > 0) return null;
  const data = userCreateSchema.parse({ email: config.adminEmail, name: null, password: config.adminPassword, active: true });
  return users.create(data);
}
