/** This deliberately mirrors the API renderer's restricted XLSX format contract. */
export const xlsxNumberFormats: readonly string[] = ['#,##0.00', '0', 'dd/mm/yyyy', '@'];
export function formatCell(value: unknown, numFmt: string): string {
  if (value === null || value === undefined) return '';
  if (!xlsxNumberFormats.includes(numFmt)) {
    if (import.meta.env.DEV) console.warn(`Formato de Excel no compatible: ${numFmt}`);
    return rawText(value);
  }
  if (numFmt === 'dd/mm/yyyy' && value instanceof Date) return new Intl.DateTimeFormat('es', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(value);
  if (typeof value === 'number' && (numFmt === '#,##0.00' || numFmt === '0')) return value.toLocaleString('es', { useGrouping: 'always', minimumFractionDigits: numFmt === '0' ? 0 : 2, maximumFractionDigits: numFmt === '0' ? 0 : 2 });
  return rawText(value);
}

function rawText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  return JSON.stringify(value) ?? '';
}
