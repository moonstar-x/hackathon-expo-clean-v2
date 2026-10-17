import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslate, type TranslateFunction } from 'react-admin';
import ResponsiveSwitch from '../../ResponsiveSwitch';
import TechnicalOfferCard from './TechnicalOfferCard';
import TechnicalOfferTable from './TechnicalOfferTable';
import { number } from '../../../quotes/format';
import { offerCardsSx, offerFigureSx, offerTotalSx } from '../../../styles/quotes';
import type { TechnicalOfferProps, TechnicalOfferRow } from '../../../types/quotes';

/** The quote's Oferta técnica tab: how each active zone is cleaned, as a table or, on phones, cards. */
const TechnicalOffer = ({ rows, totalFte }: TechnicalOfferProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  if (rows.length === 0) return <Typography color="text.secondary">{translate('app.quotes.offer.empty')}</Typography>;
  return (
    <ResponsiveSwitch
      desktop={<TechnicalOfferTable rows={rows} totalFte={totalFte} />}
      mobile={
        <Box sx={offerCardsSx}>
          {rows.map(
            (row: TechnicalOfferRow, index: number): ReactElement => (
              <TechnicalOfferCard key={row.zoneId ?? `zone-${index}`} row={row} />
            ),
          )}
          <Box sx={offerTotalSx}>
            <span>{translate('app.quotes.offer.totalStaff')}</span>
            <Box component="span" sx={offerFigureSx}>
              {number(totalFte)}
            </Box>
          </Box>
        </Box>
      }
    />
  );
};

export default TechnicalOffer;
