import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useFieldValue, useTranslate, type TranslateFunction } from 'react-admin';
import { NONE } from '../../constants/components';
import { INITIAL_STOCK_REASON } from '../../constants/stockMovements';
import type { SourceFieldProps } from '../../types/fields';

/** The reason of a movement; the opening movement's one is written by the API, in English. */
const MovementReasonField = (props: SourceFieldProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const value: unknown = useFieldValue(props);
  const text: string =
    value === INITIAL_STOCK_REASON
      ? translate('app.stockMovements.initialStock')
      : typeof value === 'string' && value !== ''
        ? value
        : NONE;
  return (
    <Typography component="span" variant="body2">
      {text}
    </Typography>
  );
};

export default MovementReasonField;
