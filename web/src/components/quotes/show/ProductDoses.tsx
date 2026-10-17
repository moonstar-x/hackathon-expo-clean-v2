import { Fragment, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { OFFER_PRODUCTS } from '../../../constants/quotes';
import { productDosesSx } from '../../../styles/quotes';
import type { OfferProductKey, TechnicalOfferRowProps, TechnicalProduct } from '../../../types/quotes';
import { formatDose } from '../../../utils/quotes';

/**
 * A zone's products: what each is for, the product, and its dose per litre of water. A zone without
 * terminal cleanings never uses its terminal disinfectant, so it isn't listed.
 */
const ProductDoses = ({ row }: TechnicalOfferRowProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const products: [string, OfferProductKey][] = OFFER_PRODUCTS.filter(
    ([, key]: [string, OfferProductKey]): boolean => key !== 'terminalDisinfectant' || row.terminalsPerMonth > 0,
  );
  return (
    <Box component="dl" sx={productDosesSx}>
      {products.map(([role, key]: [string, OfferProductKey]): ReactElement => {
        const product: TechnicalProduct = row[key];
        return (
          <Fragment key={role}>
            <dt>{translate(`app.quotes.offer.roles.${role}`)}</dt>
            <dd>{product.name}</dd>
            <dd>{formatDose(product.dosePerLiter, product.doseUnit)}</dd>
          </Fragment>
        );
      })}
    </Box>
  );
};

export default ProductDoses;
