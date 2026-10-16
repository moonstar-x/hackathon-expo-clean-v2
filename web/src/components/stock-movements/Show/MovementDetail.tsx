import type { ReactElement } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import {
  DateField,
  Labeled,
  ReferenceField,
  TextField,
  useRecordContext,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import { MOVEMENT_TYPE_RIBBON, NONE } from '../../../constants/components';
import useProductUnit from '../../../hooks/useProductUnit';
import { detailStackSx, ribbonContentSx } from '../../../styles/pages';
import { ribbonCardSx, ribbonGutterSx } from '../../../styles/ribbon';
import { mergeSx } from '../../../styles/sx';
import type { StockMovement, Unit } from '../../../types/api';
import { formatDelta, formatQuantity } from '../../../utils/format';
import MovementReasonField from '../../fields/MovementReasonField';
import StatBar from '../../list/StatBar';
import Ribbon from '../../Ribbon';
import Section from '../../Section';

/** The movement under its heading: its type on the ribbon, the numbers, then who, why and for which product. */
const MovementDetail = (): ReactElement | null => {
  const record: StockMovement | undefined = useRecordContext<StockMovement>();
  const translate: TranslateFunction = useTranslate();
  const unit: Unit | undefined = useProductUnit(record?.productId);
  if (!record) return null;
  return (
    <Stack spacing={2} sx={mergeSx(ribbonGutterSx, detailStackSx)}>
      <Card sx={ribbonCardSx}>
        <Ribbon color={MOVEMENT_TYPE_RIBBON[record.type]}>
          {translate(`app.stockMovements.typeChoices.${record.type}`)}
        </Ribbon>
        <CardContent sx={ribbonContentSx}>
          <StatBar
            items={[
              { label: translate(`app.stockMovements.quantity.${record.type}`), value: formatQuantity(record.quantity, unit) },
              { label: translate('resources.stock-movements.fields.delta'), value: formatDelta(record.delta, unit) },
              {
                label: translate('resources.stock-movements.fields.balanceAfter'),
                value: formatQuantity(record.balanceAfter, unit),
              },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Section title={translate('app.stockMovements.details')}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Labeled>
                <ReferenceField source="productId" reference="products" link="show" />
              </Labeled>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Labeled>
                <DateField source="createdAt" showTime />
              </Labeled>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Labeled>
                <TextField source="createdBy" />
              </Labeled>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Labeled>
                <MovementReasonField source="reason" />
              </Labeled>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Labeled>
                <TextField source="reference" emptyText={NONE} />
              </Labeled>
            </Grid>
          </Section>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default MovementDetail;
