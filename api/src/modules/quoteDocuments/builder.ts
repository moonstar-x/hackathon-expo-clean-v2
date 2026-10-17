import { createHash } from 'node:crypto';
import { round } from '../../lib/numbers.ts';
import type { quotesRepository } from '../quotes/repository.ts';
import { documentColors } from './colors.ts';
import type { LogoInfo } from './logo.ts';
import type { QuoteDocumentData, QuoteDocumentSettings } from './schemas.ts';
import type { SignatureInfo } from './signature.ts';
import type { Money, QuoteDocument } from './types.ts';
import { numberToSpanishWords } from './words.ts';

export type QuoteRecord = ReturnType<ReturnType<typeof quotesRepository>['get']>;
export const blockerCodes = ['QUOTE_NOT_CALCULATED', 'QUOTE_NOT_CURRENT', 'QUOTE_NEEDS_REVIEW', 'PRICE_ZERO', 'ISSUER_FIELD_MISSING', 'PAYMENT_TERMS_MISSING', 'CLIENT_FIELD_MISSING'] as const;
export interface DocumentIssue { code: string; params?: { field: string } }
export function readiness(quote: QuoteRecord, data: QuoteDocumentData, settings: QuoteDocumentSettings) {
  const blockers: DocumentIssue[] = [], warnings: DocumentIssue[] = [];
  const add = (code: string) => blockers.push({ code });
  if (quote.calculation.state !== 'done' || !quote.result || !quote.snapshot) add('QUOTE_NOT_CALCULATED');
  if (!quote.calculation.isCurrent) add('QUOTE_NOT_CURRENT');
  if (quote.status !== 'simulation') add('QUOTE_NEEDS_REVIEW');
  if (!(quote.result && quote.result.pricing.offeredPrice > 0)) add('PRICE_ZERO');
  for (const field of ['tradeName', 'legalName', 'taxId', 'address', 'email'] as const) if (!settings[field]) blockers.push({ code: 'ISSUER_FIELD_MISSING', params: { field } });
  if (!(data.paymentTerms || settings.paymentTerms)) add('PAYMENT_TERMS_MISSING');
  for (const field of ['clientLegalName', 'clientContactName'] as const) if (!data[field]) blockers.push({ code: 'CLIENT_FIELD_MISSING', params: { field } });
  if (quote.calculation.isStale) warnings.push({ code: 'PARAMETERS_CHANGED' });
  if (['loss', 'belowMinimum'].includes(quote.result?.pricing.marginStatus ?? '')) warnings.push({ code: 'MARGIN_BELOW_MINIMUM' });
  if (quote.zones?.some(z => z.isFloorApproximate)) warnings.push({ code: 'FLOOR_AREA_APPROXIMATE' });
  return { blockers, warnings };
}
export const dateInZone = (value: string, timezone: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const dateText = (v: string) => v.split('-').reverse().join('/');
const formatted = (v: number, digits = 2) => v.toLocaleString('es', { useGrouping: 'always', minimumFractionDigits: digits, maximumFractionDigits: digits });
const flexible = (v: number) => v.toLocaleString('es', { maximumFractionDigits: 2 });
const money = (cents: number): Money => ({ value: cents / 100, text: formatted(cents / 100) });
const area = (value: number) => ({ value: round(value, 2), text: formatted(round(value, 2)) });
const joined = (v: (string | null | undefined)[], separator = ' · ') => v.filter(Boolean).join(separator);
const paragraphs = (v: string) => v.split('\n').map(s => s.trim()).filter(Boolean);
const risks: Record<string, string> = { critical: 'crítico', semicritical: 'semicrítico', noncritical: 'no crítico' };
const installation: Record<string, string> = { privateHospital: 'Hospital privado', publicHospital: 'Hospital público', office: 'Oficina', mall: 'Centro comercial', other: 'Otro' };
export function allocateCents(total: number, weights: number[]): number[] {
  if (!weights.length) throw new Error('No zones');
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map(w => total * (sum ? w / sum : 1 / weights.length));
  const cents = raw.map(Math.floor);
  const order = raw.map((v, i) => ({ i, fraction: v - cents[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let i = 0, remaining = total - cents.reduce((a, b) => a + b, 0); i < remaining; i++) cents[order[i].i]++;
  return cents;
}
export function buildQuoteDocument({ quote, data, settings: s, revision, number, timezone, logo, signature = null }: { quote: QuoteRecord; data: QuoteDocumentData; settings: QuoteDocumentSettings; revision: number; number: string; timezone: string; logo: LogoInfo | null; signature?: SignatureInfo | null }): QuoteDocument {
  if (readiness(quote, data, s).blockers.length) throw new Error('Document is not ready');
  const r = quote.result!, zones = quote.zones!;
  const issueDate = data.issueDate ?? dateInZone(quote.calculation.calculatedAt as string, timezone);
  const validityDays = data.validityDays ?? s.validityDays;
  const until = new Date(`${issueDate}T00:00:00Z`); until.setUTCDate(until.getUTCDate() + validityDays);
  const validUntil = until.toISOString().slice(0, 10);
  const totalCents = Math.round(round(r.pricing.offeredPrice, 2) * 100);
  const vatRate = quote.snapshot!.parameters.vatRate;
  const vatCents = Number((BigInt(totalCents) * BigInt(Math.round(vatRate * 1e6)) + 500000n) / 1000000n);
  const allocated = allocateCents(totalCents, r.zones.map(z => z.totalCost));
  const floor = area(r.totals.floorArea);
  const countText = `${zones.length} ${zones.length === 1 ? 'zona' : 'zonas'}`;
  const details = r.technicalOffer.map((t, i) => ({ zone: t.name, zoneType: t.zoneTypeName, risk: risks[t.risk!], floorArea: area(zones[i].floorArea!), schedule: t.scheduleName, daysPerMonth: zones[i].daysPerMonth!, frequency: `Cada ${flexible(t.hoursBetweenCleanings)} h · ${formatted(t.cleaningsPerDay, 0)} por día`, terminalsPerMonth: flexible(t.terminalsPerMonth) }));
  const products = r.technicalOffer.flatMap(t => [t.cleaningProduct, t.dailyDisinfectant, t.terminalDisinfectant]);
  const productTexts = [...new Map(products.map(p => [`${p.name}|${p.dosePerLiter}|${p.doseUnit}`, p])).values()].sort((a, b) => a.name.localeCompare(b.name, 'es')).map(p => `${p.name} (${flexible(p.dosePerLiter)} ${p.doseUnit} por litro de agua)`);
  const contract = data.contractMonths === null ? null : { months: data.contractMonths, label: `Valor del contrato por ${data.contractMonths} meses (sin IVA)`, subtotal: money(totalCents * data.contractMonths) };
  const conditions = [
    { label: 'Validez de la oferta', text: [`${validityDays} días, hasta el ${dateText(validUntil)}.`] },
    { label: 'Forma de pago', text: paragraphs((data.paymentTerms || s.paymentTerms)!) },
    { label: 'Moneda e impuestos', text: ['Valores en dólares de los Estados Unidos de América (USD). Los precios unitarios y el subtotal no incluyen IVA.'] },
    ...(contract ? [{ label: 'Duración del contrato', text: [`${contract.months} meses.`] }] : []),
    ...(s.termsText ? [{ label: 'Términos generales', text: paragraphs(s.termsText) }] : []),
  ];
  return {
    metadata: { subject: quote.name, issueInstant: midnightInZone(issueDate, timezone) },
    templateVersion: 2, number, revision, title: 'COTIZACIÓN', numberText: `N.º ${number}${revision > 1 ? ` · Rev. ${revision}` : ''}`,
    issueDate, issueDateText: dateText(issueDate), validUntil, validUntilText: dateText(validUntil), validityDays, paperSize: s.paperSize,
    logo: logo && { sha256: logo.sha256, contentType: logo.contentType, width: logo.width, height: logo.height }, colors: documentColors(s.brandColor),
    issuer: { tradeName: s.tradeName, lines: [s.legalName!, `RUC ${s.taxId}`, joined([s.address, s.city], ', '), joined([s.phone, s.email, s.website])].filter(Boolean) },
    client: { legalName: data.clientLegalName!, lines: [data.clientLegalName!, data.clientTaxId ? `RUC / identificación: ${data.clientTaxId}` : null, `Atención: ${joined([data.clientContactName, data.clientContactTitle], ', ')}`, joined([data.clientEmail, data.clientPhone]), data.clientAddress].filter((v): v is string => !!v) },
    service: { lines: [`Instalación: ${quote.name}`, quote.installationType ? `Tipo: ${installation[quote.installationType as string]}` : null, quote.city ? `Ciudad: ${quote.city as string}` : null, `Superficie total: ${floor.text} m² en ${countText}`, quote.visitDate ? `Visita técnica: ${dateText(quote.visitDate as string)}` : null].filter((v): v is string => !!v), totalFloorArea: floor, zoneCount: zones.length },
    introText: s.introText,
    lines: data.lineMode === 'single' ? [{ position: 1, description: `Servicio de limpieza y desinfección: ${quote.name}`, detail: `${countText} · ${floor.text} m² · Según el alcance del servicio`, quantity: 1, unit: 'Mes', unitPrice: money(totalCents), amount: money(totalCents) }] : details.map((t, i) => ({ position: i + 1, description: `Limpieza y desinfección: ${t.zone}`, detail: `${t.zoneType} · Riesgo ${t.risk} · ${t.floorArea.text} m² · ${t.schedule} · ${flexible(t.daysPerMonth)} días/mes`, quantity: 1, unit: 'Mes', unitPrice: money(allocated[i]), amount: money(allocated[i]) })),
    subtotal: money(totalCents), vatLabel: `IVA ${flexible(vatRate * 100)} %`, vatRate, vat: money(vatCents), total: money(totalCents + vatCents), totalLabel: 'TOTAL MENSUAL',
    amountInWords: `Son: ${numberToSpanishWords(Math.floor((totalCents + vatCents) / 100))} con ${String((totalCents + vatCents) % 100).padStart(2, '0')}/100 dólares`, contract,
    scope: { columns: ['Zona', 'Tipo de zona', 'Riesgo', 'Superficie (m²)', 'Horario', 'Días por mes', 'Frecuencia', 'Limpiezas terminales por mes'], rows: details, productsText: `Productos: ${productTexts.join(', ')}` }, conditions,
    clientNotes: data.clientNotes ? paragraphs(data.clientNotes) : null,
    acceptance: { issuer: s.signerName ? [s.signerName, s.signerTitle, s.legalName].filter((v): v is string => !!v) : [s.legalName!], client: [`Aceptado por: ${data.clientLegalName}`, 'Nombre, firma y fecha'] },
    ...(signature ? { signature: { signerName: signature.signerName, certificateSha256: signature.certificateSha256, reason: `Cotización ${number}`, location: s.city } } : {}),
    footer: `${s.tradeName} · ${number} Rev. ${revision}`,
    fileBaseName: `Cotizacion-${number}-${Array.from(quote.name.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '')).slice(0, 60).join('')}${revision > 1 ? `-Rev${revision}` : ''}`,
  };
}
// Resolve metadata in the builder too. Two offset passes cover DST changes at the chosen date.
function midnightInZone(date: string, timezone: string): string {
  const target = Date.parse(`${date}T00:00:00Z`);
  let instant = target;
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(formatter.formatToParts(instant).map(p => [p.type, p.value]));
    const local = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    instant += target - local;
  }
  return new Date(instant).toISOString();
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function documentHash(document: QuoteDocument): string {
  const { revision: _revision, numberText: _numberText, footer: _footer, fileBaseName: _fileBaseName, ...content } = document;
  return createHash('sha256').update(canonicalJson(content)).digest('hex');
}
