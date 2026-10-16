import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { User } from '../../../types/api';
import { formatDateTime } from '../../../utils/dates';
import MetaRow from '../../list/MetaRow';
import OutlinedBadge from '../../list/OutlinedBadge';

/** Mobile row details: the email (when the title is the name), the last sign-in, and inactive accounts. */
const UserSecondary = (): ReactElement | null => {
  const record: User | undefined = useRecordContext<User>();
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return (
    <Stack component="span" spacing={0.5} sx={{ display: 'flex' }}>
      {record.name ? <MetaRow icon={MailOutlined}>{record.email}</MetaRow> : null}
      <MetaRow icon={LoginOutlined}>
        {record.lastLoginAt
          ? translate('app.users.lastLogin', { date: formatDateTime(record.lastLoginAt) })
          : translate('app.users.neverSignedIn')}
      </MetaRow>
      {record.active ? null : (
        <span>
          <OutlinedBadge label={translate('app.users.inactive')} dense />
        </span>
      )}
    </Stack>
  );
};

export default UserSecondary;
