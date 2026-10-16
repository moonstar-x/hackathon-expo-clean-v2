import { z } from 'zod';
import { nullableText, requiredText } from '../../lib/validation.js';

export const CATEGORY_FIELDS = ['name', 'description'];

export const categorySchema = z.object({
  name: requiredText(100),
  description: nullableText(500),
});
