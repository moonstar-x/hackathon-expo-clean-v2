import Typography from '@mui/material/Typography';
import {
  AutocompleteInput,
  BooleanInput,
  Labeled,
  maxLength,
  minValue,
  NumberInput,
  ReferenceInput,
  regex,
  required,
  SelectInput,
  SimpleForm,
  TextInput,
} from 'react-admin';
import type { ReactElement } from 'react';
import { QuantityField } from '../../components/fields';
import { emptyToNull, httpUrl, maxDecimals, SKU_PATTERN } from '../../components/validators';
import { UNITS } from '../../types';

const unitChoices = UNITS.map((unit) => ({ id: unit, name: unit }));

const validateSku = [required(), maxLength(50), regex(SKU_PATTERN, 'Only letters, digits, ".", "_" and "-"')];
const validateName = [required(), maxLength(150)];
const validateQuantity = [minValue(0), maxDecimals(3)];
const validateRequiredQuantity = [required(), ...validateQuantity];
const validateCost = [required(), minValue(0), maxDecimals(4)];

function Section({ title }: { title: string }) {
  return (
    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
      {title}
    </Typography>
  );
}

/** Shared by create and edit. `mode="create"` adds the Initial quantity input. */
export function ProductForm({ mode, toolbar }: { mode: 'create' | 'edit'; toolbar?: ReactElement }) {
  return (
    <SimpleForm toolbar={toolbar} sx={{ maxWidth: 720 }}>
      <Section title="General" />
      <TextInput
        source="sku"
        label="SKU"
        validate={validateSku}
        helperText="Stored in upper case"
        parse={(value: string) => value.toUpperCase()}
      />
      <TextInput source="name" validate={validateName} fullWidth />
      <TextInput source="description" multiline minRows={2} validate={maxLength(1000)} parse={emptyToNull} fullWidth />
      <ReferenceInput source="categoryId" reference="categories" sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput label="Category" optionText="name" validate={required()} />
      </ReferenceInput>
      <ReferenceInput source="supplierId" reference="suppliers" sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput label="Supplier" optionText="name" parse={emptyToNull} helperText="Optional" />
      </ReferenceInput>

      <Section title="Stock" />
      <SelectInput
        source="unit"
        choices={unitChoices}
        validate={required()}
        helperText={mode === 'edit' ? 'Cannot be changed once the product has stock movements' : undefined}
      />
      {mode === 'create' ? (
        <NumberInput
          source="initialQuantity"
          label="Initial quantity"
          defaultValue={0}
          min={0}
          validate={validateQuantity}
          helperText="Recorded as an IN movement with reason “Initial stock”"
        />
      ) : (
        <Labeled label="Quantity on hand">
          <>
            <QuantityField source="quantity" />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Change stock by recording a movement
            </Typography>
          </>
        </Labeled>
      )}
      <NumberInput source="reorderLevel" label="Reorder level" defaultValue={0} min={0} validate={validateRequiredQuantity} />
      <NumberInput source="unitCost" label="Unit cost" defaultValue={0} min={0} step={0.01} validate={validateCost} />
      <TextInput
        source="location"
        validate={maxLength(100)}
        parse={emptyToNull}
        helperText="e.g. Warehouse A / Shelf 3"
      />
      <BooleanInput source="active" defaultValue={true} helperText="Turn off to archive a discontinued product" />

      <Section title="Safety" />
      <BooleanInput source="hazardous" defaultValue={false} helperText="Corrosive or toxic chemical" />
      <TextInput
        source="sdsUrl"
        label="SDS URL"
        validate={[maxLength(500), httpUrl]}
        parse={emptyToNull}
        helperText="Link to the Safety Data Sheet"
        fullWidth
      />
    </SimpleForm>
  );
}
