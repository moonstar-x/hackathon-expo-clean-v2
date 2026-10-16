import type { ReactElement } from 'react';
import { Show } from 'react-admin';
import ProductDetail from '../../components/products/Show/ProductDetail';
import ProductHeader from '../../components/products/Show/ProductHeader';

// A plain <div> instead of react-admin's card: the detail is a column of cards of its own.
const ProductShow = (): ReactElement => (
  <Show actions={<ProductHeader />} component="div" emptyWhileLoading>
    <ProductDetail />
  </Show>
);

export default ProductShow;
