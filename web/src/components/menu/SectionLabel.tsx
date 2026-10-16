import type { ReactElement } from 'react';
import ListSubheader from '@mui/material/ListSubheader';
import { useSidebarState, useTranslate, type TranslateFunction } from 'react-admin';
import type { LabelProps } from '../../types/components';

/** A small uppercase menu section name ("Inventario", "Catálogo"); hidden when the sidebar is collapsed. */
const SectionLabel = ({ label }: LabelProps): ReactElement | null => {
  const translate: TranslateFunction = useTranslate();
  const [open]: [boolean, (open: boolean) => void] = useSidebarState();
  if (!open) return null;
  return (
    <ListSubheader
      component="div"
      disableSticky
      sx={{
        bgcolor: 'transparent',
        lineHeight: 2.5,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {translate(label)}
    </ListSubheader>
  );
};

export default SectionLabel;
