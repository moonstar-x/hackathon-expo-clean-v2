import pino from 'pino';
import { createQuoteWorker } from '../modules/quotes/worker.ts';
import { readFileSync } from 'node:fs';
import type Database from 'better-sqlite3';
import { createCategoriesRepository } from '../modules/categories/repository.ts';
import { createMeasurementsRepository } from '../modules/measurements/repository.ts';
import { type UploadedFiles, validateUpload } from '../modules/measurements/schemas.ts';
import { createProductsRepository } from '../modules/products/repository.ts';
import type { ProductCreateInput } from '../modules/products/schemas.ts';
import { createStockMovementsRepository } from '../modules/stockMovements/repository.ts';
import type { MovementType } from '../modules/stockMovements/schemas.ts';
import { createSuppliersRepository } from '../modules/suppliers/repository.ts';
import type { SupplierInput } from '../modules/suppliers/schemas.ts';

const CATEGORIES = [
  { name: 'Desinfectantes', description: 'Productos que eliminan bacterias y virus en superficies' },
  { name: 'Detergentes y Desengrasantes', description: 'Agentes de limpieza para grasa, aceite y suciedad general' },
  { name: 'Cuidado de Pisos', description: 'Limpiadores, acabados y ceras para pisos' },
  { name: 'Limpiadores de Vidrios y Superficies', description: 'Aerosoles sin marcas para vidrios y multisuperficies' },
  { name: 'Papel y Desechables', description: 'Papel higiénico, toallas, bolsas de basura' },
  { name: 'Equipo de Protección Personal', description: 'Guantes, gafas y otro EPP' },
  { name: 'Herramientas y Equipos', description: 'Trapeadores, paños, botellas y otras herramientas reutilizables' },
];

const SUPPLIERS: SupplierInput[] = [
  {
    name: 'Suministros de Limpieza Andes Cía. Ltda.',
    contactName: 'Daniela Vélez',
    email: 'pedidos@limpiezaandes.example',
    phone: '+593 2 256-0101',
    notes: 'Suministros generales. Entrega los martes y viernes.',
  },
  {
    name: 'Químicos Brillo del Ecuador S.A.',
    contactName: 'Marco Andrade',
    email: 'ventas@quimicosbrillo.example',
    phone: '+593 4 268-0142',
    notes: 'Productos químicos. Hojas de datos de seguridad (HDS) disponibles a solicitud.',
  },
  {
    name: 'Papelera Equinoccial Cía. Ltda.',
    contactName: 'Priscila Narváez',
    email: 'hola@papeleraequinoccial.example',
    phone: '+593 2 290-0188',
    notes: null,
  },
];

const SDS = 'https://example.com/sds';

/** Product fields without the references; the optional ones get defaults in `seed`. */
type SeedProduct = Omit<ProductCreateInput, 'categoryId' | 'supplierId' | OptionalField> &
  Partial<Pick<ProductCreateInput, OptionalField>>;
type OptionalField = 'description' | 'location' | 'hazardous' | 'sdsUrl' | 'active';

const PRODUCTS: [category: string, supplier: string, fields: SeedProduct][] = [
  ['Desinfectantes', 'Químicos Brillo del Ecuador S.A.', { sku: 'DIS-BLEACH-5', name: 'Hipoclorito de sodio 5%', description: 'Desinfectante de uso general, en bidones de 5 L', unit: 'L', initialQuantity: 60, reorderLevel: 20, unitCost: 1.35, location: 'Bodega A / Estante 2', hazardous: true, sdsUrl: `${SDS}/bleach.pdf` }],
  ['Desinfectantes', 'Químicos Brillo del Ecuador S.A.', { sku: 'DIS-QUAT-1', name: 'Desinfectante de amonio cuaternario', description: 'Concentrado, diluir 1:64', unit: 'L', initialQuantity: 25, reorderLevel: 10, unitCost: 4.8, location: 'Bodega A / Estante 2', hazardous: true, sdsUrl: `${SDS}/quat.pdf` }],
  ['Desinfectantes', 'Químicos Brillo del Ecuador S.A.', { sku: 'DIS-PHENOL-OLD', name: 'Desinfectante fenólico (descontinuado)', description: 'Reemplazado por el desinfectante de amonio cuaternario', unit: 'L', initialQuantity: 4, reorderLevel: 0, unitCost: 5.1, location: 'Bodega A / Estante 9', hazardous: true, active: false }],
  ['Detergentes y Desengrasantes', 'Químicos Brillo del Ecuador S.A.', { sku: 'DET-DEGR-HD', name: 'Desengrasante de alta potencia', description: 'Desengrasante alcalino para cocinas y talleres', unit: 'L', initialQuantity: 30, reorderLevel: 10, unitCost: 3.2, location: 'Bodega A / Estante 3', hazardous: true, sdsUrl: `${SDS}/degreaser.pdf` }],
  ['Detergentes y Desengrasantes', 'Suministros de Limpieza Andes Cía. Ltda.', { sku: 'DET-POWDER-KG', name: 'Detergente en polvo', description: 'Polvo para lavandería y limpieza general', unit: 'kg', initialQuantity: 50, reorderLevel: 15, unitCost: 2.1, location: 'Bodega A / Estante 4' }],
  ['Cuidado de Pisos', 'Suministros de Limpieza Andes Cía. Ltda.', { sku: 'FLR-NEUTRAL', name: 'Limpiador de pisos neutro', description: 'pH neutro, seguro para pisos sellados', unit: 'L', initialQuantity: 40, reorderLevel: 15, unitCost: 2.45, location: 'Bodega A / Estante 5' }],
  ['Cuidado de Pisos', 'Suministros de Limpieza Andes Cía. Ltda.', { sku: 'FLR-WAX-GAL', name: 'Cera para pisos', description: 'Acabado de pisos de alto brillo', unit: 'gal', initialQuantity: 8, reorderLevel: 3, unitCost: 18.9, location: 'Bodega A / Estante 5' }],
  ['Limpiadores de Vidrios y Superficies', 'Químicos Brillo del Ecuador S.A.', { sku: 'GLS-CLEAN', name: 'Limpiavidrios', description: 'Sin amoníaco, sin marcas', unit: 'L', initialQuantity: 20, reorderLevel: 8, unitCost: 1.9, location: 'Bodega A / Estante 6' }],
  ['Limpiadores de Vidrios y Superficies', 'Químicos Brillo del Ecuador S.A.', { sku: 'SRF-MULTI', name: 'Limpiador de superficies multiusos', description: null, unit: 'L', initialQuantity: 24, reorderLevel: 10, unitCost: 2.3, location: 'Bodega A / Estante 6' }],
  ['Papel y Desechables', 'Papelera Equinoccial Cía. Ltda.', { sku: 'PAP-TP-ROLL', name: 'Papel higiénico', description: 'Doble hoja, 500 hojas por rollo', unit: 'roll', initialQuantity: 96, reorderLevel: 48, unitCost: 0.42, location: 'Bodega B / Bahía 1' }],
  ['Papel y Desechables', 'Papelera Equinoccial Cía. Ltda.', { sku: 'PAP-TOWEL-PK', name: 'Toallas de papel', description: 'Toallas interdobladas, 16 paquetes por fardo', unit: 'pack', initialQuantity: 40, reorderLevel: 12, unitCost: 6.5, location: 'Bodega B / Bahía 1' }],
  ['Papel y Desechables', 'Papelera Equinoccial Cía. Ltda.', { sku: 'PAP-BAG-30', name: 'Bolsas de basura de 30 gal', description: '100 bolsas por caja', unit: 'box', initialQuantity: 12, reorderLevel: 4, unitCost: 14.75, location: 'Bodega B / Bahía 2' }],
  ['Equipo de Protección Personal', 'Suministros de Limpieza Andes Cía. Ltda.', { sku: 'PPE-GLOVE-M', name: 'Guantes de nitrilo M', description: '100 guantes por caja', unit: 'box', initialQuantity: 20, reorderLevel: 6, unitCost: 8.99, location: 'Bodega A / Estante 1' }],
  ['Equipo de Protección Personal', 'Suministros de Limpieza Andes Cía. Ltda.', { sku: 'PPE-GOGGLES', name: 'Gafas de seguridad', description: 'Antiempañantes, resistentes a salpicaduras', unit: 'pair', initialQuantity: 10, reorderLevel: 4, unitCost: 5.25, location: 'Bodega A / Estante 1' }],
  ['Herramientas y Equipos', 'Suministros de Limpieza Andes Cía. Ltda.', { sku: 'TLS-MICRO-PK', name: 'Paños de microfibra', description: '12 paños por paquete, codificados por color', unit: 'pack', initialQuantity: 15, reorderLevel: 5, unitCost: 7.8, location: 'Bodega A / Estante 7' }],
  ['Herramientas y Equipos', 'Suministros de Limpieza Andes Cía. Ltda.', { sku: 'TLS-MOP-HEAD', name: 'Cabezas de trapeador', description: 'Mezcla de algodón de punta en bucle', unit: 'unit', initialQuantity: 12, reorderLevel: 6, unitCost: 4.6, location: 'Bodega A / Estante 7' }],
  ['Herramientas y Equipos', 'Suministros de Limpieza Andes Cía. Ltda.', { sku: 'TLS-SPRAY-1L', name: 'Botellas rociadoras 1 L', description: 'Resistentes a químicos, con gatillo', unit: 'unit', initialQuantity: 30, reorderLevel: 10, unitCost: 1.15, location: 'Bodega A / Estante 8' }],
];

const MOVEMENTS: [sku: string, type: MovementType, quantity: number, reason: string, reference: string | null][] = [
  ['DIS-BLEACH-5', 'OUT', 15, 'Usado en trabajo de Torre de Oficinas', 'WO-1042'],
  ['FLR-NEUTRAL', 'OUT', 18, 'Usado en trabajo de Torre de Oficinas', 'WO-1042'],
  ['PAP-TP-ROLL', 'OUT', 60, 'Usado en trabajo de Torre de Oficinas', 'WO-1042'],
  ['DIS-QUAT-1', 'OUT', 18, 'Limpieza profunda de ala hospitalaria', 'WO-1043'],
  ['PPE-GLOVE-M', 'OUT', 4, 'Limpieza profunda de ala hospitalaria', 'WO-1043'],
  ['DIS-BLEACH-5', 'OUT', 10, 'Limpieza profunda de ala hospitalaria', 'WO-1043'],
  ['DET-DEGR-HD', 'OUT', 6, 'Limpieza de cocina de restaurante', 'WO-1044'],
  ['DET-POWDER-KG', 'OUT', 12.5, 'Ciclo de lavandería', 'WO-1044'],
  ['FLR-NEUTRAL', 'OUT', 12, 'Cuidado de pisos de fin de semana en escuela', 'WO-1045'],
  ['FLR-WAX-GAL', 'OUT', 2, 'Cuidado de pisos de fin de semana en escuela', 'WO-1045'],
  ['PAP-TP-ROLL', 'OUT', 36, 'Reabastecimiento de escuela', 'WO-1045'],
  ['PAP-BAG-30', 'OUT', 9, 'Rotación mensual de bolsas', 'WO-1046'],
  ['GLS-CLEAN', 'OUT', 5, 'Ventanas de local comercial', 'WO-1047'],
  ['PAP-TOWEL-PK', 'OUT', 8, 'Reabastecimiento de oficina', 'WO-1047'],
  ['TLS-MOP-HEAD', 'OUT', 7, 'Cabezas de trapeador desgastadas descartadas', null],
  ['SRF-MULTI', 'ADJUSTMENT', 22.5, 'Conteo físico mensual', 'COUNT-2026-10'],
];

export interface SeedResult {
  seeded: boolean;
  categories?: number;
  suppliers?: number;
  products?: number;
  movements?: number;
}

/**
 * Seeds demo data if the products table is empty. All stock goes through the
 * movement ledger so the §5.6 invariants hold.
 */
export function seed(db: Database.Database, { createdBy }: { createdBy: string }): SeedResult {
  seedMeasurement(db, createdBy);
  const worker = createQuoteWorker({ db,logger:pino({ level:'silent' }),config:{ quoteWorkerPollMs:1000,quoteJobMaxAttempts:5 } });
  while (worker.processNextJob()) { /* synchronous demo calculation */ }
  const count = (sql: string) => db.prepare<[], number>(sql).pluck().get()!;
  if (count('SELECT COUNT(*) FROM products') > 0) return { seeded: false };

  const categories = createCategoriesRepository(db);
  const suppliers = createSuppliersRepository(db);
  const products = createProductsRepository(db);
  const movements = createStockMovementsRepository(db);
  const ctx = { user: { email: createdBy } };

  const idByName = (table: 'categories' | 'suppliers', name: string) =>
    db.prepare<[string], number>(`SELECT id FROM ${table} WHERE name = ? COLLATE NOCASE`).pluck().get(name);

  return db.transaction((): SeedResult => {
    const categoryIds = new Map<string, number>();
    for (const c of CATEGORIES) {
      const existing = idByName('categories', c.name);
      categoryIds.set(c.name, existing ?? categories.create(c).id);
    }
    const supplierIds = new Map<string, number>();
    for (const s of SUPPLIERS) {
      const existing = idByName('suppliers', s.name);
      supplierIds.set(s.name, existing ?? suppliers.create(s).id);
    }

    const productIds = new Map<string, number>();
    for (const [category, supplier, fields] of PRODUCTS) {
      const product = products.create(
        {
          description: null,
          location: null,
          hazardous: false,
          sdsUrl: null,
          active: true,
          ...fields,
          categoryId: categoryIds.get(category)!,
          supplierId: supplierIds.get(supplier)!,
        },
        ctx,
      );
      productIds.set(product.sku, product.id);
    }

    for (const [sku, type, quantity, reason, reference] of MOVEMENTS) {
      movements.record({ productId: productIds.get(sku)!, type, quantity, reason, reference }, createdBy);
    }

    return {
      seeded: true,
      categories: CATEGORIES.length,
      suppliers: SUPPLIERS.length,
      products: PRODUCTS.length,
      movements: count('SELECT COUNT(*) FROM stock_movements'),
    };
  })();
}

/** Independent from inventory seeding, so an existing installation also gets a sample. */
function seedMeasurement(db: Database.Database, email: string) {
  if (db.prepare<[], number>('SELECT COUNT(*) FROM measurements').pluck().get()) return;
  const directory = new URL('./fixtures/sample-measurement/', import.meta.url);
  const files: UploadedFiles = Object.fromEntries([['geometry', 'geometry.json'], ['floorPlan', 'floor-plan.png'], ['thumbnail', 'thumbnail.png']].map(([kind, name]) => [kind, [{ buffer: readFileSync(new URL(name, directory)) }]]));
  const metadata = validateUpload(JSON.parse(readFileSync(new URL('metadata.json', directory), 'utf8')), files);
  const user = db.prepare<[string], { id: number; email: string }>('SELECT id, email FROM users WHERE email = ? COLLATE NOCASE').get(email) ?? { id: null, email };
  createMeasurementsRepository(db, { publicUrl: 'http://localhost' }).upload(metadata, files, user);
}
