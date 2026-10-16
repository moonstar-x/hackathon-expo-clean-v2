import type { ReactElement } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import {
  BooleanField,
  DateField,
  FunctionField,
  Labeled,
  ReferenceField,
  TextField,
  UrlField,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import { NONE } from '../../../constants/components';
import { unitLabel } from '../../../i18n/units';
import type { Product } from '../../../types/api';
import Section from '../../Section';

/** What the product is, where it is kept and how to handle it. Labels come from resources.products.fields. */
const DetailsCard = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Card>
      <CardContent>
        <Section title={translate('app.products.sections.details')}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <TextField source="sku" />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <ReferenceField source="categoryId" reference="categories" />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <ReferenceField source="supplierId" reference="suppliers" emptyText={NONE} />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <FunctionField<Product> source="unit" render={(record: Product): string => unitLabel(record.unit)} />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <TextField source="location" emptyText={NONE} />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <BooleanField source="active" />
            </Labeled>
          </Grid>
          <Grid size={12}>
            <Labeled>
              <TextField source="description" emptyText={NONE} />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <BooleanField source="hazardous" />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 8 }}>
            <Labeled>
              <UrlField source="sdsUrl" target="_blank" rel="noopener noreferrer" emptyText={NONE} />
            </Labeled>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Labeled>
              <DateField source="createdAt" showTime />
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
