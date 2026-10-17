import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useFieldValue, useTranslate, type TranslateFunction } from 'react-admin';
import type { SourceFieldProps } from '../../types/fields';

/** A yes/no value as a word ("Sí", "No") on detail pages, where a lone check mark reads as decoration. */
const YesNoField = (props: SourceFieldProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const value: unknown = useFieldValue(props);
  return (
    <Typography component="span" variant="body2">
      {translate(value ? 'ra.boolean.true' : 'ra.boolean.false')}
    </Typography>
  );
};

export default YesNoField;
