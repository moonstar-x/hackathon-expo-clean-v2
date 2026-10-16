import { useGetIdentity, type UseGetIdentityResult } from 'react-admin';
import type { User } from '../types/api';

/** True when `record` is the signed-in user's own account. */
const useIsSelf = (record: Pick<User, 'id'> | undefined): boolean => {
  const { identity }: UseGetIdentityResult = useGetIdentity();
  return record !== undefined && identity !== undefined && record.id === identity.id;
};

export default useIsSelf;
