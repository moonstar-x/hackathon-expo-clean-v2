import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import {
  DateField,
  Labeled,
  ReferenceField,
  TextField,
  useRecordContext,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import { NONE } from '../../../constants/components';
import { DELTA_COLOR } from '../../../constants/stockMovements';
import useProductUnit from '../../../hooks/useProductUnit';
import { detailPageSx, wideFieldSx } from '../../../styles/pages';
import type { StockMovement, Unit } from '../../../types/api';
import { deltaTone, formatDelta, formatQuantity } from '../../../utils/format';
import MovementReasonField from '../../fields/MovementReasonField';
import KeyFigures from '../../KeyFigures';
import DetailGrid from '../../show/DetailGrid';
import ShowSection from '../../show/ShowSection';

/** The movement under its heading: the numbers it moved, then for which product, by whom and why. */
const MovementDetail = (): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext<StockMovement>();
  const translate: TranslateFunction = useTranslate();
  const unit: Unit | undefined = useProductUnit(record?.productId);
  if (!record) return null;
  return (
    <Grid container spacing={2} sx={detailPageSx}>
      <Grid size={12}>
        <ShowSection title={translate('app.stockMovements.summary')}>
          <KeyFigures
            items={[
              { label: translate(`app.stockMovements.quantity.${record.type}`), value: formatQuantity(record.quantity, unit) },
              {
                label: translate('resources.stock-movements.fields.delta'),
                value: (
                  <Box component="span" sx={{ color: DELTA_COLOR[deltaTone(record.delta)] }}>
                    {formatDelta(record.delta, unit)}
                  </Box>
                ),
              },
              {
                label: translate('resources.stock-movements.fields.balanceAfter'),
                value: formatQuantity(record.balanceAfter, unit),
              },
            ]}
          />
        </ShowSection>
      </Grid>
      <Grid size={12}>
        <ShowSection title={translate('app.stockMovements.details')}>
          <DetailGrid>
            <Labeled sx={wideFieldSx}>
              <ReferenceField source="productId" reference="products" link="show" />
            </Labeled>
            <Labeled>
              <DateField source="createdAt" showTime />
            </Labeled>
            <Labeled>
              <TextField source="createdBy" />
            </Labeled>
            <Labeled>
              <MovementReasonField source="reason" />
            </Labeled>
            <Labeled>
              <TextField source="reference" emptyText={NONE} />
            </Labeled>
          </DetailGrid>
        </ShowSection>
      </Grid>
    </Grid>
  );
};

export default MovementDetail;
