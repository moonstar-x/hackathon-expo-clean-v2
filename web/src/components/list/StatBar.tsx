import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { statBarItemSx, statBarLabelSx, statBarSx, statBarValueSx } from '../../styles/list';
import type { StatBarProps, StatItem } from '../../types/list';

/**
 * A compact, bordered strip of key numbers (label over value). On a narrow screen the items wrap
 * onto more rows; their hairlines are drawn up and to the left of each one, so wherever an item
 * lands it is divided from its neighbours and the strip's own border is never doubled.
 */
const StatBar = ({ items }: StatBarProps): ReactElement => (
  <Box component="span" sx={statBarSx}>
    {items.map(
      ({ label, value }: StatItem): ReactElement => (
        <Box component="span" key={label} sx={statBarItemSx}>
          <Box component="span" sx={statBarLabelSx}>
            {label}
          </Box>
          <Box component="span" sx={statBarValueSx}>
            {value}
          </Box>
        </Box>
      ),
    )}
  </Box>
);

export default StatBar;
