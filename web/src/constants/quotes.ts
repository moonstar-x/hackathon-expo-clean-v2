import type { SortPayload } from 'react-admin';
import type { Tone } from '../types/list';
import type { CleaningFrequency, OfferProductKey, SimpleDraft } from '../types/quotes';

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
  simulation: 'green',
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

/** Badge tone per sanitary risk of a zone type: critical red, semicritical orange, the rest neutral. */
export const RISK_TONE: Record<string, Tone> = {
  critical: 'red',
  semicritical: 'orange',
  noncritical: 'neutral',
};

/** A zone's three products in the technical offer, by what each is for (`app.quotes.offer.roles`). */
export const OFFER_PRODUCTS: [string, OfferProductKey][] = [
  ['cleaning', 'cleaningProduct'],
  ['daily', 'dailyDisinfectant'],
  ['terminal', 'terminalDisinfectant'],
];

/** How many months back the waste control's month picker reaches, this one included. */
export const WASTE_PERIODS: number = 24;

/**
 * Each zone's colour on the Resumen tab, by its order in the quote: the categorical hues in a fixed order
 * (light and dark steps of the same hues), never cycled. Zones past the eighth are drawn neutral.
 */
export const ZONE_COLORS: Record<'light' | 'dark', string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

/** The cleaning frequencies the Resumen tab offers, in order. */
export const FREQUENCIES: CleaningFrequency[] = ['daily', 'weekly', 'monthly'];

/** Days of service a month a weekly and a monthly zone get; a daily one gets the parameters' default days. */
export const FREQUENCY_DAYS: Record<Exclude<CleaningFrequency, 'daily'>, number> = { weekly: 4, monthly: 1 };

/** Days of service a month of a daily zone when the parameters have no default (the seeded default). */
export const DAILY_DAYS: number = 22;

/** The top of the Resumen tab's sliders, unless the quote's own value is higher. */
export const MAX_WASTE_RATE: number = 0.5;
export const MAX_MARGIN: number = 0.8;

/** The Resumen tab with nothing changed. */
export const EMPTY_SIMPLE_DRAFT: SimpleDraft = { zones: {}, edits: {} };
