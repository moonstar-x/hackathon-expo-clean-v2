import { z } from 'zod';
import { nullableEmail, nullableText, requiredText } from '../../lib/validation.js';

export const SUPPLIER_FIELDS = ['name', 'contactName', 'email', 'phone', 'notes'];

export const supplierSchema = z.object({
  name: requiredText(150),
  contactName: nullableText(150),
  email: nullableEmail(254),
  phone: nullableText(50),
  notes: nullableText(1000),
});
