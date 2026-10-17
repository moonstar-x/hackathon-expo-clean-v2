import type { ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { TdrDocument } from '../../../types/tdr';
import { formatDateTime } from '../../../utils/dates';
import MetaRow from '../../list/MetaRow';

/** Mobile row details: the file and its zones, when it was uploaded, and by whom. */
const TdrSecondary = (): ReactElement | null => {
  const doc: TdrDocument | undefined = useRecordContext<TdrDocument>();
  const translate: TranslateFunction = useTranslate();
  if (!doc) return null;
  return (
    <Stack component="span" spacing={0.5} sx={{ display: 'flex' }}>
      <MetaRow icon={DescriptionOutlined}>
        {doc.zoneCount === null ? doc.fileName : `${doc.fileName} · ${translate('app.tdr.zones', { smart_count: doc.zoneCount })}`}
      </MetaRow>
      <MetaRow icon={ScheduleOutlined}>{formatDateTime(doc.createdAt)}</MetaRow>
      <MetaRow icon={PersonOutlined}>{doc.createdBy}</MetaRow>
    </Stack>
  );
};

export default TdrSecondary;
