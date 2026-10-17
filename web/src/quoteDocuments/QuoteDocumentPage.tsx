import { useEffect, useState, type ReactElement, type SyntheticEvent } from 'react';
import { Alert, AlertTitle, Box, Button, Card, CardContent, Link, MenuItem, Skeleton, Tab, Tabs, TextField, Typography } from '@mui/material';
import { HttpError, Title, useAuthProvider, useLogout, useNotify } from 'react-admin';
import { useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useAppConfig } from '../AppConfigContext';
import useObjectUrl from '../hooks/useObjectUrl';
import { documentFields, documentIssueMessage, documentText } from '../i18n/quoteDocuments';
import { readAuth } from '../providers/authStorage';
import { fetchDocumentFile, getDocumentExports, getDocumentState, putDocumentData, registerDocumentExport, type DocumentFile } from '../providers/quoteDocuments';
import type { DocumentExport, DocumentFormat, DocumentIssue, DocumentState, QuoteDocumentData } from '../types/quoteDocuments';
import { saveBlob } from '../utils/files';
import { formatDateTime } from '../utils/dates';
import { XlsxPreview } from './XlsxPreview';

const formGroups: [string, (keyof QuoteDocumentData)[]][] = [[documentText.client, ['clientLegalName', 'clientTaxId', 'clientContactName', 'clientContactTitle', 'clientEmail', 'clientPhone', 'clientAddress']], [documentText.title, ['issueDate', 'validityDays', 'paymentTerms', 'lineMode', 'contractMonths', 'clientNotes']]];
const editableKey = (data: QuoteDocumentData): string => JSON.stringify(data, Object.keys(data).filter((field: string): boolean => field !== 'number').sort());
function DataForm({ state, save }: { state: DocumentState; save: (data: QuoteDocumentData) => Promise<void> }): ReactElement {
  const [data, setData]: [QuoteDocumentData, (v: QuoteDocumentData) => void] = useState(state.data);
  const [saving, setSaving]: [boolean, (v: boolean) => void] = useState(false);
  const dirty: boolean = editableKey(data) !== editableKey(state.data);
  const submit = async (event: SyntheticEvent): Promise<void> => { event.preventDefault(); setSaving(true); try { await save(data); } finally { setSaving(false); } };
  return <Card variant="outlined"><CardContent><Typography variant="h6">{documentText.data}</Typography><Box component="form" id="document-data" onSubmit={submit}>
    {formGroups.map(([title, fields]: [string, (keyof QuoteDocumentData)[]]): ReactElement => <Box key={title} sx={{ my: 2 }}><Typography fontWeight={600} sx={{ mb: 2 }}>{title}</Typography>{fields.map((field: keyof QuoteDocumentData): ReactElement => {
      const numeric: boolean = field === 'validityDays' || field === 'contractMonths';
      const defaultValue: string | number | null | undefined = state.defaults[field as keyof typeof state.defaults];
      const defaultText: string = field === 'issueDate' && typeof defaultValue === 'string' ? defaultValue.split('-').reverse().join('/') : field === 'validityDays' ? `${defaultValue} días` : String(defaultValue ?? '');
      return <TextField name={field} key={field} label={documentFields[field]} required={field === 'clientLegalName' || field === 'clientContactName'} value={data[field] ?? ''} fullWidth size="small" sx={{ mb: 2 }} type={numeric ? 'number' : field === 'issueDate' ? 'date' : field === 'clientEmail' ? 'email' : 'text'} multiline={field === 'paymentTerms' || field === 'clientNotes'} minRows={field === 'clientNotes' ? 3 : undefined} select={field === 'lineMode'} placeholder={defaultValue ? `${defaultText} (${documentText.defaultValue})` : undefined} helperText={field === 'issueDate' && defaultValue ? `${defaultText} (${documentText.defaultValue})` : undefined} slotProps={{ inputLabel: field === 'issueDate' ? { shrink: true } : undefined, htmlInput: numeric ? { min: 1, max: field === 'validityDays' ? 365 : 60, step: 1 } : undefined }} onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setData({ ...data, [field]: e.target.value === '' ? null : numeric ? Number(e.target.value) : e.target.value })}>{field === 'lineMode' ? [<MenuItem key="perZone" value="perZone">Un ítem por zona</MenuItem>, <MenuItem key="single" value="single">Un solo ítem</MenuItem>] : undefined}</TextField>;
    })}</Box>)}
    {dirty && <Typography color="warning.main" sx={{ mb: 1 }}>{documentText.dirty}</Typography>}
    <Button type="submit" variant="contained" disabled={!dirty || saving}>{documentText.save}</Button>
  </Box></CardContent></Card>;
}
function PdfPreview({ blob }: { blob: Blob }): ReactElement {
  const objectUrl: string | undefined = useObjectUrl(blob);
  if (navigator.pdfViewerEnabled === false) return <Alert severity="info">{documentText.noPdf}</Alert>;
  return <iframe title="Vista previa PDF" src={objectUrl} style={{ width: '100%', minHeight: '70vh', border: 0 }} />;
}
function blockerLink(issue: DocumentIssue, id: number): string {
  if (issue.code === 'ISSUER_FIELD_MISSING') return '/quote-document-settings/1';
  if (issue.code === 'CLIENT_FIELD_MISSING' || issue.code === 'PAYMENT_TERMS_MISSING') return '#document-data';
  return `/quotes/${id}/${issue.code === 'PRICE_ZERO' ? '' : 'show'}`;
}
export function QuoteDocumentPage(): ReactElement {
  const { id: routeId }: Readonly<Partial<Record<'id', string>>> = useParams();
  const id: number = Number(routeId);
  const { apiUrl }: { apiUrl: string } = useAppConfig();
  const userId: number | undefined = readAuth()?.userId;
  const notify: ReturnType<typeof useNotify> = useNotify(), logout: ReturnType<typeof useLogout> = useLogout(), auth: ReturnType<typeof useAuthProvider> = useAuthProvider();
  const client: ReturnType<typeof useQueryClient> = useQueryClient();
  const [format, setFormat]: [DocumentFormat, (v: DocumentFormat) => void] = useState<DocumentFormat>('pdf');
  const [downloading, setDownloading]: [boolean, (v: boolean) => void] = useState(false);
  const stateKey: QueryKey = ['quote-document-state', apiUrl, userId, id];
  const stateQuery: ReturnType<typeof useQuery<DocumentState>> = useQuery({ queryKey: stateKey, queryFn: (): Promise<DocumentState> => getDocumentState(apiUrl, id), retry: false });
  const history: ReturnType<typeof useQuery<DocumentExport[]>> = useQuery({ queryKey: ['quote-document-exports', apiUrl, userId, id], queryFn: (): Promise<DocumentExport[]> => getDocumentExports(apiUrl, id), retry: false });
  const state: DocumentState | undefined = stateQuery.data;
  const refresh = async (): Promise<void> => { await stateQuery.refetch(); await history.refetch(); };
  const fileOptions = (selected: DocumentFormat): UseQueryOptions<DocumentFile> => ({ queryKey: ['quote-document', apiUrl, userId, id, selected, state?.contentHash], queryFn: async ({ signal }: { signal: AbortSignal }): Promise<DocumentFile> => {
    const file: DocumentFile = await fetchDocumentFile(apiUrl, id, selected, signal);
    if (file.hash !== state?.contentHash) { await stateQuery.refetch(); throw new HttpError(documentText.changed, 409, { code: 'DOCUMENT_CHANGED' }); }
    return file;
  }, enabled: !!state?.ready, retry: false, staleTime: Infinity });
  const preview: ReturnType<typeof useQuery<DocumentFile>> = useQuery(fileOptions(format));
  const error: unknown = stateQuery.error ?? preview.error ?? history.error;
  useEffect((): void => { if (error && auth) void auth.checkError(error).catch((): void => { void logout(); }); }, [auth, error, logout]);
  const save = async (data: QuoteDocumentData): Promise<void> => { try { await putDocumentData(apiUrl, id, data); await refresh(); notify(documentText.saved, { type: 'success' }); } catch (e: unknown) { notify(e instanceof Error ? e.message : documentText.failed, { type: 'error' }); if (auth) await auth.checkError(e).catch((): void => { void logout(); }); } };
  const download = async (selected: DocumentFormat): Promise<void> => {
    if (!state?.ready || !state.fileNames) return;
    if (state.warnings.some((w: DocumentIssue): boolean => w.code === 'MARGIN_BELOW_MINIMUM') && !window.confirm(documentText.marginConfirm)) return;
    setDownloading(true);
    try {
      const file: DocumentFile = await client.fetchQuery(fileOptions(selected));
      await registerDocumentExport(apiUrl, id, selected, file.hash);
      saveBlob(file.blob, state.fileNames[selected]); await refresh();
    } catch (e: unknown) {
      if (e instanceof HttpError && e.status === 409) { notify((e.body as { code?: string })?.code === 'DOCUMENT_CHANGED' ? documentText.changed : e.message, { type: 'warning' }); await refresh(); }
      else { notify(e instanceof Error ? e.message : documentText.failed, { type: 'error' }); if (auth) await auth.checkError(e).catch((): void => { void logout(); }); }
    } finally { setDownloading(false); }
  };
  if (!state) return stateQuery.isPending ? <Skeleton variant="rectangular" height="70vh" /> : <Alert severity="error">{stateQuery.error?.message}<Button onClick={(): void => { void refresh(); }}>{documentText.retry}</Button></Alert>;
  return <Box sx={{ minWidth: 0, py: 2 }}><Title title={documentText.title} /><Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}><Box><Typography variant="body2"><Link component={RouterLink} to="/quotes">Cotizaciones</Link> › <Link component={RouterLink} to={`/quotes/${id}/show`}>{state.document?.metadata.subject ?? state.number}</Link> › {documentText.title}</Typography><Typography variant="h5">{state.number}{state.revision ? ` · Rev. ${state.revision}` : ''}</Typography>{state.revision !== null && history.data?.[0] && state.revision > history.data[0].revision && <Typography color="info.main">{documentText.newRevision}</Typography>}</Box><Box sx={{ display: 'flex', gap: 1 }}><Button variant="contained" disabled={!state.ready || downloading} onClick={(): Promise<void> => download('pdf')}>{documentText.downloadPdf}</Button><Button variant="outlined" disabled={!state.ready || downloading} onClick={(): Promise<void> => download('xlsx')}>{documentText.downloadExcel}</Button></Box></Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '340px minmax(0, 1fr)' }, gap: 2 }}>
      <DataForm key={editableKey(state.data)} state={state} save={save} />
      <Box sx={{ minWidth: 0 }}>{state.warnings.map((w: DocumentIssue): ReactElement => <Alert severity="warning" sx={{ mb: 1 }} key={w.code}>{documentIssueMessage(w)}</Alert>)}
        {!state.ready ? <Alert severity="warning"><AlertTitle>{documentText.notReady}</AlertTitle><ul>{state.blockers.map((b: DocumentIssue, index: number): ReactElement => <li key={index}>{blockerLink(b, id).startsWith('#') ? <Link href={blockerLink(b, id)} onClick={(event: React.MouseEvent<HTMLAnchorElement>): void => { event.preventDefault(); const target: HTMLElement | null = document.getElementById('document-data'); target?.scrollIntoView({ behavior: 'smooth' }); const input: HTMLElement | undefined = document.getElementsByName(b.params?.field ?? 'paymentTerms')[0]; input?.focus(); }}>{documentIssueMessage(b)}</Link> : <Link component={RouterLink} to={blockerLink(b, id)}>{documentIssueMessage(b)}</Link>}</li>)}</ul></Alert> : <Card variant="outlined" sx={{ minWidth: 0 }}><Tabs value={format} onChange={(_e: SyntheticEvent, value: DocumentFormat): void => setFormat(value)}><Tab label={documentText.pdf} value="pdf" /><Tab label={documentText.excel} value="xlsx" /></Tabs>{preview.isPending ? <Skeleton variant="rectangular" height="70vh" /> : preview.data ? format === 'pdf' ? <PdfPreview blob={preview.data.blob} /> : <XlsxPreview key={state.contentHash} contentHash={state.contentHash!} blob={preview.data.blob} /> : <Alert severity="error">{documentText.failed}<Button onClick={(): void => { void preview.refetch(); }}>{documentText.retry}</Button></Alert>}</Card>}
      </Box>
    </Box><Typography variant="h6" sx={{ mt: 3 }}>{documentText.history}</Typography>{history.data?.length ? history.data.map((e: DocumentExport): ReactElement => <Typography key={e.id} variant="body2">Rev. {e.revision} · {e.format === 'pdf' ? 'PDF' : 'Excel'} · {e.exportedBy} · {formatDateTime(e.exportedAt)}</Typography>) : <Typography variant="body2">{documentText.noHistory}</Typography>}
  </Box>;
}
