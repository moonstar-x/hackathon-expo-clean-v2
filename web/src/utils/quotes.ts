/** Calculation states that say more about a quote than its status does. */
const CALCULATION_STATES: ReadonlySet<string> = new Set<string>(['pending', 'running', 'failed']);

/** What a quote's badge shows: its calculation while it runs or after it failed, its status otherwise. */
export const quoteState = (calculationState: string, status: string | null): string | null =>
  CALCULATION_STATES.has(calculationState) ? calculationState : status;
