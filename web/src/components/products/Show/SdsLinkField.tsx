import type { ReactElement } from 'react';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { sdsLinkSx } from '../../../styles/products';
import type { Product } from '../../../types/api';
import type { RecordFieldProps } from '../../../types/fields';

/** The product's safety data sheet: a link that opens it in a new tab, or "Sin ficha" in muted text. */
const SdsLinkField = (props: RecordFieldProps): ReactElement | null => {
  const record: Product | undefined = useRecordContext(props) as Product | undefined;
  const translate: TranslateFunction = useTranslate();
  if (!record) return null;
  return record.sdsUrl ? (
    <Link href={record.sdsUrl} target="_blank" rel="noopener noreferrer" variant="body2" sx={sdsLinkSx}>
      {translate('app.products.openSds')}
      <OpenInNewIcon fontSize="inherit" />
    </Link>
  ) : (
    <Typography component="span" variant="body2" color="text.secondary">
      {translate('app.products.noSds')}
    </Typography>
  );
};

export default SdsLinkField;
