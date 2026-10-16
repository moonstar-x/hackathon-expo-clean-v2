import PeopleIcon from '@mui/icons-material/People';
import type { ResourceProps } from 'react-admin';
import type { User } from '../../types/api';
import UserCreate from './UserCreate';
import UserEdit from './UserEdit';
import UserList from './UserList';

const users: Omit<ResourceProps, 'name'> = {
  list: UserList,
  create: UserCreate,
  edit: UserEdit,
  icon: PeopleIcon,
  recordRepresentation: (record: User): string => record.name || record.email,
};

export default users;
