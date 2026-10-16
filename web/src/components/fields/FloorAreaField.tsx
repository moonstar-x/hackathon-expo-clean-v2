import type { ReactElement } from 'react';
import Typography from '@mui/material/Typography';
import { useRecordContext } from 'react-admin';
import type { Measurement } from '../../types/api';
import type { RecordFieldProps } from '../../types/fields';
import { formatArea } from '../../utils/format';

/** A measurement's total floor area: `34,0 m²`, or `≈ 35,2 m²` when a room's floor is approximate. */
const FloorAreaField = (props: RecordFieldProps): ReactElement | null => {
  const record: Measurement | undefined = useRecordContext(props) as Measurement | undefined;
  if (!record) return null;
  return (
    <Typography component="span" variant="body2" sx={{ whiteSpace: 'nowrap' }}>
      {formatArea(record.totalFloorArea, record.isAreaApproximate)}
    </Typography>
  );
};

export default FloorAreaField;
