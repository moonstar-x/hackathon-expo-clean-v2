import { useGetManyAggregate, type UseGetManyHookValue } from 'react-admin';
import type { Product, Unit } from '../types/api';

/** Loads the unit of a movement's product (batched and cached with the ReferenceFields). */
const useProductUnit = (productId: number | undefined): Unit | undefined => {
  const { data }: UseGetManyHookValue<Product> = useGetManyAggregate<Product>(
    'products',
    { ids: productId ? [productId] : [] },
    { enabled: !!productId },
  );
  return data?.[0]?.unit;
};

export default useProductUnit;
