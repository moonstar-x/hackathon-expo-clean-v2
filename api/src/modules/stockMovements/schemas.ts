import { z } from 'zod';
import { QUANTITY_DECIMALS } from '../../lib/numbers.ts';
import { decimal, foreignId, nullableText } from '../../lib/validation.ts';

export const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const movementSchema = z
  .object({
    productId: foreignId(),
    type: z.enum(MOVEMENT_TYPES, {
      error: (iss) => (iss.input == null ? 'Required' : `Must be one of: ${MOVEMENT_TYPES.join(', ')}`),
    }),
    // IN/OUT: amount moved (> 0). ADJUSTMENT: counted quantity on hand (>= 0).
    quantity: decimal(QUANTITY_DECIMALS),
    reason: nullableText(255),
    reference: nullableText(100),
  })
  .superRefine((data, ctx) => {
    if (data.type !== 'ADJUSTMENT' && data.quantity <= 0) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Must be greater than 0' });
    }
  });

export type MovementInput = z.output<typeof movementSchema>;
