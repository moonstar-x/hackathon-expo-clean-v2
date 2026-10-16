import ErrorIcon from '@mui/icons-material/Error';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PaidIcon from '@mui/icons-material/Paid';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useQuery } from '@tanstack/react-query';
import {
  Authenticated,
  Loading,
  RecordContextProvider,
  ReferenceField,
  Title,
  useDataProvider,
  useGetList,
} from 'react-admin';
import { Link } from 'react-router-dom';
import { useAppConfig } from '../AppConfigContext';
import { MovementQuantityField, MovementTypeField } from '../components/fields';
import { MovementButton } from '../components/MovementButton';
import type { InventoryDataProvider } from '../providers/dataProvider';
import type { Product, StockMovement } from '../types';
import { formatCurrency, formatDateTime, formatQuantity } from '../utils/format';
import { productListLink } from './links';
import { StatCard } from './StatCard';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

// One retry instead of react-query's default three, so an unreachable API shows an error quickly.
const QUERY_OPTIONS = { retry: 1 } as const;

function StatCards() {
  const { currency } = useAppConfig();
  const dataProvider = useDataProvider<InventoryDataProvider>();
  const { data: stats, isPending, error } = useQuery({
    queryKey: ['stats'],
    queryFn: () => dataProvider.getStats(),
    ...QUERY_OPTIONS,
  });

  if (error) return <Alert severity="error">Could not load inventory statistics: {errorMessage(error)}</Alert>;

  const value = (v: string | number | undefined) => (isPending ? <Skeleton width={60} /> : v);
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2 }}>
      <StatCard
        title="Active products"
        value={value(stats?.products.active)}
        hint={stats ? `${stats.products.total} in total` : undefined}
        icon={<Inventory2Icon />}
        to={productListLink({ active: true })}
      />
      <StatCard
        title="Low stock"
        value={value(stats?.products.lowStock)}
        icon={<WarningAmberIcon />}
        color="warning"
        to={productListLink({ active: true, lowStock: true }, { field: 'quantity', order: 'ASC' })}
      />
      <StatCard
        title="Out of stock"
        value={value(stats?.products.outOfStock)}
        icon={<ErrorIcon />}
        color="error"
        to={productListLink({ active: true, outOfStock: true })}
      />
      <StatCard
        title="Stock value"
        value={value(stats ? formatCurrency(stats.stockValue, currency) : undefined)}
        hint="Active products"
        icon={<PaidIcon />}
        color="success"
      />
    </Stack>
  );
}

function LowStockTable() {
  const { data, isPending, error } = useGetList<Product>('products', {
    filter: { active: true, lowStock: true },
    sort: { field: 'quantity', order: 'ASC' },
    pagination: { page: 1, perPage: 10 },
  }, QUERY_OPTIONS);

  return (
    <Card variant="outlined" sx={{ flex: '1 1 420px', minWidth: 0 }}>
      <CardHeader
        title="Low stock"
        slotProps={{ title: { variant: 'h6' } }}
        action={
          <Button component={Link} to={productListLink({ active: true, lowStock: true }, { field: 'quantity', order: 'ASC' })}>
            View all
          </Button>
        }
      />
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          Could not load low-stock products: {errorMessage(error)}
        </Alert>
      ) : isPending ? (
        <Loading loadingPrimary="" loadingSecondary="" />
      ) : data.length === 0 ? (
        <Typography sx={{ px: 2, pb: 2 }} color="text.secondary">
          Everything is above its reorder level.
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Quantity / reorder level</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>
                    <Link to={`/products/${product.id}/show`}>{product.sku}</Link>
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', color: product.quantity === 0 ? 'error.main' : undefined }}>
                    {formatQuantity(product.quantity, product.unit)} / {formatQuantity(product.reorderLevel, product.unit)}
                  </TableCell>
                  <TableCell align="right">
                    <MovementButton productId={product.id} type="IN" label="Receive" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}

function RecentMovements() {
  const { data, isPending, error } = useGetList<StockMovement>('stock-movements', {
    sort: { field: 'createdAt', order: 'DESC' },
    pagination: { page: 1, perPage: 10 },
  }, QUERY_OPTIONS);

  return (
    <Card variant="outlined" sx={{ flex: '1 1 420px', minWidth: 0 }}>
      <CardHeader
        title="Recent movements"
        slotProps={{ title: { variant: 'h6' } }}
        action={
          <Button component={Link} to="/stock-movements">
            View all
          </Button>
        }
      />
      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          Could not load recent movements: {errorMessage(error)}
        </Alert>
      ) : isPending ? (
        <Loading loadingPrimary="" loadingSecondary="" />
      ) : data.length === 0 ? (
        <Typography sx={{ px: 2, pb: 2 }} color="text.secondary">
          No movements recorded yet.
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Delta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((movement) => (
                <RecordContextProvider key={movement.id} value={movement}>
                  <TableRow hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Link to={`/stock-movements/${movement.id}/show`}>{formatDateTime(movement.createdAt)}</Link>
                    </TableCell>
                    <TableCell>
                      <ReferenceField source="productId" reference="products" link="show" />
                    </TableCell>
                    <TableCell>
                      <MovementTypeField />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <MovementQuantityField source="delta" signed />
                    </TableCell>
                  </TableRow>
                </RecordContextProvider>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}

export function Dashboard() {
  const { appTitle } = useAppConfig();
  return (
    <Authenticated>
      <DashboardContent title={appTitle} />
    </Authenticated>
  );
}

function DashboardContent({ title }: { title: string }) {
  return (
    <Box sx={{ py: 2 }}>
      <Title title={title} />
      <Stack spacing={2}>
        <StatCards />
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
          <LowStockTable />
          <RecentMovements />
        </Stack>
      </Stack>
    </Box>
  );
}
