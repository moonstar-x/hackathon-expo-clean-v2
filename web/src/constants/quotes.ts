import type { SortPayload } from 'react-admin';
import type { Tone } from '../types/list';

/**
 * Badge tone per quote state, calculation and margin status (the labels live in quoteEnums): red for
 * what is lost or broken, orange for what needs a look, green for what is fine, blue for neutral
 * facts. Calculating states stay neutral, with a spinner.
 */
export const QUOTE_STATE_TONE: Record<string, Tone> = {
  failed: 'red',
  loss: 'red',
  alert: 'red',
  needsReview: 'orange',
  belowMinimum: 'orange',
  watch: 'orange',
  simulation: 'blue',
  acceptable: 'blue',
  healthy: 'green',
  ok: 'green',
};

/** Newest first, as the API sorts quotes by default. */
export const QUOTE_SORT: SortPayload = { field: 'createdAt', order: 'DESC' };

/** Fields the API can sort quotes by that the phone list offers (api/src/modules/quotes). */
export const QUOTE_SORT_FIELDS: string[] = ['createdAt', 'name', 'offeredPrice', 'margin'];

/** The statuses a quote can be filtered by; labels from quoteEnums, untranslated. */
export const QUOTE_STATUSES: string[] = ['needsReview', 'simulation'];
