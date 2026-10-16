import { Create } from 'react-admin';
import { ProductForm } from './ProductForm';

export function ProductCreate() {
  return (
    <Create redirect="show">
      <ProductForm mode="create" />
    </Create>
  );
}
