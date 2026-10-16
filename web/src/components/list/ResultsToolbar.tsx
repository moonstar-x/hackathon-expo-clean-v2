import type { ReactElement } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { TopToolbar } from 'react-admin';
import { compactActionsTheme, resultsToolbarSx } from '../../styles/list';
import type { ResultsToolbarProps } from '../../types/list';
import ListTotal from './ListTotal';

/** A list's actions bar under its filters: the result count on the left, the actions on the right. */
const ResultsToolbar = ({ total, compact = false, children }: ResultsToolbarProps): ReactElement => (
  <TopToolbar sx={resultsToolbarSx}>
    <ListTotal message={total} />
    {compact ? <ThemeProvider theme={compactActionsTheme}>{children}</ThemeProvider> : children}
  </TopToolbar>
);

export default ResultsToolbar;
