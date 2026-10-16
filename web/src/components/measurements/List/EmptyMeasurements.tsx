import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { emptyIconSx, emptyListSx } from '../../../styles/measurements';

/** Before the first upload: where measurements come from, since they can't be created here. */
const EmptyMeasurements = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Card>
      <CardContent sx={emptyListSx}>
        <Box sx={emptyIconSx}>
          <ViewInArOutlined color="action" />
        </Box>
        <Typography variant="h6" component="h2">
          {translate('app.measurements.empty.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '52ch' }}>
          {translate('app.measurements.empty.body')}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default EmptyMeasurements;
