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
import { UNIT_LABELS } from '../../i18n/units';
import { UNITS } from '../../types';

const unitChoices = UNITS.map((unit) => ({ id: unit, name: UNIT_LABELS[unit] }));

const validateSku = [required(), maxLength(50), regex(SKU_PATTERN, 'Solo letras, números, ".", "_" y "-"')];
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
        helperText="Se guarda en mayúsculas"
        parse={(value: string) => value.toUpperCase()}
      />
      <TextInput source="name" validate={validateName} fullWidth />
      <TextInput source="description" multiline minRows={2} validate={maxLength(1000)} parse={emptyToNull} fullWidth />
      <ReferenceInput source="categoryId" reference="categories" sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput label="Categoría" optionText="name" validate={required()} />
      </ReferenceInput>
      <ReferenceInput source="supplierId" reference="suppliers" sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput label="Proveedor" optionText="name" parse={emptyToNull} helperText="Opcional" />
      </ReferenceInput>

      <Section title="Inventario" />
      <SelectInput
        source="unit"
        choices={unitChoices}
        validate={required()}
        helperText={mode === 'edit' ? 'No se puede cambiar si el producto tiene movimientos de inventario' : undefined}
      />
      {mode === 'create' ? (
        <NumberInput
          source="initialQuantity"
          label="Cantidad inicial"
          defaultValue={0}
          min={0}
          validate={validateQuantity}
          helperText="Se registra como una entrada con el motivo «Existencias iniciales»"
        />
      ) : (
        <Labeled label="Existencias actuales">
          <>
            <QuantityField source="quantity" />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Registra un movimiento para modificar las existencias
            </Typography>
          </>
        </Labeled>
      )}
      <NumberInput source="reorderLevel" label="Nivel de reposición" defaultValue={0} min={0} validate={validateRequiredQuantity} />
      <NumberInput source="unitCost" label="Costo unitario" defaultValue={0} min={0} step={0.01} validate={validateCost} />
      <TextInput
        source="location"
        validate={maxLength(100)}
        parse={emptyToNull}
        helperText="Ej.: Almacén A / Estante 3"
      />
      <BooleanInput source="active" defaultValue={true} helperText="Desactiva esta opción para archivar un producto descontinuado" />

      <Section title="Seguridad" />
      <BooleanInput source="hazardous" defaultValue={false} helperText="Producto químico corrosivo o tóxico" />
      <TextInput
        source="sdsUrl"
        label="URL de la ficha de seguridad"
        validate={[maxLength(500), httpUrl]}
        parse={emptyToNull}
        helperText="Enlace a la ficha de datos de seguridad"
        fullWidth
      />
    </SimpleForm>
  );
}
