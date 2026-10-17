import { describe, expect, it } from 'vitest';
import { allocateCents, buildQuoteDocument, documentHash, readiness } from '../src/modules/quoteDocuments/builder.ts';
import { numberToSpanishWords } from '../src/modules/quoteDocuments/words.ts';
import { documentFixture } from './documentFixture.ts';
describe('resolved commercial document', () => {
  it('matches A.1, manual A.1b and single-line and contract values', () => {
    const input = documentFixture(); let d = buildQuoteDocument(input);
    expect(d.lines.map(l => l.amount.value)).toEqual([7857.63, 1123.29, 705.75, 220.72]);
    expect([d.subtotal.value, d.vat.value, d.total.value]).toEqual([9907.39, 1486.11, 11393.5]);
    expect(d.amountInWords).toBe('Son: once mil trescientos noventa y tres con 50/100 dólares');
    expect(d.issueDate).toBe('2026-10-15'); expect(d.validUntil).toBe('2026-11-14');
    input.data.contractMonths = 12; input.data.lineMode = 'single'; d = buildQuoteDocument(input);
    expect(d.contract!.subtotal.value).toBe(118888.68); expect(d.lines.map(l => l.amount.value)).toEqual([9907.39]);
    d = buildQuoteDocument(documentFixture(3000));
    expect(d.lines.map(l => l.amount.value)).toEqual([2379.32, 340.14, 213.71, 66.83]);
    expect([d.subtotal.value, d.vat.value, d.total.value]).toEqual([3000, 450, 3450]);
    const manual = documentFixture(3000); expect(readiness(manual.quote, manual.data, manual.settings).warnings).toContainEqual({ code: 'MARGIN_BELOW_MINIMUM' });
  });
  it('allocates tie remainders in position order, and zero weights equally', () => {
    expect(allocateCents(100, [1, 1, 1])).toEqual([34, 33, 33]); expect(allocateCents(2, [0, 0, 0])).toEqual([1, 1, 0]);
    let seed = 91; const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 200; i++) { const total = Math.floor(rand() * 1e8); expect(allocateCents(total, Array.from({ length: 4 }, rand)).reduce((a, b) => a + b)).toBe(total); }
  });
  it('reconciles line and VAT cents across 200 seeded offered prices', () => {
    const input = documentFixture(); let seed = 251;
    const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (let i = 0; i < 200; i++) {
      input.quote.result!.pricing.offeredPrice = 1 + rand() * 100000;
      input.quote.result!.zones.forEach(z => { z.totalCost = rand() * 10000; });
      const d = buildQuoteDocument(input);
      const cents = (n: number) => Math.round(n * 100);
      expect(d.lines.reduce((sum, l) => sum + cents(l.amount.value), 0)).toBe(cents(d.subtotal.value));
      expect(cents(d.subtotal.value) + cents(d.vat.value)).toBe(cents(d.total.value));
    }
  });
  it('also renders the maximum allowed manual price without losing integer VAT precision', () => {
    const d = buildQuoteDocument(documentFixture(1000000000));
    expect(d.total.value).toBe(1150000000); expect(d.vat.value).toBe(150000000);
    expect(d.amountInWords).toBe('Son: mil ciento cincuenta millones con 00/100 dólares');
  });
  it('ignores revision in hash and never includes empty optional strings or internal data', () => {
    const input = documentFixture(); const d = buildQuoteDocument(input);
    expect(documentHash(d)).toBe(documentHash(buildQuoteDocument({ ...input, revision: 2 })));
    input.data.clientContactName = 'Otro contacto'; expect(documentHash(buildQuoteDocument(input))).not.toBe(documentHash(d));
    const walk = (v: unknown) => { if (typeof v === 'string') expect(['', '—', 'null']).not.toContain(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); }; walk(d);
    expect(JSON.stringify(d)).not.toMatch(/totalCost|profit|margin|createdBy|snapshot|purchasePlan/);
  });
  it('lists all blockers and treats parameter changes as a warning', () => {
    const input = documentFixture(); input.quote.calculation.isStale = true;
    expect(readiness(input.quote, input.data, input.settings)).toEqual({ blockers: [], warnings: [{ code: 'PARAMETERS_CHANGED' }] });
    input.quote.calculation.state = 'pending'; input.quote.calculation.isCurrent = false; input.quote.status = 'needsReview'; input.quote.result!.pricing.offeredPrice = 0;
    input.settings.legalName = null; input.settings.paymentTerms = null; input.data.clientLegalName = null;
    expect(new Set(readiness(input.quote, input.data, input.settings).blockers.map(b => b.code))).toEqual(new Set(['QUOTE_NOT_CALCULATED', 'QUOTE_NOT_CURRENT', 'QUOTE_NEEDS_REVIEW', 'PRICE_ZERO', 'ISSUER_FIELD_MISSING', 'PAYMENT_TERMS_MISSING', 'CLIENT_FIELD_MISSING']));
    expect(() => buildQuoteDocument(input)).toThrow();
  });
  it.each([[0, 'cero'], [21, 'veintiuno'], [100, 'cien'], [101, 'ciento uno'], [21000, 'veintiún mil'], [1000000, 'un millón'], [21000000, 'veintiún millones'], [999999999, 'novecientos noventa y nueve millones novecientos noventa y nueve mil novecientos noventa y nueve']] as const)('words for %i', (n, text) => expect(numberToSpanishWords(n)).toBe(text));
});
