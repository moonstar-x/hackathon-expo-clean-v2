import type { ReactElement } from 'react';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import useIsSelf from '../../../hooks/useIsSelf';
import type { User } from '../../../types/api';
import OutlinedBadge from '../../list/OutlinedBadge';
import PrimaryRow from '../../list/PrimaryRow';

/** Mobile row title: the name (the email when there is none), with "Tú" top-right on your own account. */
const UserPrimary = (): ReactElement | null => {
  const record: User | undefined = useRecordContext<User>();
  const translate: TranslateFunction = useTranslate();
  const isSelf: boolean = useIsSelf(record);
  if (!record) return null;
  return (
    <PrimaryRow end={isSelf ? <OutlinedBadge label={translate('app.users.you')} tone="brand" dense /> : null}>
      {record.name || record.email}
    </PrimaryRow>
  );
};

export default UserPrimary;
