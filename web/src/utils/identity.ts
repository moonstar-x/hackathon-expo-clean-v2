import type { UserIdentity } from 'react-admin';
import type { AppIdentity } from '../types/appBar';

/** Whether react-admin's identity is the one this app's authProvider returns. */
export const isAppIdentity = (identity: UserIdentity | undefined): identity is AppIdentity & UserIdentity =>
  typeof identity?.id === 'number' && typeof identity.fullName === 'string' && typeof identity.email === 'string';

/**
 * Two letters for the avatar: the first of two words of the name (or of an email's local part),
 * otherwise its first two letters. "ana.perez@x.com" → "AP", "Ana Pérez" → "AP", "admin@x.com" → "AD".
 */
export const initials = (name: string): string => {
  const local: string = name.split('@')[0] ?? '';
  const words: string[] = local.split(/[\s._-]+/).filter(Boolean);
  const letters: string = words.length > 1 ? `${words[0][0]}${words[1][0]}` : local.slice(0, 2);
  return letters.toUpperCase();
};
