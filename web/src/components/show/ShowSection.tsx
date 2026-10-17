import { useId, type ReactElement } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { showSectionContentSx, showSectionSx } from '../../styles/pages';
import type { ShowSectionProps } from '../../types/components';

/**
 * A titled card of a detail page. Laid out on a Grid, side by side from `lg`; it takes its row's
 * height, so neighbouring cards end level.
 */
const ShowSection = ({ title, action, children }: ShowSectionProps): ReactElement => {
  const titleId: string = useId();
  return (
    <Card component="section" aria-labelledby={titleId} sx={showSectionSx}>
      <CardHeader
        title={title}
        action={action}
        slotProps={{ title: { id: titleId, component: 'h2', variant: 'h6' } }}
      />
      <CardContent sx={showSectionContentSx}>{children}</CardContent>
    </Card>
  );
};

export default ShowSection;
