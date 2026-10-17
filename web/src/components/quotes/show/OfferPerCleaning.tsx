import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { useTranslate, type TranslateFunction } from 'react-admin';
import type { TechnicalOfferRowProps } from '../../../types/quotes';
import { formatNumber } from '../../../utils/format';
import { formatDose } from '../../../utils/quotes';

/** What one daily cleaning of a zone takes: litres of solution and the disinfectant in them. */
const OfferPerCleaning = ({ row }: TechnicalOfferRowProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Box>
      <Box>{translate('app.quotes.offer.solution', { amount: formatNumber(row.solutionPerDailyCleaning) })}</Box>
      <Box>
        {translate('app.quotes.offer.disinfectant', {
          amount: formatDose(row.disinfectantPerCleaning, row.dailyDisinfectant.doseUnit),
        })}
      </Box>
    </Box>
  );
};

export default OfferPerCleaning;
