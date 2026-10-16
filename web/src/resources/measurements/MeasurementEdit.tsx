import type { ReactElement } from 'react';
import { Edit, ShowButton } from 'react-admin';
import EditHeader from '../../components/EditHeader';
import MeasurementForm from '../../components/measurements/Form/MeasurementForm';
import { FORM_MAX_WIDTH } from '../../constants/components';
import { formPageSx } from '../../styles/pages';

const MeasurementEdit = (): ReactElement => (
  <Edit
    mutationMode="pessimistic"
    redirect="show"
    actions={<EditHeader actions={<ShowButton />} />}
    sx={formPageSx(FORM_MAX_WIDTH)}
  >
    <MeasurementForm />
  </Edit>
);

export default MeasurementEdit;
