import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTranslate, type TranslateFunction } from 'react-admin';
import OfferFrequency from './OfferFrequency';
import OfferPerCleaning from './OfferPerCleaning';
import OfferZone from './OfferZone';
import ProductDoses from './ProductDoses';
import { number } from '../../../quotes/format';
import {
  offerCardBlockSx,
  offerCardLabelSx,
  offerCardStaffSx,
  offerCardSx,
  offerFigureSx,
} from '../../../styles/quotes';
import type { TechnicalOfferRowProps } from '../../../types/quotes';

/** A zone of the technical offer on phones: the table's five columns, one under another. */
const TechnicalOfferCard = ({ row }: TechnicalOfferRowProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const blocks: [string, ReactElement][] = [
    ['frequency', <OfferFrequency row={row} />],
    ['products', <ProductDoses row={row} />],
    ['perCleaning', <OfferPerCleaning row={row} />],
  ];
  return (
    <Card component="article" variant="outlined" sx={offerCardSx}>
      <OfferZone row={row} heading />
      {blocks.map(
        ([key, content]: [string, ReactElement]): ReactElement => (
          <Box key={key} sx={offerCardBlockSx}>
            <Box sx={offerCardLabelSx}>{translate(`app.quotes.offer.${key}`)}</Box>
            {content}
          </Box>
        ),
      )}
      <Box sx={offerCardStaffSx}>
        <Box sx={offerCardLabelSx}>{translate('app.quotes.offer.staff')}</Box>
        <Box sx={offerFigureSx}>{number(row.fte)}</Box>
      </Box>
    </Card>
  );
};

export default TechnicalOfferCard;
