import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { NONE } from '../../../constants/components';
import useIsSelf from '../../../hooks/useIsSelf';
import type { User } from '../../../types/api';
import type { RecordFieldProps } from '../../../types/fields';
import OutlinedBadge from '../../list/OutlinedBadge';

/** The name (or a dash), plus a "Tú" badge on your own row. */
const UserNameField = (props: RecordFieldProps): ReactElement | null => {
  const record: User | undefined = useRecordContext(props) as User | undefined;
  const translate: TranslateFunction = useTranslate();
  const isSelf: boolean = useIsSelf(record);
  if (!record) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography component="span" variant="body2">
        {record.name || NONE}
      </Typography>
      {isSelf ? <OutlinedBadge label={translate('app.users.you')} tone="brand" dense /> : null}
    </Stack>
  );
};

export default UserNameField;
