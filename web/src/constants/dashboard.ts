/** One retry instead of react-query's default three, so an unreachable API shows an error quickly. */
export const DASHBOARD_QUERY_OPTIONS: { retry: number } = { retry: 1 };

/**
 * Rows in each of the dashboard's two panels. SPEC-002 §7.5 asked for ten; five keep the home screen
 * calm, and "Ver todos" opens the full, already filtered list.
 */
export const DASHBOARD_ROWS: number = 5;

/** Every row of both panels is this tall, so with the same number of rows the panels end level. */
export const DASHBOARD_ROW_HEIGHT: number = 68;
