import { Fragment, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import { digitSlotSx } from '../../styles/appBar';
import type { FixedDigitsProps } from '../../types/appBar';

/** Text whose digits each take the width of a zero, so a changing number never moves what follows. */
const FixedDigits = ({ text }: FixedDigitsProps): ReactElement => (
  <>
    {[...text].map((char: string, index: number): ReactElement =>
      /\d/.test(char) ? (
        <Box key={index} component="span" sx={digitSlotSx}>
          {char}
        </Box>
      ) : (
        <Fragment key={index}>{char}</Fragment>
      ),
    )}
  </>
);

export default FixedDigits;
