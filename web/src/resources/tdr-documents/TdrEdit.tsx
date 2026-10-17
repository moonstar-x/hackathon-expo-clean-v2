import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DownloadIcon from '@mui/icons-material/Download';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import {
  DeleteButton,
  Edit,
  Link,
  useDataProvider,
  useEditContext,
  useNotify,
  useRecordContext,
  useTranslate,
  type TranslateFunction,
} from 'react-admin';
import { useAppConfig } from '../../AppConfigContext';
import ConfirmButton from '../../components/ConfirmButton';
import PageHeader from '../../components/PageHeader';
import TdrForm from '../../components/tdr/Edit/TdrForm';
import { TdrFailure, TdrProgress } from '../../components/tdr/Edit/TdrProgress';
import TdrStatusBadge from '../../components/tdr/TdrStatusBadge';
import { TDR_BUSY } from '../../constants/tdr';
import { downloadTdrFile } from '../../providers/tdrFiles';
import { formPageSx } from '../../styles/pages';
import type { InventoryDataProvider } from '../../types/providers';
import type { TdrDocument } from '../../types/tdr';
import { tdrName, tdrRefetchInterval } from '../../utils/tdr';

/** Queues the analysis again; it replaces the saved edits, so a done document asks first. */
const AnalyzeButton = ({ ask }: { ask: boolean }): ReactElement | null => {
  const doc: TdrDocument | undefined = useRecordContext<TdrDocument>();
  const { refetch } = useEditContext<TdrDocument>();
  const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const translate: TranslateFunction = useTranslate();
  if (!doc) return null;
  const analyze = async (): Promise<void> => {
    try {
      await provider.analyzeTdr(doc.id);
      await refetch();
    } catch (error: unknown) {
      notify('app.tdr.actions.analyzeError', { type: 'error', messageArgs: { error: error instanceof Error ? error.message : '' } });
    }
  };
  if (!ask) {
    return (
      <Button color="inherit" size="small" onClick={(): void => void analyze()}>
        {translate('app.tdr.actions.retry')}
      </Button>
    );
  }
  return (
    <ConfirmButton
      label="app.tdr.actions.reanalyze"
      variant="outlined"
      confirmTitle="app.tdr.actions.reanalyzeTitle"
      confirmContent="app.tdr.actions.reanalyzeConfirm"
      onConfirm={analyze}
    >
      <AutorenewIcon />
    </ConfirmButton>
  );
};

/** The heading: the service or file name with its state, and what can be done with the document. */
const TdrHeader = (): ReactElement | null => {
  const doc: TdrDocument | undefined = useRecordContext<TdrDocument>();
  const { apiUrl } = useAppConfig();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const translate: TranslateFunction = useTranslate();
  if (!doc) return null;
  const download = async (): Promise<void> => {
    try {
      await downloadTdrFile(apiUrl, doc.id, doc.fileName);
    } catch (error: unknown) {
      notify('app.tdr.actions.downloadError', { type: 'error', messageArgs: { error: error instanceof Error ? error.message : '' } });
    }
  };
  return (
    <PageHeader
      eyebrow={translate('resources.tdr-documents.name', { smart_count: 1 })}
      title={tdrName(doc)}
      badge={<TdrStatusBadge status={doc.status} />}
      actions={
        <>
          {doc.quoteId !== null ? (
            <Button component={Link} to={`/quotes/${doc.quoteId}/show`} variant="contained" startIcon={<RequestQuoteIcon />}>
              {translate('app.tdr.actions.viewQuote')}
            </Button>
          ) : null}
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={(): void => void download()}>
            {translate('app.tdr.actions.download')}
          </Button>
          {doc.status === 'done' ? <AnalyzeButton ask /> : null}
          {doc.status !== 'done' ? <DeleteButton mutationMode="pessimistic" variant="outlined" /> : null}
        </>
      }
    />
  );
};

/** The analysis' state, or the form once it is done. */
const TdrContent = (): ReactElement | null => {
  const doc: TdrDocument | undefined = useRecordContext<TdrDocument>();
  if (!doc) return null;
  if (TDR_BUSY.has(doc.status)) return <TdrProgress doc={doc} />;
  if (doc.status === 'failed') return <TdrFailure doc={doc} action={<AnalyzeButton ask={false} />} />;
  return <TdrForm />;
};

/**
 * A TDR document (SPEC-009 §6): while analyzed, its progress, asked again every 2 s; then the
 * extracted information as a form. Saving stays on the page.
 */
const TdrEdit = (): ReactElement => (
  <Edit
    mutationMode="pessimistic"
    redirect={false}
    actions={<TdrHeader />}
    queryOptions={{ refetchInterval: tdrRefetchInterval }}
    sx={formPageSx}
    component={Box}
  >
    <TdrContent />
  </Edit>
);

export default TdrEdit;
