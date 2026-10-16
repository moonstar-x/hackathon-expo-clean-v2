import SwapVertIcon from '@mui/icons-material/SwapVert';
import type { ResourceProps } from 'react-admin';
import type { StockMovement } from '../../types/api';
import StockMovementCreate from './StockMovementCreate';
import StockMovementList from './StockMovementList';
import StockMovementShow from './StockMovementShow';

// No edit and no delete: a mistake is corrected with a new movement (SPEC-002 §7.3).
const stockMovements: Omit<ResourceProps, 'name'> = {
  list: StockMovementList,
  create: StockMovementCreate,
  show: StockMovementShow,
  icon: SwapVertIcon,
  recordRepresentation: (record: StockMovement): string => `Movimiento n.º ${record.id}`,
};

export default stockMovements;
