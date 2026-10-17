const small = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const apocope = (s: string) => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
export function numberToSpanishWords(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('Integer out of range');
  if (n >= 1000000000000) return (n < 2000000000000 ? 'un billón' : `${apocope(numberToSpanishWords(Math.floor(n / 1000000000000)))} billones`) + (n % 1000000000000 ? ` ${numberToSpanishWords(n % 1000000000000)}` : '');
  if (n < 30) return small[n];
  if (n < 100) return ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'][Math.floor(n / 10)] + (n % 10 ? ` y ${small[n % 10]}` : '');
  if (n === 100) return 'cien';
  if (n < 1000) return ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'][Math.floor(n / 100)] + (n % 100 ? ` ${numberToSpanishWords(n % 100)}` : '');
  if (n < 1000000) return (n < 2000 ? 'mil' : `${apocope(numberToSpanishWords(Math.floor(n / 1000)))} mil`) + (n % 1000 ? ` ${numberToSpanishWords(n % 1000)}` : '');
  return (n < 2000000 ? 'un millón' : `${apocope(numberToSpanishWords(Math.floor(n / 1000000)))} millones`) + (n % 1000000 ? ` ${numberToSpanishWords(n % 1000000)}` : '');
}
