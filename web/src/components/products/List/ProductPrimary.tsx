import type { ReactElement } from 'react';
import { useRecordContext } from 'react-admin';
import type { Product } from '../../../types/api';
import StockStatusBadge from '../../fields/StockStatusBadge';
import PrimaryRow from '../../list/PrimaryRow';

/** Mobile row title: the product's name, with its stock badge top-right when stock runs low. */
const ProductPrimary = (): ReactElement | null => {
  const record: Product | undefined = useRecordContext<Product>();
  if (!record) return null;
  return <PrimaryRow end={<StockStatusBadge dense />}>{record.name}</PrimaryRow>;
};

export default ProductPrimary;
