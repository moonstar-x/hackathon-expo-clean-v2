import type { ListLinkSort } from '../types/dashboard';

/** A link to the products list with the given filter and sort applied (react-admin reads them from the URL). */
export const productListLink = (filter: Record<string, unknown>, sort?: ListLinkSort): string => {
  const params: URLSearchParams = new URLSearchParams({ filter: JSON.stringify(filter) });
  if (sort) {
    params.set('sort', sort.field);
    params.set('order', sort.order);
  }
  return `/products?${params.toString()}`;
};
