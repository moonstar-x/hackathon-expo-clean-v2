import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { keyFigureHintSx, keyFigureLabelSx, keyFigureValueSx, keyFiguresSx } from '../styles/pages';
import type { KeyFigure, KeyFiguresProps } from '../types/components';

/**
 * A record's key numbers: each a quiet label over its value, as many to a row as fit, wrapping on
 * narrow screens. A description list, so a screen reader reads every label with its value.
 */
const KeyFigures = ({ items, size = 'medium' }: KeyFiguresProps): ReactElement => (
  <Box component="dl" sx={keyFiguresSx(size)}>
    {items.map(
      ({ label, value, hint }: KeyFigure): ReactElement => (
        <Box key={label} sx={{ minWidth: 0 }}>
          <Box component="dt" sx={keyFigureLabelSx}>
            {label}
          </Box>
          <Box component="dd" sx={keyFigureValueSx(size)}>
            {value}
          </Box>
          {hint ? (
            <Box component="dd" sx={keyFigureHintSx}>
              {hint}
            </Box>
          ) : null}
        </Box>
      ),
    )}
  </Box>
);

export default KeyFigures;
