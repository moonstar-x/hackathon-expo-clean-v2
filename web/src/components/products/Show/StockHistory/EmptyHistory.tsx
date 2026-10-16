import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useTranslate, type TranslateFunction } from 'react-admin';

/** What the history shows before the product's first movement. */
const EmptyHistory = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
      {translate('app.products.historyEmpty')}
    </Typography>
  );
};

export default EmptyHistory;
