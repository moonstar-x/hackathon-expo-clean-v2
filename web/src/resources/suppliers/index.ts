import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import type { ResourceProps } from 'react-admin';
import SupplierCreate from './SupplierCreate';
import SupplierEdit from './SupplierEdit';
import SupplierList from './SupplierList';

const suppliers: Omit<ResourceProps, 'name'> = {
  list: SupplierList,
  create: SupplierCreate,
  edit: SupplierEdit,
  icon: LocalShippingIcon,
  recordRepresentation: 'name',
};

export default suppliers;
