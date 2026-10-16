import { useGetManyAggregate } from 'react-admin';
import type { Product } from '../types';

/** Loads the unit of a movement's product (batched and cached with the ReferenceFields). */
export function useProductUnit(productId: number | undefined): string | undefined {
  const { data } = useGetManyAggregate<Product>('products', { ids: productId ? [productId] : [] }, { enabled: !!productId });
  return data?.[0]?.unit;
}
