import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { ResourceProps } from 'react-admin';
import type { Product } from '../../types/api';
import ProductCreate from './ProductCreate';
import ProductEdit from './ProductEdit';
import ProductList from './ProductList';
import ProductShow from './ProductShow';

const products: Omit<ResourceProps, 'name'> = {
  list: ProductList,
  create: ProductCreate,
  edit: ProductEdit,
  show: ProductShow,
  icon: Inventory2Icon,
  recordRepresentation: (record: Product): string => `${record.sku} — ${record.name}`,
};

export default products;
