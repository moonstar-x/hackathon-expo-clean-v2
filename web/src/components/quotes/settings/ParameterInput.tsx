import type { ReactElement } from 'react';
import { AutocompleteInput, BooleanInput, NumberInput, ReferenceInput, SelectInput } from 'react-admin';
import { quoteEnums } from '../../../i18n/quotes';
import { fractionToPercent, percentToFraction } from '../../../quotes/format';
import type { Choice } from '../../../types/components';
import type { ParameterInputProps } from '../../../types/quotes';

const TRAFFIC: Choice[] = ['low', 'medium', 'high'].map((id: string): Choice => ({ id, name: quoteEnums[id] }));

/** The catalog a default refers to. */
const DEFAULT_REFERENCES: Record<string, string> = {
  defaultScheduleId: 'quote-schedules',
  defaultZoneTypeId: 'quote-zone-types',
};

/**
 * One quoting parameter as its input: a default schedule or zone type, the default traffic, a switch,
 * or a number (a share edited as a percentage), with its source note under it.
 */
const ParameterInput = ({ field, note }: ParameterInputProps): ReactElement => {
  const reference: string | undefined = DEFAULT_REFERENCES[field.name];
  if (reference) {
    return (
      <ReferenceInput source={field.name} reference={reference} perPage={1000}>
        <AutocompleteInput label={field.label} optionText="name" fullWidth />
      </ReferenceInput>
    );
  }
  if (field.name === 'defaultTraffic') {
    return <SelectInput source={field.name} label={field.label} choices={TRAFFIC} translateChoice={false} fullWidth />;
  }
  if (field.boolean) return <BooleanInput source={field.name} label={field.label} />;
  return (
    <NumberInput
      source={field.name}
      label={`${field.label}${field.percentage ? ' (%)' : ''}`}
      min={0}
      step="any"
      format={field.percentage ? fractionToPercent : undefined}
      parse={field.percentage ? percentToFraction : undefined}
      helperText={note}
      fullWidth
    />
  );
};

export default ParameterInput;
