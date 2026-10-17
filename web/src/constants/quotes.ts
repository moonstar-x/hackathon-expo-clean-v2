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
