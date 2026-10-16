import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import useNow from '../../hooks/useNow';
import { clockDaySx, clockSecondsSx, clockSx, clockTimeSx } from '../../styles/appBar';
import type { ClockProps } from '../../types/appBar';
import { formatDay, formatTime } from '../../utils/dates';
import FixedDigits from './FixedDigits';

/** The local time, ticking: hours and minutes in full, the seconds quieter, the day below. */
const Clock = ({ align = 'right' }: ClockProps): ReactElement => {
  const now: Date = useNow();
  const time: string = formatTime(now);
  return (
    <Box component="time" dateTime={now.toISOString()} sx={clockSx(align)}>
      <Box component="span" sx={clockTimeSx}>
        <FixedDigits text={time.slice(0, 5)} />
        <Box component="span" sx={clockSecondsSx}>
          <FixedDigits text={time.slice(5)} />
        </Box>
      </Box>
      <Box component="span" sx={clockDaySx}>
        {formatDay(now)}
      </Box>
    </Box>
  );
};

export default Clock;
