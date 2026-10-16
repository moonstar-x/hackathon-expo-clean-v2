// Client-side mirrors of SPEC-002 §5. The server stays authoritative.

export const maxDecimals = (decimals: number) => (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Number(value.toFixed(decimals)) === value ? undefined : `Como máximo ${decimals} decimales`;
};

export const httpUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? undefined : 'Debe ser una URL http:// o https://';
  } catch {
    return 'Debe ser una URL http:// o https://';
  }
};

/** Converts an empty input to null so optional fields are cleared on the server. */
export const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

export const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;
