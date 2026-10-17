import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useRecordContext, useTranslate, type TranslateFunction } from 'react-admin';
import { quoteEnums, quoteFields, quoteText } from '../../../i18n/quotes';
import { number } from '../../../quotes/format';
import type { KeyFigure } from '../../../types/components';
import KeyFigures from '../../KeyFigures';
import Section from '../../Section';

const COMPUTED: string[] = ['pricePerContainer', 'pricePerUnit', 'costPerLiterOfSolution', 'effectiveStock'];

/** What the API works out from a saved quoting product: its net prices, the cost of a litre of solution and the stock. */
const ProductComputed = (): ReactElement | null => {
  const record: Record<string, unknown> | undefined = useRecordContext();
  const translate: TranslateFunction = useTranslate();
  if (!record?.id) return null;
  return (
    <Section title={translate('app.quoteSettings.sections.computed')} hint={translate('app.quoteSettings.hints.computed')}>
      <Grid size={12}>
        <KeyFigures
          items={COMPUTED.map(
            (key: string): KeyFigure => ({
              label: quoteFields[key],
              value: number(Number(record[key]), key === 'effectiveStock' ? 0 : 2),
            }),
          )}
        />
      </Grid>
      <Grid size={12}>
        <Typography variant="body2" color="text.secondary">
          {quoteText.dose} {record.unit === quoteEnums.L ? 'ml' : 'g'} {quoteText.perLiterWater}
        </Typography>
      </Grid>
    </Section>
  );
};

export default ProductComputed;
