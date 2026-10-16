// Client-side mirrors of SPEC-002 §5. The server stays authoritative.

/** At most `decimals` decimal places, as the API stores quantities and costs. */
export const maxDecimals =
  (decimals: number) =>
  (value: unknown): string | undefined => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return Number(value.toFixed(decimals)) === value ? undefined : `Como máximo ${decimals} decimales`;
  };

/** An http:// or https:// address, or nothing. */
export const httpUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    const url: URL = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? undefined : 'Debe ser una URL http:// o https://';
  } catch {
    return 'Debe ser una URL http:// o https://';
  }
};

/** Converts an empty input to null so optional fields are cleared on the server. */
export const emptyToNull = (value: unknown): unknown => (value === '' || value === undefined ? null : value);
