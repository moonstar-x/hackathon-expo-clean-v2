import type { ReactElement } from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import {
  AutocompleteInput,
  BooleanInput,
  NumberInput,
  ReferenceInput,
  SelectInput,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import { useAppConfig } from '../../../AppConfigContext';
import { PARAMETER_UNITS } from '../../../constants/quoteSettings';
import { quoteEnums } from '../../../i18n/quotes';
import { parameterUnitSx } from '../../../styles/quotes';
import { fractionToPercent, percentToFraction } from '../../../quotes/format';
import type { Choice } from '../../../types/components';
import type { ParameterInputProps, ParameterUnit } from '../../../types/quotes';
import { currencySymbol } from '../../../utils/format';
import { sourceNote } from '../../../utils/quotes';

const TRAFFIC: Choice[] = ['low', 'medium', 'high'].map((id: string): Choice => ({ id, name: quoteEnums[id] }));

/** The catalog a default refers to. */
const DEFAULT_REFERENCES: Record<string, string> = {
  defaultScheduleId: 'quote-schedules',
  defaultZoneTypeId: 'quote-zone-types',
};

/**
 * One quoting parameter as its input: a default schedule or zone type, the default traffic, a switch,
 * or a number (a share edited as a percentage) with its unit beside it and its source under it.
 */
const ParameterInput = ({ field, note }: ParameterInputProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { currency }: { currency: string } = useAppConfig();
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
  const unit: ParameterUnit | undefined = field.percentage ? 'percent' : PARAMETER_UNITS[field.name];
  return (
    <NumberInput
      source={field.name}
      label={field.label}
      min={0}
      step="any"
      format={field.percentage ? fractionToPercent : undefined}
      parse={field.percentage ? percentToFraction : undefined}
      helperText={sourceNote(note, field.label)}
      slotProps={
        unit
          ? {
              input: {
                endAdornment: (
                  <InputAdornment position="end" sx={parameterUnitSx}>
                    {translate(`app.quoteSettings.units.${unit}`, { currency: currencySymbol(currency) })}
                  </InputAdornment>
                ),
              },
            }
          : undefined
      }
      fullWidth
    />
  );
};

export default ParameterInput;
