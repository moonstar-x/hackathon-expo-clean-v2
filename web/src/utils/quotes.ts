import { number } from '../quotes/format';
import { quoteText } from '../i18n/quotes';
import { formatNumber } from './format';

/** Calculation states that say more about a quote than its status does. */
const CALCULATION_STATES: ReadonlySet<string> = new Set<string>(['pending', 'running', 'failed']);

/** What a quote's badge shows: its calculation while it runs or after it failed, its status otherwise. */
export const quoteState = (calculationState: string, status: string | null): string | null =>
  CALCULATION_STATES.has(calculationState) ? calculationState : status;

/** How often a zone is cleaned, as SPEC-005 §5.9 words it: `Cada 4 h · 3 por día`. */
export const cleaningFrequency = (hoursBetweenCleanings: number, cleaningsPerDay: number): string =>
  `${quoteText.every} ${number(hoursBetweenCleanings, 0)} h · ${number(cleaningsPerDay, 0)} ${quoteText.perDay}`;

/** A dose or an amount of product in ml or g, to the tenth a person can measure out: `10 ml`, `2,5 g`. */
export const formatDose = (value: number, unit: string): string => `${formatNumber(Math.round(value * 10) / 10)} ${unit}`;

/** A source that names no cell: the zone defaults are not in the workbook. */
const NO_SOURCE: RegExp = /^Origen:\s*—\.?$/u;

/**
 * A parameter's note under its input, without the label it repeats: "Fondo de reserva. Origen: D10."
 * reads "Origen: D10.", and a source that is only a dash reads nothing. Other notes are kept whole.
 */
export const sourceNote = (note: string | undefined, label: string): string | undefined => {
  if (!note) return undefined;
  const source: string = note.startsWith(`${label}.`) ? note.slice(label.length + 1).trim() : note;
  return source === '' || NO_SOURCE.test(source) ? undefined : source;
};
