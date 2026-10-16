import { z } from 'zod';
import { nullableText, requiredText } from '../../lib/validation.ts';

export const CATEGORY_FIELDS = ['name', 'description'] as const;

export const categorySchema = z.object({
  name: requiredText(100),
  description: nullableText(500),
});

export type CategoryInput = z.output<typeof categorySchema>;
