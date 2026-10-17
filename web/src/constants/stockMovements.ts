import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import type { SvgIconComponent } from '@mui/icons-material';
import type { SortPayload } from 'react-admin';
import type { MovementType } from '../types/api';
import type { Choice } from '../types/components';
import type { QuantityLabel } from '../types/fields';

export const MOVEMENT_TYPES: MovementType[] = ['IN', 'OUT', 'ADJUSTMENT'];

/** One icon per movement type, on the product's actions and in the dashboard's feed alike. */
export const MOVEMENT_TYPE_ICON: Record<MovementType, SvgIconComponent> = {
  IN: AddShoppingCartIcon,
  OUT: RemoveShoppingCartIcon,
  ADJUSTMENT: FactCheckIcon,
};

/** The type radio of the movement form; names are translation keys (react-admin translates choices). */
export const MOVEMENT_TYPE_CHOICES: Choice<MovementType>[] = MOVEMENT_TYPES.map(
  (type: MovementType): Choice<MovementType> => ({ id: type, name: `app.stockMovements.typeChoices.${type}` }),
);

/** The quantity input says what the number means for each type of movement. */
export const QUANTITY_LABELS: Record<MovementType, QuantityLabel> = {
  IN: { label: 'app.stockMovements.quantity.IN', helperText: 'app.stockMovements.quantityHelp.IN' },
  OUT: { label: 'app.stockMovements.quantity.OUT', helperText: 'app.stockMovements.quantityHelp.OUT' },
  ADJUSTMENT: { label: 'app.stockMovements.quantity.ADJUSTMENT', helperText: 'app.stockMovements.quantityHelp.ADJUSTMENT' },
};

/** The reason the API writes on a product's opening movement, in English. */
export const INITIAL_STOCK_REASON: string = 'Initial stock';

/** Newest first. */
export const MOVEMENT_SORT: SortPayload = { field: 'createdAt', order: 'DESC' };
export const MOVEMENT_PER_PAGE: number = 25;

/** A product page shows its latest movements, ten at a time. */
export const HISTORY_PER_PAGE: number = 10;
export const HISTORY_ROWS_PER_PAGE: number[] = [10, 25, 50];

/** Fields the API can sort movements by that the phone list offers (api/src/modules/stockMovements). */
export const MOVEMENT_SORT_FIELDS: string[] = ['createdAt', 'quantity', 'delta'];
