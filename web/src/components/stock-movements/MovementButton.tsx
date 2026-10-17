import type { ReactElement } from 'react';
import Button from '@mui/material/Button';
import type { SvgIconComponent } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useCreatePath, useTranslate, type TranslateFunction } from 'react-admin';
import { MOVEMENT_TYPE_ICON } from '../../constants/stockMovements';
import type { MovementButtonProps } from '../../types/fields';

/**
 * Opens the movement form prefilled with the product and the type of movement (react-admin's Create
 * reads `state.record`). A plain button rather than react-admin's CreateButton, which turns into a
 * floating button pinned to the screen's corner below `md`.
 */
const MovementButton = ({ productId, type, label, variant }: MovementButtonProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const createPath: ReturnType<typeof useCreatePath> = useCreatePath();
  const Icon: SvgIconComponent = MOVEMENT_TYPE_ICON[type];
  return (
    <Button
      component={Link}
      to={createPath({ resource: 'stock-movements', type: 'create' })}
      state={{ record: { productId, type } }}
      variant={variant}
      startIcon={<Icon />}
    >
      {translate(label ?? `app.stockMovements.actions.${type}`)}
    </Button>
  );
};

export default MovementButton;
