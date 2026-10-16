import { z } from 'zod';
import { COST_DECIMALS, QUANTITY_DECIMALS } from '../../lib/numbers.ts';
import { bool, decimal, foreignId, nullableHttpUrl, nullableText, requiredText } from '../../lib/validation.ts';

export const UNITS = ['unit', 'box', 'pack', 'roll', 'pair', 'L', 'mL', 'gal', 'kg', 'g'] as const;
export type Unit = (typeof UNITS)[number];

export const PRODUCT_FIELDS = [
  'sku',
  'name',
  'description',
  'categoryId',
  'supplierId',
  'unit',
  'reorderLevel',
  'unitCost',
  'location',
  'hazardous',
  'sdsUrl',
  'active',
] as const;

const productShape = {
  sku: requiredText(50)
    .regex(/^[A-Za-z0-9._-]+$/, 'May only contain letters, digits, ".", "_" and "-"')
    .transform((s) => s.toUpperCase()),
  name: requiredText(150),
  description: nullableText(1000),
  categoryId: foreignId(),
  supplierId: foreignId()
    .nullish()
    .transform((v) => v ?? null),
  unit: z.enum(UNITS, {
    error: (iss) => (iss.input == null ? 'Required' : `Must be one of: ${UNITS.join(', ')}`),
  }),
  reorderLevel: decimal(QUANTITY_DECIMALS),
  unitCost: decimal(COST_DECIMALS).default(0),
  location: nullableText(100),
  hazardous: bool().default(false),
  sdsUrl: nullableHttpUrl(500),
  active: bool().default(true),
};

/** POST body. `initialQuantity` is create-only and becomes an IN movement. */
export const productCreateSchema = z.object({
  ...productShape,
  initialQuantity: decimal(QUANTITY_DECIMALS).default(0),
});

/** Merged PUT record. `quantity` is never writable. */
export const productUpdateSchema = z.object(productShape);

export type ProductCreateInput = z.output<typeof productCreateSchema>;
export type ProductUpdateInput = z.output<typeof productUpdateSchema>;
