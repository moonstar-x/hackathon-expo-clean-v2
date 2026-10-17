import { quoteText } from '../i18n/quotes';
import type { ReactElement } from 'react';
import { Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { useDataProvider, useNotify, useRecordContext, useRedirect } from 'react-admin';
import type { Measurement } from '../types/api';
import type { Quote } from '../types/quotes';
import type { InventoryDataProvider } from '../types/providers';
import { StateChip } from './Chips';
export function MeasurementQuoteLink(): ReactElement | null {
    const m: Measurement | undefined = useRecordContext<Measurement>();
    const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
    const redirect: ReturnType<typeof useRedirect> = useRedirect();
    const notify: ReturnType<typeof useNotify> = useNotify();
    if (!m)
        return null;
    if (m.quote)
        return <Button component={Link} to={`/quotes/${m.quote.id}/show`}>Cotización <StateChip value={['pending', 'running', 'failed'].includes(m.quote.calculationState) ? m.quote.calculationState : m.quote.status}/></Button>;
    return <Button onClick={async (): Promise<void> => { try {
        const q: Quote = await provider.createMeasurementQuote(m.id);
        redirect('show', 'quotes', q.id);
    }
    catch {
        notify(quoteText.createQuoteError, { type: 'error' });
    } }}>{quoteText.createQuote}</Button>;
}
