import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useInput, useSourceContext } from 'react-admin';
import { useWatch } from 'react-hook-form';
import { quoteFields, quoteText } from '../../i18n/quotes';
import { number } from '../../quotes/format';

/**
 * A zone's floor to clean, on a slider from 0 to the whole floor. Untouched it stays empty, which the
 * calculator reads as the floor without objects, so the slider starts there; Predeterminado empties it again.
 */
const CleanedAreaInput = (): ReactElement => {
  const { getSource } = useSourceContext();
  const floorArea: number | null = (useWatch({ name: getSource('floorArea') }) as number | null | undefined) ?? null;
  const freeArea: number | null = (useWatch({ name: getSource('freeArea') }) as number | null | undefined) ?? null;
  const { field, fieldState } = useInput<number | null>({ source: 'cleanedArea', defaultValue: null });
  const max: number = Math.max(0, floorArea ?? 0);
  const fallback: number = Math.min(freeArea ?? max, max);
  // react-admin hands an empty value over as '', not null.
  const custom: boolean = typeof field.value === 'number' && Number.isFinite(field.value);
  const value: number = Math.min(custom ? (field.value as number) : fallback, max);
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">{quoteFields.cleanedArea}</Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {number(value)} / {number(max)} m²
        </Typography>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Slider
          value={value}
          min={0}
          max={max}
          step={0.01}
          disabled={max === 0}
          marks={freeArea !== null && freeArea < max ? [{ value: fallback, label: quoteFields.freeArea.replace(' (m²)', '') }] : undefined}
          valueLabelDisplay="auto"
          valueLabelFormat={(v: number): string => `${number(v)} m²`}
          onChange={(_event: Event, next: number | number[]): void => field.onChange(Array.isArray(next) ? next[0] : next)}
          onBlur={field.onBlur}
          slotProps={{ input: { 'aria-label': quoteFields.cleanedArea } }}
        />
        <Button size="small" disabled={!custom} onClick={(): void => field.onChange(null)}>{quoteText.cleanedAreaDefault}</Button>
      </Stack>
      <FormHelperText error={!!fieldState.error}>{fieldState.error?.message ?? quoteText.cleanedAreaAdvice}</FormHelperText>
    </Box>
  );
};

export default CleanedAreaInput;
