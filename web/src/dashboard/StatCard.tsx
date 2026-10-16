import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  color?: 'primary' | 'warning' | 'error' | 'success';
  /** When set, the whole card links here. */
  to?: string;
  hint?: string;
}

export function StatCard({ title, value, icon, color = 'primary', to, hint }: StatCardProps) {
  const content = (
    <CardContent>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Stack
          sx={{
            color: `${color}.main`,
            bgcolor: (theme) => `color-mix(in srgb, ${theme.palette[color].main} 12%, transparent)`,
            borderRadius: 2,
            p: 1.25,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Stack>
        <div>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
            {value}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </div>
      </Stack>
    </CardContent>
  );

  return (
    <Card variant="outlined" sx={{ flex: '1 1 200px' }}>
      {to ? (
        <CardActionArea component={Link} to={to}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}
