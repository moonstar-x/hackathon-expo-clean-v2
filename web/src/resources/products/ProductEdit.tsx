import type { ReactElement } from 'react';
import { Edit, ShowButton } from 'react-admin';
import EditHeader from '../../components/EditHeader';
import ProductForm from '../../components/products/Form/ProductForm';
import { formPageSx } from '../../styles/pages';

const ProductEdit = (): ReactElement => (
  <Edit
    mutationMode="pessimistic"
    redirect="show"
    actions={<EditHeader actions={<ShowButton />} />}
    sx={formPageSx}
  >
    <ProductForm mode="edit" />
  </Edit>
);

export default ProductEdit;
