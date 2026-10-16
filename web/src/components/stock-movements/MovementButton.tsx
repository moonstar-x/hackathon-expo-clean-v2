import type { ReactElement } from 'react';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import { CreateButton } from 'react-admin';
import type { MovementType } from '../../types/api';
import type { MovementButtonProps, MovementPreset } from '../../types/fields';

const PRESETS: Record<MovementType, MovementPreset> = {
  IN: { label: 'app.stockMovements.actions.IN', icon: <AddShoppingCartIcon /> },
  OUT: { label: 'app.stockMovements.actions.OUT', icon: <RemoveShoppingCartIcon /> },
  ADJUSTMENT: { label: 'app.stockMovements.actions.ADJUSTMENT', icon: <FactCheckIcon /> },
};

/** Opens the movement form prefilled with the product and the type of movement. */
const MovementButton = ({ productId, type, label, variant }: MovementButtonProps): ReactElement => {
  const preset: MovementPreset = PRESETS[type];
  return (
    <CreateButton
      resource="stock-movements"
      label={label ?? preset.label}
      icon={preset.icon}
      variant={variant}
      state={{ record: { productId, type } }}
    />
  );
};

export default MovementButton;
