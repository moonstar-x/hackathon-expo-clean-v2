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
import { Link, Loading, useGetList, useTranslate, type TranslateFunction, type UseGetListHookValue } from 'react-admin';
import { DASHBOARD_QUERY_OPTIONS, DASHBOARD_ROWS } from '../../constants/dashboard';
import { emptyTableSx, numberCellSx, tableCardSx } from '../../styles/dashboard';
import type { Product } from '../../types/api';
import type { ListLinkSort } from '../../types/dashboard';
import { errorMessage } from '../../utils/errors';
import { formatQuantity } from '../../utils/format';
import { productListLink } from '../../utils/links';
import MovementButton from '../stock-movements/MovementButton';

const LOWEST_FIRST: ListLinkSort = { field: 'quantity', order: 'ASC' };
const LOW_STOCK_FILTER: Record<string, unknown> = { active: true, lowStock: true };

/** The products that most need restocking, lowest first, each with a shortcut to receive stock. */
const LowStockTable = (): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const { data, isPending, error }: UseGetListHookValue<Product> = useGetList<Product>(
    'products',
    { filter: LOW_STOCK_FILTER, sort: LOWEST_FIRST, pagination: { page: 1, perPage: DASHBOARD_ROWS } },
    DASHBOARD_QUERY_OPTIONS,
  );

  return (
    <Card sx={tableCardSx}>
      <CardHeader
        title={translate('app.dashboard.lowStock')}
        slotProps={{ title: { component: 'h2', variant: 'h6' } }}
        action={
          <Button component={RouterLink} to={productListLink(LOW_STOCK_FILTER, LOWEST_FIRST)}>
            {translate('app.dashboard.seeAll')}
          </Button>
        }
      />
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {translate('app.dashboard.lowStockError', { error: errorMessage(error) })}
        </Alert>
      ) : isPending ? (
        <Loading loadingPrimary="" loadingSecondary="" />
      ) : data.length === 0 ? (
        <Typography sx={emptyTableSx}>{translate('app.dashboard.lowStockEmpty')}</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{translate('resources.products.fields.sku')}</TableCell>
                <TableCell>{translate('resources.products.fields.name')}</TableCell>
                <TableCell align="right">{translate('app.dashboard.stockAgainstReorder')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map(
                (product: Product): ReactElement => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Link to={`/products/${product.id}/show`}>{product.sku}</Link>
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...numberCellSx, color: product.quantity === 0 ? 'error.main' : undefined }}
                    >
                      {translate('app.dashboard.quantityOfReorder', {
                        quantity: formatQuantity(product.quantity, product.unit),
                        reorder: formatQuantity(product.reorderLevel, product.unit),
                      })}
                    </TableCell>
                    <TableCell align="right">
                      <MovementButton productId={product.id} type="IN" label="app.dashboard.receive" />
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
};

export default LowStockTable;
