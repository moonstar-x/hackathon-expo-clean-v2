// The API's records, as SPEC-002 §5 and SPEC-003 describe them. Duplicated on purpose: the admin
// shares no code with the API.

export type Unit = 'unit' | 'box' | 'pack' | 'roll' | 'pair' | 'L' | 'mL' | 'gal' | 'kg' | 'g';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

/** Where a product's stock stands against its reorder level; derived in utils/products.ts. */
export type StockStatus = 'outOfStock' | 'lowStock' | 'inStock';

export interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number;
  supplierId: number | null;
  unit: Unit;
  /** Read-only: changed only by stock movements. */
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  location: string | null;
  hazardous: boolean;
  sdsUrl: string | null;
  active: boolean;
  /** Computed: quantity <= reorderLevel. */
  isLowStock: boolean;
  /** Computed: quantity × unitCost, rounded to 2 decimals. */
  stockValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  type: MovementType;
  /** IN/OUT: amount moved. ADJUSTMENT: counted quantity on hand. */
  quantity: number;
  delta: number;
  balanceAfter: number;
  reason: string | null;
  reference: string | null;
  createdBy: string;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  products: { total: number; active: number; lowStock: number; outOfStock: number };
  stockValue: number;
  movementsLast30Days: Record<MovementType, number>;
}

/** The error body every API endpoint answers with. */
export interface ApiErrorBody {
  code?: unknown;
  message?: unknown;
  errors?: Record<string, unknown>;
}
