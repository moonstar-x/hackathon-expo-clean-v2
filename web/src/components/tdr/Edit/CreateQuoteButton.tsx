import type { ReactElement } from 'react';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { SaveButton, useDataProvider, useNotify, useRecordContext, useRedirect } from 'react-admin';
import type { InventoryDataProvider } from '../../../types/providers';
import type { Quote } from '../../../types/quotes';
import type { TdrDocument } from '../../../types/tdr';

/**
 * Saves the form, then creates the quote from what was saved and opens it (SPEC-009 §5.4). A save
 * the API refuses shows its errors under the fields and creates nothing.
 */
const CreateQuoteButton = (): ReactElement | null => {
  const doc: TdrDocument | undefined = useRecordContext<TdrDocument>();
  const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const redirect: ReturnType<typeof useRedirect> = useRedirect();
  if (!doc) return null;
  const create = async (): Promise<void> => {
    try {
      const quote: Quote = await provider.createTdrQuote(doc.id);
      notify('app.tdr.actions.quoteCreated', { type: 'success' });
      redirect('show', 'quotes', quote.id);
    } catch (error: unknown) {
      notify('app.tdr.actions.quoteError', { type: 'error', messageArgs: { error: error instanceof Error ? error.message : '' } });
    }
  };
  return (
    <SaveButton
      type="button"
      variant="outlined"
      alwaysEnable
      label="app.tdr.actions.createQuote"
      icon={<RequestQuoteIcon />}
      mutationOptions={{ onSuccess: (): void => void create() }}
    />
  );
};

export default CreateQuoteButton;
