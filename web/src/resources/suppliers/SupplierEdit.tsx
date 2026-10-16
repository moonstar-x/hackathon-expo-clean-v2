import type { ReactElement } from 'react';
import { Edit } from 'react-admin';
import EditHeader from '../../components/EditHeader';
import SupplierForm from '../../components/suppliers/Form/SupplierForm';
import { FORM_MAX_WIDTH } from '../../constants/components';
import { formPageSx } from '../../styles/pages';

const SupplierEdit = (): ReactElement => (
  <Edit mutationMode="pessimistic" redirect="list" actions={<EditHeader />} sx={formPageSx(FORM_MAX_WIDTH)}>
    <SupplierForm withDelete />
  </Edit>
);

export default SupplierEdit;
