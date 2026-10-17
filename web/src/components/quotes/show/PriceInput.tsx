import type { ChangeEvent, ReactElement } from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { quoteFields } from '../../../i18n/quotes';
import { priceInputSx } from '../../../styles/quotes';
import type { PriceInputProps } from '../../../types/quotes';

/** A price of the Resumen tab, changed in place; the row's label already names it, so only screen readers hear it here. */
const PriceInput = ({ field, value, onChange, error, helperText, placeholder, disabled }: PriceInputProps): ReactElement => (
  <TextField
    variant="standard"
    size="small"
    type="number"
    value={value}
    placeholder={placeholder}
    disabled={disabled}
    error={!!error}
    helperText={error ?? helperText}
    onChange={(event: ChangeEvent<HTMLInputElement>): void => onChange(event.target.value)}
    sx={priceInputSx}
    slotProps={{
      htmlInput: { min: 0, max: field === 'targetMargin' ? 99.99 : undefined, step: 'any', 'aria-label': quoteFields[field] },
      input: field === 'targetMargin' ? { endAdornment: <InputAdornment position="end">%</InputAdornment> } : undefined,
    }}
  />
);

export default PriceInput;
