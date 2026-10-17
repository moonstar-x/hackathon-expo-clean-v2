import { describe, expect, it, vi } from 'vitest';
import { formatCell, xlsxNumberFormats } from '../../src/quoteDocuments/formatCell';
import { documentMessages, documentIssueMessage } from '../../src/i18n/quoteDocuments';
import { translateApiError } from '../../src/i18n/apiErrors';
describe('document contracts', (): void => {
  it('formats exactly the supported workbook formats in Spanish', (): void => {
    expect(xlsxNumberFormats).toEqual(['#,##0.00', '0', 'dd/mm/yyyy', '@']);
    expect(formatCell(9907.39, '#,##0.00')).toBe('9.907,39'); expect(formatCell(7857.63, '#,##0.00')).toBe('7.857,63');
    expect(formatCell(30, '0')).toBe('30'); expect(formatCell(new Date('2026-10-16T00:00:00Z'), 'dd/mm/yyyy')).toBe('16/10/2026');
    expect(formatCell('Texto', '@')).toBe('Texto'); expect(formatCell(null, '@')).toBe(''); const warn: ReturnType<typeof vi.spyOn> = vi.spyOn(console, 'warn').mockImplementation((): void => {}); expect(formatCell(12, 'General')).toBe('12'); expect(warn).toHaveBeenCalledOnce();
  });
  it('translates every blocker, warning and document API error', (): void => {
    for (const code of ['QUOTE_NOT_CALCULATED', 'QUOTE_NOT_CURRENT', 'QUOTE_NEEDS_REVIEW', 'PRICE_ZERO', 'ISSUER_FIELD_MISSING', 'PAYMENT_TERMS_MISSING', 'CLIENT_FIELD_MISSING', 'PARAMETERS_CHANGED', 'MARGIN_BELOW_MINIMUM', 'FLOOR_AREA_APPROXIMATE']) expect(documentMessages[code]).toBeTruthy();
    expect(documentIssueMessage({ code: 'ISSUER_FIELD_MISSING', params: { field: 'taxId' } })).toBe('Falta RUC en los datos de tu empresa.');
    expect(translateApiError('', 'DOCUMENT_CHANGED')).toContain('Revisa la vista previa');
    expect(translateApiError('', 'DOCUMENT_NOT_READY')).toContain('Falta información');
  });
});
