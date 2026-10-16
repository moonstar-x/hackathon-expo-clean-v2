import type { ReactElement } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import { Pagination, ReferenceManyField, useTranslate, type TranslateFunction } from 'react-admin';
import { HISTORY_PER_PAGE, HISTORY_ROWS_PER_PAGE, MOVEMENT_SORT } from '../../../../constants/stockMovements';
import ResponsiveSwitch from '../../../ResponsiveSwitch';
import DesktopList from './DesktopList';
import MobileList from './MobileList';

/** The product's stock movements, newest first, ten at a time: a table from `md`, cards below. */
const StockHistory = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Card>
      <CardHeader title={translate('app.products.history')} slotProps={{ title: { component: 'h2', variant: 'h6' } }} />
      <ReferenceManyField
        reference="stock-movements"
        target="productId"
        sort={MOVEMENT_SORT}
        perPage={HISTORY_PER_PAGE}
        pagination={<Pagination rowsPerPageOptions={HISTORY_ROWS_PER_PAGE} />}
      >
        <ResponsiveSwitch mobile={<MobileList />} desktop={<DesktopList />} />
      </ReferenceManyField>
    </Card>
  );
};

export default StockHistory;
