import type { ReactElement } from 'react';
import { Create } from 'react-admin';
import CreateHeader from '../../components/CreateHeader';
import SupplierForm from '../../components/suppliers/Form/SupplierForm';
import { FORM_MAX_WIDTH } from '../../constants/components';
import { formPageSx } from '../../styles/pages';

const SupplierCreate = (): ReactElement => (
  <Create redirect="list" actions={<CreateHeader eyebrow="app.menu.catalog" />} sx={formPageSx(FORM_MAX_WIDTH)}>
    <SupplierForm />
  </Create>
);

export default SupplierCreate;
