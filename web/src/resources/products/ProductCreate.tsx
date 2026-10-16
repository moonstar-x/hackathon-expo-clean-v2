import type { ReactElement } from 'react';
import { Create } from 'react-admin';
import CreateHeader from '../../components/CreateHeader';
import ProductForm from '../../components/products/Form/ProductForm';
import { WIDE_FORM_MAX_WIDTH } from '../../constants/components';
import { formPageSx } from '../../styles/pages';

const ProductCreate = (): ReactElement => (
  <Create redirect="show" actions={<CreateHeader eyebrow="app.menu.inventory" />} sx={formPageSx(WIDE_FORM_MAX_WIDTH)}>
    <ProductForm mode="create" />
  </Create>
);

export default ProductCreate;
