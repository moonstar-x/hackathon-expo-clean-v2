/** Whether two flat objects (a list's filter values) hold the same keys with the same values. */
export const sameValues = (a: Record<string, unknown>, b: Record<string, unknown>): boolean => {
  const keys: string[] = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key: string): boolean => Object.is(a[key], b[key]));
};

/** A copy of `values` without `key`. */
export const without = (values: Record<string, unknown>, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(values).filter(([name]: [string, unknown]): boolean => name !== key));

/** The value at a dot-separated path of an object, or undefined. */
export const valueAt = (record: object, path: string): unknown =>
  path.split('.').reduce((current: unknown, key: string): unknown => {
    return current !== null && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, record);

/** Strings, numbers and booleans as they are; anything else as JSON (for the clipboard). */
export const asText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : JSON.stringify(value);
