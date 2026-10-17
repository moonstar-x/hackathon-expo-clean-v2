import type { ReactElement } from 'react';
import { Edit } from 'react-admin';
import EditHeader from '../../components/EditHeader';
import SupplierForm from '../../components/suppliers/Form/SupplierForm';
import { formPageSx } from '../../styles/pages';

const SupplierEdit = (): ReactElement => (
  <Edit mutationMode="pessimistic" redirect="list" actions={<EditHeader />} sx={formPageSx}>
    <SupplierForm withDelete />
  </Edit>
);

export default SupplierEdit;
