import type { ReactElement } from 'react';
import ListSubheader from '@mui/material/ListSubheader';
import { useSidebarState, useTranslate, type TranslateFunction } from 'react-admin';
import { sectionLabelSx } from '../../styles/menu';
import type { LabelProps } from '../../types/components';

/**
 * A menu section's name ("Inventario", "Catálogo") under a hairline. It stays mounted when the
 * sidebar collapses: the name fades out and the hairline stays, so the groups still read in the
 * icon strip and nothing below it jumps while the sidebar opens or closes.
 */
const SectionLabel = ({ label }: LabelProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const [open]: [boolean, (open: boolean) => void] = useSidebarState();
  return (
    <ListSubheader component="div" disableSticky disableGutters sx={sectionLabelSx(open)}>
      <span>{translate(label)}</span>
    </ListSubheader>
  );
};

// MUI's MenuList reads this from its child's type (it sees SectionLabel, not ListSubheader): a
// section name is never the item it focuses first.
SectionLabel.muiSkipListHighlight = true;

export default SectionLabel;
