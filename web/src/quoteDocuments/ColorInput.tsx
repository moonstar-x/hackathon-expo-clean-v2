import type { ChangeEvent, ReactElement, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ValidationError, useInput, type UseInputValue } from 'react-admin';
import { BAND_MIN_CONTRAST, DEFAULT_BRAND_COLOR, DOCUMENT_PAPER_COLOR } from '../constants/quoteDocuments';
import { brandingText, documentFields } from '../i18n/quoteDocuments';
import {
  brandingWarningSx,
  colorRowSx,
  controlHintSx,
  controlTitleSx,
  hexFieldSx,
  resetButtonSx,
  suggestionSx,
  suggestionsLabelSx,
  suggestionsSx,
  swatchInputSx,
} from '../styles/branding';
import type { ColorInputProps } from '../types/quoteDocuments';
import { contrast, isHexColor, normalizeHex } from '../utils/documentColors';

const validateColor = (value: unknown): string | undefined => (isHexColor(value) ? undefined : brandingText.colorInvalid);

/**
 * The company's main color (`brandColor`): the browser's own picker as a swatch, the hex code for an
 * exact brand color, a way back to the default, and the logo's own colors one click away. It is a form
 * field like the others, saved with Guardar. A color too light to show on white paper gets a warning.
 */
const ColorInput = ({ suggestions }: ColorInputProps): ReactElement => {
  const { id, field, fieldState }: UseInputValue = useInput({ source: 'brandColor', defaultValue: DEFAULT_BRAND_COLOR, validate: validateColor });
  const value: string = typeof field.value === 'string' ? field.value : '';
  const valid: boolean = isHexColor(value);
  const error: string | undefined = fieldState.error?.message;
  const faint: boolean = valid && contrast(value, DOCUMENT_PAPER_COLOR) < BAND_MIN_CONTRAST;
  const choose = (color: string): void => field.onChange(color);
  // react-admin wraps its validators' messages; ValidationError reads and translates them.
  const helperText: ReactNode = error ? <ValidationError error={error} /> : faint ? brandingText.colorTooLight : ' ';

  return (
    <Box>
      <Typography id={`${id}-title`} component="h3" sx={controlTitleSx}>
        {documentFields.brandColor}
      </Typography>
      <Typography sx={controlHintSx}>{brandingText.colorHint}</Typography>
      <Box sx={colorRowSx}>
        <Box
          component="input"
          type="color"
          aria-label={brandingText.pickColor}
          value={(valid ? value : DEFAULT_BRAND_COLOR).toLowerCase()}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => choose(event.target.value.toUpperCase())}
          sx={swatchInputSx}
        />
        <TextField
          id={id}
          name={field.name}
          label={brandingText.colorCode}
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => choose(normalizeHex(event.target.value))}
          onBlur={field.onBlur}
          inputRef={field.ref}
          error={Boolean(error)}
          helperText={helperText}
          variant="filled"
          size="small"
          sx={hexFieldSx}
          slotProps={{
            htmlInput: { maxLength: 7, spellCheck: false, autoComplete: 'off' },
            formHelperText: { sx: !error && faint ? brandingWarningSx : undefined },
          }}
        />
        <Button size="small" onClick={(): void => choose(DEFAULT_BRAND_COLOR)} disabled={value === DEFAULT_BRAND_COLOR} sx={resetButtonSx}>
          {brandingText.resetColor}
        </Button>
      </Box>
      {suggestions.length ? (
        <>
          <Typography id={`${id}-logo-colors`} sx={suggestionsLabelSx}>
            {brandingText.logoColors}
          </Typography>
          <Box role="group" aria-labelledby={`${id}-logo-colors`} sx={suggestionsSx}>
            {suggestions.map(
              (color: string): ReactElement => (
                <ButtonBase
                  key={color}
                  aria-label={brandingText.useColor.replace('{color}', color)}
                  aria-pressed={value === color}
                  title={color}
                  onClick={(): void => choose(color)}
                  sx={suggestionSx(color, value === color)}
                />
              ),
            )}
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default ColorInput;
