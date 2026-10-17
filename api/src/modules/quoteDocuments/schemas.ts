import { z } from 'zod';
import { nullableText, nullableEmail, nullableHttpUrl, requiredOr, requiredText } from '../../lib/validation.ts';
import { NOT_P12, SIGNATURE_MAX_BYTES } from './signature.ts';

const phone = () => nullableText(30).refine(v => v === null || /^[0-9+() -]+$/.test(v), 'Must be a valid phone');
const days = z.number().int().min(1).max(365);
const hexColor = 'Must be a hex color like #4F46E5';
export const settingsSchema = z.object({
  tradeName: requiredText(100), legalName: nullableText(150),
  taxId: nullableText(13).refine(v => v === null || /^\d{13}$/.test(v), 'Must be exactly 13 digits'),
  address: nullableText(200), city: nullableText(100), phone: phone(), email: nullableEmail(), website: nullableHttpUrl(200),
  signerName: nullableText(100), signerTitle: nullableText(100), numberPrefix: z.string().regex(/^[A-Z0-9]{1,10}$/),
  validityDays: days, paymentTerms: nullableText(500), introText: nullableText(1000), termsText: nullableText(4000), paperSize: z.enum(['A4', 'LETTER']),
  brandColor: z.string({ error: hexColor }).regex(/^#[0-9a-fA-F]{6}$/, hexColor).transform(v => v.toUpperCase()),
});
export const dataSchema = z.object({
  clientLegalName: nullableText(150), clientTaxId: nullableText(20).refine(v => v === null || /^[A-Za-z0-9-]+$/.test(v), 'Must be a valid identification'),
  clientContactName: nullableText(100), clientContactTitle: nullableText(100), clientEmail: nullableEmail(), clientPhone: phone(), clientAddress: nullableText(200),
  issueDate: nullableText(10).refine(v => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v), 'Must be a valid date'),
  validityDays: days.nullable(), paymentTerms: nullableText(500), clientNotes: nullableText(2000), lineMode: z.enum(['perZone', 'single']), contractMonths: z.number().int().min(1).max(60).nullable(),
});
// The .p12 travels as base64 in JSON beside its password; at most SIGNATURE_MAX_BYTES (64 KB) once decoded.
export const signatureUploadSchema = z.object({
  file: z.string({ error: requiredOr(NOT_P12) }).max(Math.ceil(SIGNATURE_MAX_BYTES / 3) * 4, 'Must be at most 64 KB').regex(/^[A-Za-z0-9+/]+={0,2}$/, NOT_P12),
  password: z.string({ error: requiredOr('Must be a string') }).max(256, 'Must be at most 256 characters'),
});
export type QuoteDocumentSettings = z.infer<typeof settingsSchema> & { id: 1; updatedBy: string | null; updatedAt: string };
export type QuoteDocumentData = z.infer<typeof dataSchema> & { number: string | null };
export const emptyData: QuoteDocumentData = { clientLegalName: null, clientTaxId: null, clientContactName: null, clientContactTitle: null, clientEmail: null, clientPhone: null, clientAddress: null, issueDate: null, validityDays: null, paymentTerms: null, clientNotes: null, lineMode: 'perZone', contractMonths: null, number: null };
