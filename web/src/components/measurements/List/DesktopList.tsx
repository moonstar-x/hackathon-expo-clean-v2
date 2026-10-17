import type { ReactElement } from 'react';
import { BulkDeleteButton, DataTable, DateField, List } from 'react-admin';
import { MEASUREMENT_EMPTY_STEPS, MEASUREMENT_PER_PAGE, MEASUREMENT_SORT } from '../../../constants/measurements';
import type { Measurement } from '../../../types/api';
import AppPagination from '../../AppPagination';
import FloorAreaField from '../../fields/FloorAreaField';
import EmptyState from '../../list/EmptyState';
import MeasurementThumbnail from '../MeasurementThumbnail';
import QuoteStatusCell from '../QuoteStatusCell';
import DesktopActions from './DesktopActions';
import { measurementFilters } from './measurementFilters';

/**
 * The measurements as a table, newest upload first (SPEC-004 §6.4). A row opens the measurement;
 * deleting asks first and waits for the API.
 */
const DesktopList = (): ReactElement => (
  <List
    filters={measurementFilters}
    sort={MEASUREMENT_SORT}
    perPage={MEASUREMENT_PER_PAGE}
    actions={<DesktopActions />}
    pagination={<AppPagination />}
    empty={<EmptyState variant="page" steps={MEASUREMENT_EMPTY_STEPS} />}
  >
    <DataTable<Measurement>
      rowClick="show"
      bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}
      empty={<EmptyState />}
    >
      <DataTable.Col label="resources.measurements.fields.thumbnail" disableSort>
        <MeasurementThumbnail />
      </DataTable.Col>
      <DataTable.Col source="name" />
      <DataTable.Col source="roomCount" align="right" />
      <DataTable.Col source="totalFloorArea" align="right">
        <FloorAreaField />
      </DataTable.Col>
      <DataTable.Col source="scannedAt">
        <DateField source="scannedAt" showTime />
      </DataTable.Col>
      <DataTable.Col label="resources.measurements.fields.quote" disableSort>
        <QuoteStatusCell />
      </DataTable.Col>
      <DataTable.Col source="createdBy" />
      <DataTable.Col source="createdAt">
        <DateField source="createdAt" showTime />
      </DataTable.Col>
    </DataTable>
  </List>
);

export default DesktopList;
