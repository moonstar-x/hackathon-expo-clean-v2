import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import MailOutlined from '@mui/icons-material/MailOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import { useRecordContext } from 'react-admin';
import type { Supplier } from '../../../types/api';
import MetaRow from '../../list/MetaRow';

/** Mobile row details: whoever is on file to contact, and how. Lines without a value are left out. */
const SupplierSecondary = (): ReactElement | null => {
  const record: Supplier | undefined = useRecordContext<Supplier>();
  if (!record) return null;
  return (
    <Stack component="span" spacing={0.5} sx={{ display: 'flex' }}>
      {record.contactName ? <MetaRow icon={PersonOutlined}>{record.contactName}</MetaRow> : null}
      {record.email ? <MetaRow icon={MailOutlined}>{record.email}</MetaRow> : null}
      {record.phone ? <MetaRow icon={PhoneOutlined}>{record.phone}</MetaRow> : null}
    </Stack>
  );
};

export default SupplierSecondary;
