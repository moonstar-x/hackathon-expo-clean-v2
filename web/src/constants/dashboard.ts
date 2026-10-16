/** One retry instead of react-query's default three, so an unreachable API shows an error quickly. */
export const DASHBOARD_QUERY_OPTIONS: { retry: number } = { retry: 1 };

/** Rows in each of the dashboard's tables (SPEC-002 §7.5). */
export const DASHBOARD_ROWS: number = 10;
