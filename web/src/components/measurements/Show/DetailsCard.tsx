import type { ReactElement } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import { DateField, Labeled, TextField, useTranslate, type TranslateFunction } from 'react-admin';
import { NONE } from '../../../constants/components';
import Section from '../../Section';

/** Where the measurement came from: when, by whom and with what. Labels come from resources.measurements.fields. */
const DetailsCard = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Card>
      <CardContent>
        <Section title={translate('app.measurements.details')}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <DateField source="scannedAt" showTime />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <TextField source="createdBy" />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <DateField source="createdAt" showTime />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <TextField source="deviceModel" emptyText={NONE} />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <TextField source="appVersion" emptyText={NONE} />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <DateField source="updatedAt" showTime />
            </Labeled>
          </Grid>
        </Section>
      </CardContent>
    </Card>
  );
};

export default DetailsCard;
