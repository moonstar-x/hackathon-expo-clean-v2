import type { ReactElement } from 'react';
import { Create } from 'react-admin';
import CreateHeader from '../../components/CreateHeader';
import UserForm from '../../components/users/Form/UserForm';
import { FORM_MAX_WIDTH } from '../../constants/components';
import { formPageSx } from '../../styles/pages';

const UserCreate = (): ReactElement => (
  <Create redirect="list" actions={<CreateHeader eyebrow="app.menu.administration" />} sx={formPageSx(FORM_MAX_WIDTH)}>
    <UserForm />
  </Create>
);

export default UserCreate;
