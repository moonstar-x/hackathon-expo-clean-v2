import { readFileSync } from 'node:fs';
import { createMeasurementsRepository } from '../modules/measurements/repository.js';
import { validateUpload } from '../modules/measurements/schemas.js';
import { createCategoriesRepository } from '../modules/categories/repository.js';
import { createProductsRepository } from '../modules/products/repository.js';
import { createStockMovementsRepository } from '../modules/stockMovements/repository.js';
import { createSuppliersRepository } from '../modules/suppliers/repository.js';

const CATEGORIES = [
  { name: 'Disinfectants', description: 'Products that kill bacteria and viruses on surfaces' },
  { name: 'Detergents & Degreasers', description: 'Cleaning agents for grease, oil and general soil' },
  { name: 'Floor Care', description: 'Floor cleaners, finishes and waxes' },
  { name: 'Glass & Surface Cleaners', description: 'Streak-free glass and multi-surface sprays' },
  { name: 'Paper & Disposables', description: 'Toilet paper, towels, trash bags' },
  { name: 'Personal Protective Equipment', description: 'Gloves, goggles and other PPE' },
  { name: 'Tools & Equipment', description: 'Mops, cloths, bottles and other reusable tools' },
];

const SUPPLIERS = [
  {
    name: 'Acme Cleaning Supplies',
    contactName: 'Dana Whitfield',
    email: 'orders@acme-cleaning.example',
    phone: '+1 555-0101',
    notes: 'General supplies. Delivers Tuesdays and Fridays.',
  },
  {
    name: 'Sparkle Chemicals Co.',
    contactName: 'Marco Ruiz',
    email: 'sales@sparkle-chem.example',
    phone: '+1 555-0142',
    notes: 'Chemical products. SDS sheets available on request.',
  },
  {
    name: 'PaperWorks Ltd.',
    contactName: 'Priya Natarajan',
    email: 'hello@paperworks.example',
    phone: '+1 555-0188',
    notes: null,
  },
];

const SDS = 'https://example.com/sds';

// [category, supplier, product fields]
const PRODUCTS = [
  ['Disinfectants', 'Sparkle Chemicals Co.', { sku: 'DIS-BLEACH-5', name: 'Sodium hypochlorite bleach 5%', description: 'General-purpose disinfectant, sold in 5 L jugs', unit: 'L', initialQuantity: 60, reorderLevel: 20, unitCost: 1.35, location: 'Warehouse A / Shelf 2', hazardous: true, sdsUrl: `${SDS}/bleach.pdf` }],
  ['Disinfectants', 'Sparkle Chemicals Co.', { sku: 'DIS-QUAT-1', name: 'Quaternary ammonium disinfectant', description: 'Concentrate, dilute 1:64', unit: 'L', initialQuantity: 25, reorderLevel: 10, unitCost: 4.8, location: 'Warehouse A / Shelf 2', hazardous: true, sdsUrl: `${SDS}/quat.pdf` }],
  ['Disinfectants', 'Sparkle Chemicals Co.', { sku: 'DIS-PHENOL-OLD', name: 'Phenolic disinfectant (discontinued)', description: 'Replaced by the quaternary ammonium disinfectant', unit: 'L', initialQuantity: 4, reorderLevel: 0, unitCost: 5.1, location: 'Warehouse A / Shelf 9', hazardous: true, active: false }],
  ['Detergents & Degreasers', 'Sparkle Chemicals Co.', { sku: 'DET-DEGR-HD', name: 'Heavy-duty degreaser', description: 'Alkaline degreaser for kitchens and workshops', unit: 'L', initialQuantity: 30, reorderLevel: 10, unitCost: 3.2, location: 'Warehouse A / Shelf 3', hazardous: true, sdsUrl: `${SDS}/degreaser.pdf` }],
  ['Detergents & Degreasers', 'Acme Cleaning Supplies', { sku: 'DET-POWDER-KG', name: 'Powder detergent', description: 'Laundry and general cleaning powder', unit: 'kg', initialQuantity: 50, reorderLevel: 15, unitCost: 2.1, location: 'Warehouse A / Shelf 4' }],
  ['Floor Care', 'Acme Cleaning Supplies', { sku: 'FLR-NEUTRAL', name: 'Neutral floor cleaner', description: 'pH-neutral, safe for sealed floors', unit: 'L', initialQuantity: 40, reorderLevel: 15, unitCost: 2.45, location: 'Warehouse A / Shelf 5' }],
  ['Floor Care', 'Acme Cleaning Supplies', { sku: 'FLR-WAX-GAL', name: 'Floor wax', description: 'High-gloss floor finish', unit: 'gal', initialQuantity: 8, reorderLevel: 3, unitCost: 18.9, location: 'Warehouse A / Shelf 5' }],
  ['Glass & Surface Cleaners', 'Sparkle Chemicals Co.', { sku: 'GLS-CLEAN', name: 'Glass cleaner', description: 'Ammonia-free, streak-free', unit: 'L', initialQuantity: 20, reorderLevel: 8, unitCost: 1.9, location: 'Warehouse A / Shelf 6' }],
  ['Glass & Surface Cleaners', 'Sparkle Chemicals Co.', { sku: 'SRF-MULTI', name: 'All-purpose surface cleaner', description: null, unit: 'L', initialQuantity: 24, reorderLevel: 10, unitCost: 2.3, location: 'Warehouse A / Shelf 6' }],
  ['Paper & Disposables', 'PaperWorks Ltd.', { sku: 'PAP-TP-ROLL', name: 'Toilet paper', description: '2-ply, 500 sheets per roll', unit: 'roll', initialQuantity: 96, reorderLevel: 48, unitCost: 0.42, location: 'Warehouse B / Bay 1' }],
  ['Paper & Disposables', 'PaperWorks Ltd.', { sku: 'PAP-TOWEL-PK', name: 'Paper towels', description: 'Multifold, 16 sleeves per pack', unit: 'pack', initialQuantity: 40, reorderLevel: 12, unitCost: 6.5, location: 'Warehouse B / Bay 1' }],
  ['Paper & Disposables', 'PaperWorks Ltd.', { sku: 'PAP-BAG-30', name: '30-gal trash bags', description: '100 bags per box', unit: 'box', initialQuantity: 12, reorderLevel: 4, unitCost: 14.75, location: 'Warehouse B / Bay 2' }],
  ['Personal Protective Equipment', 'Acme Cleaning Supplies', { sku: 'PPE-GLOVE-M', name: 'Nitrile gloves M', description: '100 gloves per box', unit: 'box', initialQuantity: 20, reorderLevel: 6, unitCost: 8.99, location: 'Warehouse A / Shelf 1' }],
  ['Personal Protective Equipment', 'Acme Cleaning Supplies', { sku: 'PPE-GOGGLES', name: 'Safety goggles', description: 'Anti-fog, splash resistant', unit: 'pair', initialQuantity: 10, reorderLevel: 4, unitCost: 5.25, location: 'Warehouse A / Shelf 1' }],
  ['Tools & Equipment', 'Acme Cleaning Supplies', { sku: 'TLS-MICRO-PK', name: 'Microfiber cloths', description: '12 cloths per pack, color-coded', unit: 'pack', initialQuantity: 15, reorderLevel: 5, unitCost: 7.8, location: 'Warehouse A / Shelf 7' }],
  ['Tools & Equipment', 'Acme Cleaning Supplies', { sku: 'TLS-MOP-HEAD', name: 'Mop heads', description: 'Looped-end cotton blend', unit: 'unit', initialQuantity: 12, reorderLevel: 6, unitCost: 4.6, location: 'Warehouse A / Shelf 7' }],
  ['Tools & Equipment', 'Acme Cleaning Supplies', { sku: 'TLS-SPRAY-1L', name: 'Spray bottles 1 L', description: 'Chemical-resistant with trigger', unit: 'unit', initialQuantity: 30, reorderLevel: 10, unitCost: 1.15, location: 'Warehouse A / Shelf 8' }],
];

// [sku, type, quantity, reason, reference]
const MOVEMENTS = [
  ['DIS-BLEACH-5', 'OUT', 15, 'Used at Office Tower job', 'WO-1042'],
  ['FLR-NEUTRAL', 'OUT', 18, 'Used at Office Tower job', 'WO-1042'],
  ['PAP-TP-ROLL', 'OUT', 60, 'Used at Office Tower job', 'WO-1042'],
  ['DIS-QUAT-1', 'OUT', 18, 'Hospital wing deep clean', 'WO-1043'],
  ['PPE-GLOVE-M', 'OUT', 4, 'Hospital wing deep clean', 'WO-1043'],
  ['DIS-BLEACH-5', 'OUT', 10, 'Hospital wing deep clean', 'WO-1043'],
  ['DET-DEGR-HD', 'OUT', 6, 'Restaurant kitchen clean', 'WO-1044'],
  ['DET-POWDER-KG', 'OUT', 12.5, 'Laundry run', 'WO-1044'],
  ['FLR-NEUTRAL', 'OUT', 12, 'School weekend floor care', 'WO-1045'],
  ['FLR-WAX-GAL', 'OUT', 2, 'School weekend floor care', 'WO-1045'],
  ['PAP-TP-ROLL', 'OUT', 36, 'School restocking', 'WO-1045'],
  ['PAP-BAG-30', 'OUT', 9, 'Monthly bag rotation', 'WO-1046'],
  ['GLS-CLEAN', 'OUT', 5, 'Storefront windows', 'WO-1047'],
  ['PAP-TOWEL-PK', 'OUT', 8, 'Office restocking', 'WO-1047'],
  ['TLS-MOP-HEAD', 'OUT', 7, 'Worn mop heads discarded', null],
  ['SRF-MULTI', 'ADJUSTMENT', 22.5, 'Monthly physical count', 'COUNT-2026-10'],
];

/**
 * Seeds demo data if the products table is empty. All stock goes through the
 * movement ledger so the §5.6 invariants hold.
 * @returns {{ seeded: boolean, categories?: number, suppliers?: number, products?: number, movements?: number }}
 */
export function seed(db, { createdBy }) {
  seedMeasurement(db, createdBy);
  if (db.prepare('SELECT COUNT(*) FROM products').pluck().get() > 0) return { seeded: false };

  const categories = createCategoriesRepository(db);
  const suppliers = createSuppliersRepository(db);
  const products = createProductsRepository(db);
  const movements = createStockMovementsRepository(db);
  const ctx = { user: { email: createdBy } };

  return db.transaction(() => {
    const categoryIds = new Map();
    for (const c of CATEGORIES) {
      const existing = db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE').pluck().get(c.name);
      categoryIds.set(c.name, existing ?? categories.create(c).id);
    }
    const supplierIds = new Map();
    for (const s of SUPPLIERS) {
      const existing = db.prepare('SELECT id FROM suppliers WHERE name = ? COLLATE NOCASE').pluck().get(s.name);
      supplierIds.set(s.name, existing ?? suppliers.create(s).id);
    }

    const productIds = new Map();
    for (const [category, supplier, fields] of PRODUCTS) {
      const product = products.create(
        {
          description: null,
          location: null,
          hazardous: false,
          sdsUrl: null,
          active: true,
          ...fields,
          categoryId: categoryIds.get(category),
          supplierId: supplierIds.get(supplier),
        },
        ctx,
      );
      productIds.set(product.sku, product.id);
    }

    for (const [sku, type, quantity, reason, reference] of MOVEMENTS) {
      movements.record({ productId: productIds.get(sku), type, quantity, reason, reference }, createdBy);
    }

    return {
      seeded: true,
      categories: CATEGORIES.length,
      suppliers: SUPPLIERS.length,
      products: PRODUCTS.length,
      movements: db.prepare('SELECT COUNT(*) FROM stock_movements').pluck().get(),
    };
  })();
}

/** Independent from inventory seeding, so an existing installation also gets a sample. */
function seedMeasurement(db, email) {
  if (db.prepare('SELECT COUNT(*) FROM measurements').pluck().get()) return;
  const directory = new URL('./fixtures/sample-measurement/', import.meta.url);
  const files = Object.fromEntries([['geometry', 'geometry.json'], ['floorPlan', 'floor-plan.png'], ['thumbnail', 'thumbnail.png']].map(([kind, name]) => [kind, [{ buffer: readFileSync(new URL(name, directory)) }]]));
  const metadata = validateUpload(JSON.parse(readFileSync(new URL('metadata.json', directory), 'utf8')), files);
  const user = db.prepare('SELECT id, email FROM users WHERE email = ? COLLATE NOCASE').get(email) ?? { id: null, email };
  createMeasurementsRepository(db, { publicUrl: 'http://localhost' }).upload(metadata, files, user);
}
