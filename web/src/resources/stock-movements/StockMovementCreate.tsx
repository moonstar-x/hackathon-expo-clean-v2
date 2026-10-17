import type { ReactElement } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Create, useNotify, useRedirect } from 'react-admin';
import CreateHeader from '../../components/CreateHeader';
import MovementForm from '../../components/stock-movements/Form/MovementForm';
import { formPageSx } from '../../styles/pages';
import type { StockMovement } from '../../types/api';

const StockMovementCreate = (): ReactElement => {
  const queryClient: QueryClient = useQueryClient();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const redirect: ReturnType<typeof useRedirect> = useRedirect();

  // The product's quantity changed server-side: refetch anything cached about products, movements
  // and the dashboard, then open the product, which must show the new stock without a refresh.
  const onSuccess = (movement: StockMovement): void => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
    ]).then((): void => {
      notify('app.stockMovements.recorded', { type: 'success' });
      redirect('show', 'products', movement.productId);
    });
  };

  return (
    <Create<StockMovement>
      title="app.stockMovements.createTitle"
      mutationOptions={{ onSuccess }}
      actions={<CreateHeader eyebrow="app.menu.inventory" title="app.stockMovements.createTitle" />}
      sx={formPageSx}
    >
      <MovementForm />
    </Create>
  );
};

export default StockMovementCreate;
