import { z } from 'zod';
import { nullableEmail, nullableText, requiredText } from '../../lib/validation.ts';

export const SUPPLIER_FIELDS = ['name', 'contactName', 'email', 'phone', 'notes'] as const;

export const supplierSchema = z.object({
  name: requiredText(150),
  contactName: nullableText(150),
  email: nullableEmail(254),
  phone: nullableText(50),
  notes: nullableText(1000),
});

export type SupplierInput = z.output<typeof supplierSchema>;
