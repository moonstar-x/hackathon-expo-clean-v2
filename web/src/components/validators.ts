// Client-side mirrors of SPEC-002 §5. The server stays authoritative.

export const maxDecimals = (decimals: number) => (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Number(value.toFixed(decimals)) === value ? undefined : `At most ${decimals} decimal places`;
};

export const httpUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? undefined : 'Must be an http:// or https:// URL';
  } catch {
    return 'Must be an http:// or https:// URL';
  }
};

/** Converts an empty input to null so optional fields are cleared on the server. */
export const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

export const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;
