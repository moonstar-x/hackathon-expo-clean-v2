import type { ReactElement } from 'react';
import { Pagination, type PaginationProps } from 'react-admin';
import { ROWS_PER_PAGE } from '../constants/components';

// Every desktop list uses this instead of the default, so the
// rows-per-page choices match across the app.
const AppPagination = (props: PaginationProps): ReactElement => (
  <Pagination rowsPerPageOptions={ROWS_PER_PAGE} {...props} />
);

export default AppPagination;
