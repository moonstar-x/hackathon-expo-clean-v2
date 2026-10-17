import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import { detailGridSx } from '../../styles/pages';
import type { ChildrenProps } from '../../types/components';

/**
 * A detail page's fields: `<Labeled>` children on as many ~200px columns as fit. A long value takes
 * the whole row with `<Labeled sx={wideFieldSx}>`.
 */
const DetailGrid = ({ children }: ChildrenProps): ReactElement => <Box sx={detailGridSx}>{children}</Box>;

export default DetailGrid;
