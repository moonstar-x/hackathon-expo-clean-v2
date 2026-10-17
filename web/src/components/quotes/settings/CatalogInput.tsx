import type { ReactElement } from 'react';
import { AutocompleteInput, BooleanInput, NumberInput, ReferenceInput, SelectInput, TextInput } from 'react-admin';
import { quoteEnums, quoteFields } from '../../../i18n/quotes';
import { fractionToPercent, percentToFraction } from '../../../quotes/format';
import type { Choice } from '../../../types/components';
import type { CatalogInputProps } from '../../../types/quotes';

/** Choices labelled in Spanish (quoteEnums), passed untranslated. */
const enumChoices = (values: string[]): Choice[] =>
  values.map((id: string): Choice => ({ id, name: quoteEnums[id] ?? id }));

/** One field of a quoting catalog as its input: a switch, a number (a share edited as a percentage), a select or a reference. */
const CatalogInput = ({ field }: CatalogInputProps): ReactElement => {
  const { name, type, reference, choices } = field;
  const label: string = field.label ?? quoteFields[name];
  if (reference) {
    return (
      <ReferenceInput source={name} reference={reference} perPage={1000}>
        <AutocompleteInput label={label} optionText="name" fullWidth />
      </ReferenceInput>
    );
  }
  if (type === 'boolean') return <BooleanInput source={name} label={label} />;
  if (type === 'select') {
    return <SelectInput source={name} label={label} choices={enumChoices(choices ?? [])} translateChoice={false} fullWidth />;
  }
  if (type === 'number' || type === 'fraction') {
    const fraction: boolean = type === 'fraction';
    return (
      <NumberInput
        source={name}
        label={fraction ? `${label} (%)` : label}
        min={0}
        step="any"
        format={fraction ? fractionToPercent : undefined}
        parse={fraction ? percentToFraction : undefined}
        fullWidth
      />
    );
  }
  return <TextInput source={name} label={label} multiline={name === 'note'} minRows={name === 'note' ? 2 : undefined} fullWidth />;
};

export default CatalogInput;
