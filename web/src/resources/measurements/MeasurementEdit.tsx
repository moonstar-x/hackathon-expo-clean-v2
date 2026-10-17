import type { ReactElement } from 'react';
import { Edit, ShowButton } from 'react-admin';
import EditHeader from '../../components/EditHeader';
import MeasurementForm from '../../components/measurements/Form/MeasurementForm';
import { formPageSx } from '../../styles/pages';

const MeasurementEdit = (): ReactElement => (
  <Edit
    mutationMode="pessimistic"
    redirect="show"
    actions={<EditHeader actions={<ShowButton />} />}
    sx={formPageSx}
  >
    <MeasurementForm />
  </Edit>
);

export default MeasurementEdit;
