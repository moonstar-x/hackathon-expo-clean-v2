import type { SortPayload } from 'react-admin';

/** Categories and suppliers are both listed by name. */
export const CATALOG_SORT: SortPayload = { field: 'name', order: 'ASC' };

/** Fields the API can sort categories by that the phone list offers (api/src/modules/categories). */
export const CATEGORY_SORT_FIELDS: string[] = ['name', 'createdAt'];

/** Fields the API can sort suppliers by that the phone list offers (api/src/modules/suppliers). */
export const SUPPLIER_SORT_FIELDS: string[] = ['name', 'contactName', 'email'];
