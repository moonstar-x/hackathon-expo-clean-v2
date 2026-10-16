import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import { CreateButton } from 'react-admin';
import type { MovementType } from '../types';

const PRESETS: Record<MovementType, { label: string; icon: React.ReactElement }> = {
  IN: { label: 'Recibir existencias', icon: <AddShoppingCartIcon /> },
  OUT: { label: 'Registrar consumo', icon: <RemoveShoppingCartIcon /> },
  ADJUSTMENT: { label: 'Ajustar cantidad', icon: <FactCheckIcon /> },
};

/** Opens the movement create form prefilled with the product and movement type. */
export function MovementButton({
  productId,
  type,
  label,
  variant,
}: {
  productId: number;
  type: MovementType;
  label?: string;
  variant?: 'text' | 'outlined' | 'contained';
}) {
  const preset = PRESETS[type];
  return (
    <CreateButton
      resource="stock-movements"
      label={label ?? preset.label}
      icon={preset.icon}
      variant={variant}
      state={{ record: { productId, type } }}
    />
  );
}
