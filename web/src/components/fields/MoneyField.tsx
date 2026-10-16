import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useFieldValue } from 'react-admin';
import { useAppConfig } from '../../AppConfigContext';
import type { SourceFieldProps } from '../../types/fields';
import { formatCurrency } from '../../utils/format';

/** Money in the configured currency (VITE_CURRENCY). */
const MoneyField = (props: SourceFieldProps): ReactElement => {
  const { currency } = useAppConfig();
  const value: unknown = useFieldValue(props);
  return (
    <Typography component="span" variant="body2">
      {formatCurrency(typeof value === 'number' ? value : undefined, currency)}
    </Typography>
  );
};

export default MoneyField;
