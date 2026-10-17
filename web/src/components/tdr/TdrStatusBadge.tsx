import type { ReactElement } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslate, type TranslateFunction } from 'react-admin';
import { TDR_BUSY, TDR_STATUS_TONE } from '../../constants/tdr';
import type { TdrStatusBadgeProps } from '../../types/tdr';
import OutlinedBadge from '../list/OutlinedBadge';

/** A TDR document's state as the app's one badge, with a spinner while it waits or is analyzed. */
const TdrStatusBadge = ({ status, dense = false }: TdrStatusBadgeProps): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <OutlinedBadge
      label={translate(`app.tdr.status.${status}`)}
      tone={TDR_STATUS_TONE[status]}
      dense={dense}
      icon={TDR_BUSY.has(status) ? <CircularProgress size={10} color="inherit" aria-hidden /> : undefined}
    />
  );
};

export default TdrStatusBadge;
