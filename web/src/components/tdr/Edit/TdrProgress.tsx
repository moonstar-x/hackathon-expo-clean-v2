import { useEffect, useState, type ReactElement } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useTranslate, type TranslateFunction } from 'react-admin';
import type { TdrDocument } from '../../../types/tdr';

/** Past this long, the notice says the analysis is slower than usual, in ms. */
const SLOW_MS: number = 90_000;

/** The reason of a failed analysis in Spanish, from its code (SPEC-009 §5.3). */
export const tdrErrorText = (translate: TranslateFunction, error: string | null): string =>
  translate(`app.tdr.errors.${error ?? 'unknown'}`, { _: translate('app.tdr.errors.unknown') });

/** While the document waits or is analyzed: a notice with a spinner (the page asks again on its own). */
export const TdrProgress = ({ doc }: { doc: TdrDocument }): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  const [slow, setSlow] = useState<boolean>(false);
  useEffect((): (() => void) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout((): void => setSlow(true), SLOW_MS);
    return (): void => clearTimeout(timer);
  }, []);
  // A first attempt that failed for a passing reason waits before the next one.
  const retrying: boolean = doc.status === 'pending' && doc.attempts > 0 && doc.error !== null;
  return (
    <Alert severity="info" icon={<CircularProgress size={18} aria-hidden />} role="status">
      {retrying
        ? translate('app.tdr.progress.retrying', { error: tdrErrorText(translate, doc.error) })
        : translate(slow ? 'app.tdr.progress.slow' : `app.tdr.progress.${doc.status}`)}
    </Alert>
  );
};

/** A failed analysis: why, in Spanish, with the API's own words below for whoever fixes it. */
export const TdrFailure = ({ doc, action }: { doc: TdrDocument; action: ReactElement }): ReactElement => {
  const translate: TranslateFunction = useTranslate();
  return (
    <Alert severity="error" action={action}>
      <AlertTitle>{translate('app.tdr.progress.failedTitle')}</AlertTitle>
      {tdrErrorText(translate, doc.error)}
      {doc.errorDetail ? (
        <Typography variant="caption" component="p" sx={{ mt: 0.5, opacity: 0.8, overflowWrap: 'anywhere' }}>
          {doc.errorDetail}
        </Typography>
      ) : null}
    </Alert>
  );
};
