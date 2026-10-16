import type { ReactElement } from 'react';
import Grid from '@mui/material/Grid';
import {
  AutocompleteInput,
  BooleanInput,
  maxLength,
  minValue,
  NumberInput,
  ReferenceInput,
  regex,
  required,
  SelectInput,
  SimpleForm,
  TextInput,
  useTranslate,
  type TranslateFunction,
  type Validator,
} from 'react-admin';
import { CATALOG_SORT } from '../../../constants/catalog';
import { SKU_PATTERN, UNITS } from '../../../constants/products';
import { UNIT_LABELS } from '../../../i18n/units';
import type { Unit } from '../../../types/api';
import type { Choice } from '../../../types/components';
import type { ProductFormProps } from '../../../types/products';
import { emptyToNull, httpUrl, maxDecimals } from '../../../utils/validators';
import FormToolbar from '../../FormToolbar';
import Section from '../../Section';
import SectionDivider from '../../SectionDivider';
import CurrentStock from './CurrentStock';

const unitChoices: Choice<Unit>[] = UNITS.map((unit: Unit): Choice<Unit> => ({ id: unit, name: UNIT_LABELS[unit] }));

const validateSku: Validator[] = [required(), maxLength(50), regex(SKU_PATTERN, 'app.products.validation.sku')];
const validateName: Validator[] = [required(), maxLength(150)];
const validateQuantity: Validator[] = [minValue(0), maxDecimals(3)];
const validateRequiredQuantity: Validator[] = [required(), ...validateQuantity];
const validateCost: Validator[] = [required(), minValue(0), maxDecimals(4)];
const validateSdsUrl: Validator[] = [maxLength(500), httpUrl];

const toUpperCase = (value: string): string => value.toUpperCase();

/**
 * Shared by create and edit, in the three sections SPEC-002 names: what the product is, how it is
 * stocked, and how to handle it safely. Two columns from `md`, one on phones.
 */
const ProductForm = ({ mode }: ProductFormProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <SimpleForm toolbar={<FormToolbar withDelete={mode === 'edit'} />}>
      <Section title={translate('app.products.sections.general')}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextInput source="sku" validate={validateSku} helperText="app.products.help.sku" parse={toUpperCase} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextInput source="name" validate={validateName} fullWidth />
        </Grid>
        <Grid size={12}>
          <TextInput source="description" multiline minRows={2} validate={maxLength(1000)} parse={emptyToNull} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReferenceInput source="categoryId" reference="categories" sort={CATALOG_SORT}>
            <AutocompleteInput optionText="name" validate={required()} fullWidth />
          </ReferenceInput>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ReferenceInput source="supplierId" reference="suppliers" sort={CATALOG_SORT}>
            <AutocompleteInput optionText="name" parse={emptyToNull} helperText="app.products.help.supplier" fullWidth />
          </ReferenceInput>
        </Grid>
      </Section>
      <SectionDivider />
      <Section title={translate('app.products.sections.stock')}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SelectInput
            source="unit"
            choices={unitChoices}
            translateChoice={false}
            validate={required()}
            helperText={mode === 'edit' ? 'app.products.help.unitLocked' : undefined}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          {mode === 'create' ? (
            <NumberInput
              source="initialQuantity"
              defaultValue={0}
              min={0}
              validate={validateQuantity}
              helperText="app.products.help.initialQuantity"
              fullWidth
            />
          ) : (
            <CurrentStock />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <NumberInput source="reorderLevel" defaultValue={0} min={0} validate={validateRequiredQuantity} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <NumberInput source="unitCost" defaultValue={0} min={0} step={0.01} validate={validateCost} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextInput
            source="location"
            validate={maxLength(100)}
            parse={emptyToNull}
            helperText="app.products.help.location"
            fullWidth
          />
        </Grid>
        <Grid size={12}>
          <BooleanInput source="active" defaultValue={true} helperText="app.products.help.active" />
        </Grid>
      </Section>
      <SectionDivider />
      <Section title={translate('app.products.sections.safety')}>
        <Grid size={{ xs: 12, md: 4 }}>
          <BooleanInput source="hazardous" defaultValue={false} helperText="app.products.help.hazardous" />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextInput
            source="sdsUrl"
            validate={validateSdsUrl}
            parse={emptyToNull}
            helperText="app.products.help.sdsUrl"
            fullWidth
          />
        </Grid>
      </Section>
    </SimpleForm>
  );
};

export default ProductForm;
