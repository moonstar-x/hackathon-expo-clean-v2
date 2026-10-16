import type { SortPayload } from 'react-admin';

// Client-side mirror of the API's password rules (SPEC-003). The server stays authoritative.
export const PASSWORD_MIN_LENGTH: number = 8;
export const PASSWORD_MAX_LENGTH: number = 128;

export const USER_SORT: SortPayload = { field: 'email', order: 'ASC' };

/** Fields the API can sort users by that the phone list offers (api/src/modules/users). */
export const USER_SORT_FIELDS: string[] = ['email', 'name', 'lastLoginAt', 'createdAt'];
