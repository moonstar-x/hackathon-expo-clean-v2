import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import {
  statActionSx,
  statCardSx,
  statContentSx,
  statHeadSx,
  statHintSx,
  statIconSx,
  statLabelSx,
  statValueSx,
} from '../../styles/dashboard';
import type { StatCardProps } from '../../types/dashboard';

/**
 * One number of the dashboard: its label and icon tile, the value, and a line saying what it counts.
 * The whole card is the link to the matching list, so hover and focus cover all of it.
 */
const StatCard = ({ title, value, icon, color = 'primary', to, hint }: StatCardProps): ReactElement => (
  <Card sx={statCardSx}>
    <CardActionArea component={Link} to={to} sx={statActionSx}>
      <CardContent sx={statContentSx}>
        <Box sx={statHeadSx}>
          <Typography component="p" sx={statLabelSx}>
            {title}
          </Typography>
          <Box sx={statIconSx(color)} aria-hidden>
            {icon}
          </Box>
        </Box>
        <Typography component="p" sx={statValueSx}>
          {value}
        </Typography>
        <Typography component="p" sx={statHintSx}>
          {hint}
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

export default StatCard;
