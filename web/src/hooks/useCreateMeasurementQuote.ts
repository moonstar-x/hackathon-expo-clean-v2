import { useState } from 'react';
import { useDataProvider, useNotify, useRedirect } from 'react-admin';
import type { InventoryDataProvider } from '../types/providers';
import type { Quote } from '../types/quotes';

/** Starts a quote from a measurement and opens it; `creating` is true while the API works. */
const useCreateMeasurementQuote = (): { create: (measurementId: number) => Promise<void>; creating: boolean } => {
  const provider: InventoryDataProvider = useDataProvider<InventoryDataProvider>();
  const redirect: ReturnType<typeof useRedirect> = useRedirect();
  const notify: ReturnType<typeof useNotify> = useNotify();
  const [creating, setCreating]: [boolean, (creating: boolean) => void] = useState<boolean>(false);

  const create = async (measurementId: number): Promise<void> => {
    setCreating(true);
    try {
      const quote: Quote = await provider.createMeasurementQuote(measurementId);
      redirect('show', 'quotes', quote.id);
    } catch {
      notify('app.measurements.quote.createError', { type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return { create, creating };
};

export default useCreateMeasurementQuote;
