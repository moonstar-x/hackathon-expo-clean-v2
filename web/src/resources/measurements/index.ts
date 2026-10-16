import ViewInArIcon from '@mui/icons-material/ViewInAr';
import type { ResourceProps } from 'react-admin';
import MeasurementEdit from './MeasurementEdit';
import MeasurementList from './MeasurementList';
import MeasurementShow from './MeasurementShow';

// No create: measurements are uploaded by the RoomScanner app (SPEC-004 §4.3).
const measurements: Omit<ResourceProps, 'name'> = {
  list: MeasurementList,
  edit: MeasurementEdit,
  show: MeasurementShow,
  icon: ViewInArIcon,
  recordRepresentation: 'name',
};

export default measurements;
