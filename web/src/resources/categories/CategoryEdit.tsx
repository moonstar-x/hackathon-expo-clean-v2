import type { ReactElement } from 'react';
import { Edit } from 'react-admin';
import CategoryForm from '../../components/categories/Form/CategoryForm';
import EditHeader from '../../components/EditHeader';
import { formPageSx } from '../../styles/pages';

const CategoryEdit = (): ReactElement => (
  <Edit mutationMode="pessimistic" redirect="list" actions={<EditHeader />} sx={formPageSx}>
    <CategoryForm withDelete />
  </Edit>
);

export default CategoryEdit;
