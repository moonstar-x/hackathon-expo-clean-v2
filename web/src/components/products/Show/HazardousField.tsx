import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import type { Product } from '../../../types/api';
import type { RecordFieldProps } from '../../../types/fields';
import OutlinedBadge from '../../list/OutlinedBadge';

/** Whether the product needs safe handling: a red "Peligroso" badge when it does, "No es peligroso" when it doesn't. */
const HazardousField = (props: RecordFieldProps): ReactElement | null => {
  const record: Product | undefined = useRecordContext(props) as Product | undefined;
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return record.hazardous ? (
    <OutlinedBadge label={translate('app.products.hazardous')} tone="red" icon={<WarningAmberIcon />} />
  ) : (
    <Typography component="span" variant="body2">
      {translate('app.products.notHazardous')}
    </Typography>
  );
};

export default HazardousField;
