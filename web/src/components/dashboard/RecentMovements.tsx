import type { ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import {
  Link,
  Loading,
  RecordContextProvider,
  ReferenceField,
  useGetList,
  useTranslate,
  type TranslateFunction,
  type UseGetListHookValue,
} from 'react-admin';
import { DASHBOARD_QUERY_OPTIONS, DASHBOARD_ROWS } from '../../constants/dashboard';
import { MOVEMENT_SORT } from '../../constants/stockMovements';
import { emptyTableSx, numberCellSx, tableCardSx } from '../../styles/dashboard';
import type { StockMovement } from '../../types/api';
import { formatDateTime } from '../../utils/dates';
import { errorMessage } from '../../utils/errors';
import MovementQuantityField from '../fields/MovementQuantityField';
import MovementTypeBadge from '../fields/MovementTypeBadge';

/** The latest stock movements, newest first. */
const RecentMovements = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { data, isPending, error }: UseGetListHookValue<StockMovement> = useGetList<StockMovement>(
    'stock-movements',
    { sort: MOVEMENT_SORT, pagination: { page: 1, perPage: DASHBOARD_ROWS } },
    DASHBOARD_QUERY_OPTIONS,
  );

  return (
    <Card sx={tableCardSx}>
      <CardHeader
        title={translate('app.dashboard.recentMovements')}
        slotProps={{ title: { component: 'h2', variant: 'h6' } }}
        action={
          <Button component={RouterLink} to="/stock-movements">
            {translate('app.dashboard.seeAll')}
          </Button>
        }
      />
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {translate('app.dashboard.movementsError', { error: errorMessage(error) })}
        </Alert>
      ) : isPending ? (
        <Loading loadingPrimary="" loadingSecondary="" />
      ) : data.length === 0 ? (
        <Typography sx={emptyTableSx}>{translate('app.dashboard.movementsEmpty')}</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{translate('resources.stock-movements.fields.createdAt')}</TableCell>
                <TableCell>{translate('resources.stock-movements.fields.productId')}</TableCell>
                <TableCell>{translate('resources.stock-movements.fields.type')}</TableCell>
                <TableCell align="right">{translate('resources.stock-movements.fields.delta')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map(
                (movement: StockMovement): ReactElement => (
                  <RecordContextProvider key={movement.id} value={movement}>
                    <TableRow hover>
                      <TableCell sx={numberCellSx}>
                        <Link to={`/stock-movements/${movement.id}/show`}>{formatDateTime(movement.createdAt)}</Link>
                      </TableCell>
                      <TableCell>
                        <ReferenceField source="productId" reference="products" link="show" />
                      </TableCell>
                      <TableCell>
                        <MovementTypeBadge />
                      </TableCell>
                      <TableCell align="right" sx={numberCellSx}>
                        <MovementQuantityField source="delta" signed />
                      </TableCell>
                    </TableRow>
                  </RecordContextProvider>
                ),
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
};

export default RecentMovements;
