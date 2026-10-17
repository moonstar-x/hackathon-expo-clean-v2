import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { offerMutedSx } from '../../../styles/quotes';
import type { TechnicalOfferRowProps } from '../../../types/quotes';
import { formatNumber } from '../../../utils/format';
import { cleaningFrequency } from '../../../utils/quotes';

/** How often a zone is cleaned and disinfected, and on which schedule. */
const OfferFrequency = ({ row }: TechnicalOfferRowProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Box>
      <Box>{cleaningFrequency(row.hoursBetweenCleanings, row.cleaningsPerDay)}</Box>
      <Box>
        {row.terminalsPerMonth > 0
          ? translate('app.quotes.offer.terminals', {
              smart_count: row.terminalsPerMonth,
              count: formatNumber(row.terminalsPerMonth),
            })
          : translate('app.quotes.offer.noTerminals')}
      </Box>
      <Box sx={offerMutedSx}>{row.scheduleName}</Box>
    </Box>
  );
};

export default OfferFrequency;
