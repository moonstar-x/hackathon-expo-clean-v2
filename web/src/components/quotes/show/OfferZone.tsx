import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import OutlinedBadge from '../../list/OutlinedBadge';
import { RISK_TONE } from '../../../constants/quotes';
import { quoteEnums } from '../../../i18n/quotes';
import { offerMutedSx, offerZoneLineSx, offerZoneNameSx } from '../../../styles/quotes';
import type { OfferZoneProps } from '../../../types/quotes';

/** A zone of the technical offer: its name and sanitary risk, then its zone type. */
const OfferZone = ({ row, heading = false }: OfferZoneProps): ReactElement => (
  <Box>
    <Box sx={offerZoneLineSx}>
      <Typography component={heading ? 'h3' : 'span'} variant={heading ? 'subtitle1' : 'body2'} sx={offerZoneNameSx}>
        {row.name}
      </Typography>
      <OutlinedBadge label={quoteEnums[row.risk] ?? row.risk} tone={RISK_TONE[row.risk]} dense />
    </Box>
    <Box sx={offerMutedSx}>{row.zoneTypeName}</Box>
  </Box>
);

export default OfferZone;
