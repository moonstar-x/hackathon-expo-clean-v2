import type { ReactElement } from 'react';
import {
  BooleanField,
  BulkDeleteButton,
  DataTable,
  DateField,
  List,
  useGetIdentity,
  type UseGetIdentityResult,
} from 'react-admin';
import { USER_SORT } from '../../../constants/users';
import type { User } from '../../../types/api';
import AppPagination from '../../AppPagination';
import DesktopActions from './DesktopActions';
import UserNameField from './UserNameField';
import { userFilters } from './userFilters';

/** The users as a table; a row opens its edit form. Your own account can't be selected for deletion. */
const DesktopList = (): ReactElement => {
  const { identity }: UseGetIdentityResult = useGetIdentity();
  return (
    <List filters={userFilters} sort={USER_SORT} actions={<DesktopActions />} pagination={<AppPagination />}>
      <DataTable<User>
        rowClick="edit"
        // The API refuses to delete your own account, so it cannot be selected for bulk delete.
        isRowSelectable={(record: User): boolean => record.id !== identity?.id}
        bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}
      >
        <DataTable.Col source="name">
          <UserNameField />
        </DataTable.Col>
        <DataTable.Col source="email" />
        <DataTable.Col source="active" field={BooleanField} />
        <DataTable.Col source="lastLoginAt">
          <DateField source="lastLoginAt" showTime emptyText="app.users.never" />
        </DataTable.Col>
        <DataTable.Col source="createdAt">
          <DateField source="createdAt" />
        </DataTable.Col>
      </DataTable>
    </List>
  );
};

export default DesktopList;
