import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { legendItemSx, legendSwatchSx, legendSx } from '../../../../styles/measurements';
import type { LegendEntry, RoomLegendProps } from '../../../../types/measurements';

/** Which floor color is which room: the model tints the floors but, unlike the plan, doesn't name them. */
const RoomLegend = ({ entries }: RoomLegendProps): ReactElement | null => {
  const translate: TranslateFunction = useTranslate();
  if (entries.length === 0) return null;
  return (
    <Box component="ul" aria-label={translate('app.measurements.model.legend')} sx={legendSx}>
      {entries.map(
        (entry: LegendEntry): ReactElement => (
          <Box component="li" key={entry.id} sx={legendItemSx}>
            <Box component="span" aria-hidden sx={legendSwatchSx(entry.color)} />
            {entry.name}
          </Box>
        ),
      )}
    </Box>
  );
};

export default RoomLegend;
