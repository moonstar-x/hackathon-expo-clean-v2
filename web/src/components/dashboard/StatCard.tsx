import type { ReactElement } from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import { statCardSx, statIconSx, statValueSx } from '../../styles/dashboard';
import type { StatCardProps } from '../../types/dashboard';

/** One number of the dashboard, with its icon on a tile of its colour; the whole card links when `to` is set. */
const StatCard = ({ title, value, icon, color = 'primary', to, hint }: StatCardProps): ReactElement => {
  const content: ReactElement = (
    <CardContent>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Stack sx={statIconSx(color)}>{icon}</Stack>
        <div>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" component="p" sx={statValueSx}>
            {value}
          </Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          ) : null}
        </div>
      </Stack>
    </CardContent>
  );

  return (
    <Card sx={statCardSx}>
      {to ? (
        <CardActionArea component={Link} to={to}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
};

export default StatCard;
