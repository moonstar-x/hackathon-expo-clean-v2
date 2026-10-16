import { Children, cloneElement, isValidElement, useState, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import Menu from '@mui/material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Button, useTranslate, type TranslateFunction } from 'react-admin';
import type { ActionsMenuItemProps, ActionsMenuProps } from '../types/components';

// A labeled button that opens a dropdown of actions for a Show toolbar or detail
// view. Each child receives `handleClose`.
const ActionsMenu = ({ label, children }: ActionsMenuProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open: boolean = Boolean(anchor);
  const id: string = translate(label).replaceAll(' ', '-');
  const handleClose = (): void => setAnchor(null);

  return (
    <>
      <Button
        id={`${id}-button`}
        label={label}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={(event: MouseEvent<HTMLButtonElement>): void => setAnchor(event.currentTarget)}
        endIcon={<KeyboardArrowDownIcon />}
      />
      <Menu
        id={`${id}-menu`}
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        slotProps={{ list: { 'aria-labelledby': `${id}-button` } }}
      >
        {Children.map(children, (child: ReactNode): ReactNode =>
          isValidElement<ActionsMenuItemProps>(child) ? cloneElement(child, { handleClose }) : child,
        )}
      </Menu>
    </>
  );
};

export default ActionsMenu;
