import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import {
  AutocompleteInput,
  maxLength,
  RadioButtonGroupInput,
  ReferenceInput,
  required,
  SimpleForm,
  TextInput,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import { PRODUCT_SORT } from '../../../constants/products';
import { MOVEMENT_TYPE_CHOICES } from '../../../constants/stockMovements';
import { emptyToNull } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';
import SectionDivider from '../../SectionDivider';
import MovementPreview from './MovementPreview';
import QuantityInput from './QuantityInput';

/** Only active products take new movements. */
const ACTIVE_PRODUCTS: Record<string, unknown> = { active: true };

const DEFAULT_VALUES: Record<string, unknown> = { type: 'IN' };

/**
 * A new stock movement: which product, what happened to it, and how much, with the product's stock now
 * and after it beside the inputs (below them on smaller screens). Opened from a product's page, it
 * arrives with the product and type already filled in.
 */
const MovementForm = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SimpleForm defaultValues={DEFAULT_VALUES} toolbar={<FormToolbar />}>
      <Grid container spacing={{ xs: 3, lg: 5 }} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, lg: 'grow' }}>
          <Section title={translate('app.stockMovements.sections.product')} hint={translate('app.stockMovements.hints.product')}>
            <Grid size={12}>
              <ReferenceInput source="productId" reference="products" filter={ACTIVE_PRODUCTS} sort={PRODUCT_SORT}>
                <AutocompleteInput validate={required()} fullWidth />
              </ReferenceInput>
            </Grid>
          </Section>
          <SectionDivider />
          <Section title={translate('app.stockMovements.sections.movement')} hint={translate('app.stockMovements.hints.movement')}>
            <Grid size={12}>
              <RadioButtonGroupInput source="type" choices={MOVEMENT_TYPE_CHOICES} validate={required()} helperText={false} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <QuantityInput />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextInput
                source="reason"
                validate={maxLength(255)}
                parse={emptyToNull}
                helperText="app.stockMovements.help.reason"
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextInput
                source="reference"
                validate={maxLength(100)}
                parse={emptyToNull}
                helperText="app.stockMovements.help.reference"
                fullWidth
              />
            </Grid>
          </Section>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <MovementPreview />
        </Grid>
      </Grid>
    </SimpleForm>
  );
};

export default MovementForm;
