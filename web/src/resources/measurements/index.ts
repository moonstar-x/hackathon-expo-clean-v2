import ViewInArIcon from '@mui/icons-material/ViewInAr';
import type { ResourceProps } from 'react-admin';
import { MeasurementEdit, MeasurementList, MeasurementShow } from '../../measurements/views';

const measurements: Omit<ResourceProps, 'name'> = {
  list: MeasurementList,
  edit: MeasurementEdit,
  show: MeasurementShow,
  icon: ViewInArIcon,
  recordRepresentation: 'name',
};

export default measurements;
