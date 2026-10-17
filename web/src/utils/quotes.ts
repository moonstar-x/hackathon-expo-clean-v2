import { number } from '../quotes/format';
import { quoteText } from '../i18n/quotes';
import { formatNumber } from './format';
import { DAILY_DAYS, FREQUENCY_DAYS } from '../constants/quotes';
import type { CleaningFrequency, ZoneInput } from '../types/quotes';

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

/** A zone's whole floor, in m²; 0 when it has none. */
export const floorArea = (zone: Pick<ZoneInput, 'floorArea'>): number => Math.max(0, zone.floorArea ?? 0);

/** The floor a zone's work is priced on, as the API's cleanedAreaOf works it out: the area chosen, the floor without objects, or the whole floor. */
export const cleanedArea = (zone: Pick<ZoneInput, 'floorArea' | 'freeArea' | 'cleanedArea'>): number =>
  Math.min(Math.max(0, zone.cleanedArea ?? zone.freeArea ?? zone.floorArea ?? 0), floorArea(zone));

/** How often a zone with these days of service a month is cleaned: once a month, about weekly, or every day. */
export const frequencyOf = (daysPerMonth: number | null): CleaningFrequency | null =>
  daysPerMonth === null || !(daysPerMonth > 0) ? null : daysPerMonth <= 1 ? 'monthly' : daysPerMonth <= 5 ? 'weekly' : 'daily';

/** The days of service a month a frequency sets; a daily zone gets the parameters' default days. */
export const frequencyDays = (frequency: CleaningFrequency, defaultDays: number | null | undefined): number =>
  frequency === 'daily' ? defaultDays ?? DAILY_DAYS : FREQUENCY_DAYS[frequency];

/** How many times a zone is cleaned, as the Resumen tab words it: `3 veces al día`, `1 vez al mes`. */
export const cleaningTimes = (frequency: CleaningFrequency, cleaningsPerDay: number, cleaningsPerMonth: number): string => {
  const daily: boolean = frequency === 'daily';
  const times: number = daily ? cleaningsPerDay : cleaningsPerMonth;
  if (times === 1) return daily ? quoteText.oncePerDay : quoteText.oncePerMonth;
  return (daily ? quoteText.timesPerDay : quoteText.timesPerMonth).replace('{n}', number(times, 0));
};
