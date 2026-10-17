import type { ReactElement } from 'react';
import { Create } from 'react-admin';
import CategoryForm from '../../components/categories/Form/CategoryForm';
import CreateHeader from '../../components/CreateHeader';
import { formPageSx } from '../../styles/pages';

const CategoryCreate = (): ReactElement => (
  <Create redirect="list" actions={<CreateHeader eyebrow="app.menu.catalog" />} sx={formPageSx}>
    <CategoryForm />
  </Create>
);

export default CategoryCreate;
