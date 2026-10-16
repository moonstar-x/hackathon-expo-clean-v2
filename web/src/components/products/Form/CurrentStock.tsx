import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { Labeled, useTranslate, type TranslateFunction } from 'react-admin';
import { fieldNoteSx } from '../../../styles/pages';
import QuantityField from '../../fields/QuantityField';

/** On the edit form the stock on hand is shown, not edited: only stock movements change it. */
const CurrentStock = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Labeled label="app.products.currentStock">
      <>
        <QuantityField source="quantity" />
        <Typography variant="caption" sx={fieldNoteSx}>
          {translate('app.products.help.currentStock')}
        </Typography>
      </>
    </Labeled>
  );
};

export default CurrentStock;
