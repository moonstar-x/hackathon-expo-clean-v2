import CategoryIcon from '@mui/icons-material/Category';
import type { ResourceProps } from 'react-admin';
import CategoryCreate from './CategoryCreate';
import CategoryEdit from './CategoryEdit';
import CategoryList from './CategoryList';

const categories: Omit<ResourceProps, 'name'> = {
  list: CategoryList,
  create: CategoryCreate,
  edit: CategoryEdit,
  icon: CategoryIcon,
  recordRepresentation: 'name',
};

export default categories;
