import type { ReactElement } from 'react';
import Button from '@mui/material/Button';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { Link } from 'react-router-dom';
import { useTranslate, type TranslateFunction } from 'react-admin';

/** The empty quotes list's way forward: quotes start from a measurement. */
const SeeMeasurementsButton = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Button variant="contained" component={Link} to="/measurements" startIcon={<ViewInArIcon />}>
      {translate('app.empty.quotes.action')}
    </Button>
  );
};

export default SeeMeasurementsButton;
