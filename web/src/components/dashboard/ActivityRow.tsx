import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import type { SvgIconComponent } from '@mui/icons-material';
import {
  Link,
  RecordContextProvider,
  useGetManyAggregate,
  useTranslate,
  type TranslateFunction,
  type UseGetManyHookValue,
} from 'react-admin';
import { MOVEMENT_TYPE_COLOR } from '../../constants/components';
import { MOVEMENT_TYPE_ICON } from '../../constants/stockMovements';
import { activityEndSx, movementIconSx, panelRowSx, rowMainSx, rowMetaSx, rowTitleSx } from '../../styles/dashboard';
import type { Product } from '../../types/api';
import type { ActivityRowProps } from '../../types/dashboard';
import { formatDateTime } from '../../utils/dates';
import MovementQuantityField from '../fields/MovementQuantityField';

/**
 * A recent movement: its type as an icon (the same as the product page's actions) and a word, the
 * product, and the change in stock, signed and coloured, over when it happened.
 */
const ActivityRow = ({ movement }: ActivityRowProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  // Batched with the other rows' products and the quantity field's unit lookup.
  const { data }: UseGetManyHookValue<Product> = useGetManyAggregate<Product>('products', { ids: [movement.productId] });
  const Icon: SvgIconComponent = MOVEMENT_TYPE_ICON[movement.type];
  const typeLabel: string = translate(`app.stockMovements.types.${movement.type}`);
  return (
    <RecordContextProvider value={movement}>
      <ListItem divider sx={panelRowSx}>
        <Box sx={movementIconSx(MOVEMENT_TYPE_COLOR[movement.type])} role="img" aria-label={typeLabel}>
          <Icon />
        </Box>
        <Box sx={rowMainSx}>
          <Link to={`/stock-movements/${movement.id}/show`} sx={rowTitleSx}>
            {data?.[0]?.name ?? translate('app.stockMovements.title', { id: movement.id })}
          </Link>
          <Typography component="p" sx={rowMetaSx}>
            {typeLabel}
          </Typography>
        </Box>
        <Box sx={activityEndSx}>
          <MovementQuantityField source="delta" signed />
          <Typography component="p" sx={rowMetaSx}>
            {formatDateTime(movement.createdAt)}
          </Typography>
        </Box>
      </ListItem>
    </RecordContextProvider>
  );
};

export default ActivityRow;
