import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useFieldValue, useRecordContext } from 'react-admin';
import type { Product } from '../../types/api';
import type { SourceFieldProps } from '../../types/fields';
import { formatQuantity } from '../../utils/format';

/** A product quantity with the record's own unit: `12,5 L`, `2 cajas`. */
const QuantityField = (props: SourceFieldProps): ReactElement => {
  const record: Product | undefined = useRecordContext(props) as Product | undefined;
  const value: unknown = useFieldValue(props);
  return (
    <Typography component="span" variant="body2">
      {formatQuantity(typeof value === 'number' ? value : undefined, record?.unit)}
    </Typography>
  );
};

export default QuantityField;
