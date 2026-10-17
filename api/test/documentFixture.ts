import fs from 'node:fs';
import { openDatabase } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrate.ts';
import { allSettings } from '../src/modules/quotes/settings.ts';
import { computeQuote } from '../src/modules/quotes/engine/index.ts';
import { type QuoteRecord } from '../src/modules/quoteDocuments/builder.ts';
import { readLogo, type LogoInfo } from '../src/modules/quoteDocuments/logo.ts';
import { documentRepository } from '../src/modules/quoteDocuments/repository.ts';
import { emptyData, type QuoteDocumentData, type QuoteDocumentSettings } from '../src/modules/quoteDocuments/schemas.ts';
import type { ZoneInput } from '../src/modules/quotes/types.ts';

export function documentFixture(manualPrice: number | null = null) {
  const db = openDatabase(':memory:'); migrate(db);
  const snapshot = allSettings(db);
  const zones = JSON.parse(fs.readFileSync(new URL('./fixtures/quote-engine/clinic.json', import.meta.url), 'utf8')).zones as ZoneInput[];
  const result = computeQuote({ ...snapshot, zones, quote: { manualPrice, assumptionsConfirmed: true, externalReferencePrice: 3500 } });
  const quote = { id: 7, name: 'Clínica de prueba', installationType: 'privateHospital', city: 'Guayaquil', visitDate: '2026-10-16', status: result.status, calculation: { state: 'done', isCurrent: true, isStale: false, calculatedAt: '2026-10-16T04:30:00Z' }, zones, result, snapshot } as QuoteRecord;
  const parties = JSON.parse(fs.readFileSync(new URL('./fixtures/quote-document/parties.json', import.meta.url), 'utf8'));
  const settings: QuoteDocumentSettings = { ...documentRepository(db).settings(), ...parties.issuer };
  const data: QuoteDocumentData = { ...emptyData, ...parties.client };
  // The fixture company's logo; set both to null for a company without one.
  const logoData = fs.readFileSync(new URL('./fixtures/quote-document/logo.png', import.meta.url));
  db.close();
  return { quote, settings, data, number: 'COT-00007', revision: 1, timezone: 'America/Guayaquil', logo: readLogo(logoData) as LogoInfo | null, logoData: logoData as Buffer | null };
}
