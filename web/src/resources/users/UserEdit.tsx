import type { ReactElement } from 'react';
import { Edit, useGetIdentity, useNotify, useRedirect, type UseGetIdentityResult } from 'react-admin';
import EditHeader from '../../components/EditHeader';
import UserForm from '../../components/users/Form/UserForm';
import { updateStoredUser } from '../../providers/authStorage';
import { formPageSx } from '../../styles/pages';
import type { User } from '../../types/api';

const UserEdit = (): ReactElement => {
  const notify: ReturnType<typeof useNotify> = useNotify();
  const redirect: ReturnType<typeof useRedirect> = useRedirect();
  const { identity, refetch }: UseGetIdentityResult = useGetIdentity();

  // react-admin's default (notification, back to the list), plus refreshing the
  // app bar when you edit your own name or email (SPEC-003).
  const onSuccess = (user: User): void => {
    if (user.id === identity?.id) {
      updateStoredUser(user);
      void refetch();
    }
    notify('ra.notification.updated', { type: 'info', messageArgs: { smart_count: 1 } });
    redirect('list', 'users');
  };

  return (
    <Edit<User>
      mutationMode="pessimistic"
      mutationOptions={{ onSuccess }}
      actions={<EditHeader />}
      sx={formPageSx}
    >
      <UserForm isEdit />
    </Edit>
  );
};

export default UserEdit;
