import type Database from 'better-sqlite3';
import { conflict, validationError } from '../../lib/errors.ts';
import { documentRepository } from '../quoteDocuments/repository.ts';
import { dataSchema, emptyData } from '../quoteDocuments/schemas.ts';
import { enqueue, replaceZones } from '../quotes/repository.ts';
import { parameters } from '../quotes/settings.ts';
import type { Source, ZoneInput } from '../quotes/types.ts';
import type { TdrRow } from './repository.ts';
import { clip, type TdrExtraction } from './schemas.ts';

const cut = (value: string | null | undefined, max: number) => (value?.trim() ? clip(value.trim(), max) : null);

/** The quote's zones (SPEC-009 §5.4): the document's values, and the parameters' defaults for what it leaves out. */
export function zonesFrom(db: Database.Database, extraction: TdrExtraction): ZoneInput[] {
  const p = parameters(db);
  const active = (table: 'quote_zone_types' | 'quote_schedules', id: number | null) =>
    id !== null && db.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND active = 1`).get(id) ? id : null;
  return extraction.zones.map((z, position): ZoneInput => {
    const sources: Record<string, Source> = {};
    function choose<T>(field: string, value: T | null, fallback: T | null): T | null {
      sources[field] = value !== null ? 'manual' : 'default';
      return value ?? fallback;
    }
    for (const field of ['name', 'floorArea', 'measurementSource', 'observation']) sources[field] = 'manual';
    for (const field of ['toilets', 'urinals', 'sinks', 'machines', 'terminalsPerMonth']) sources[field] = 'default';
    return {
      position, origin: 'manual', roomId: null, name: z.name, floorArea: z.floorArea, wallArea: null, isFloorApproximate: false,
      zoneTypeId: choose('zoneTypeId', active('quote_zone_types', z.zoneTypeId), p.defaultZoneTypeId),
      scheduleId: choose('scheduleId', active('quote_schedules', z.scheduleId), p.defaultScheduleId),
      traffic: choose('traffic', null, p.defaultTraffic),
      daysPerMonth: choose('daysPerMonth', z.daysPerMonth, p.defaultDaysPerMonth),
      fixedPosts: choose('fixedPosts', z.fixedPosts, 0)!,
      terminalsPerMonth: null, machines: 0, freeArea: null, cleanedArea: null, measurementSource: 'estimated', observation: cut(z.notes, 1000),
      toilets: 0, urinals: 0, sinks: 0, fixtureVisitsPerDay: null, minutesPerFixture: null, solutionLitersPerFixture: null, paperSoapMonthly: 0, fixturesExcludeFloor: false,
      sources,
    };
  });
}

/** The quote document's client data; a value the document form would refuse (a malformed email…) is left empty. */
export function documentDataFrom(extraction: TdrExtraction) {
  const c = extraction.client;
  const wanted: Record<string, unknown> = {
    clientLegalName: c.legalName, clientTaxId: c.taxId, clientContactName: c.contactName, clientContactTitle: c.contactTitle,
    clientEmail: c.email, clientPhone: c.phone, clientAddress: c.address, paymentTerms: extraction.paymentTerms,
    contractMonths: extraction.contractMonths,
  };
  const shape = dataSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>;
  return Object.fromEntries(Object.entries(wanted).map(([key, value]) => {
    const parsed = shape[key].safeParse(value ?? null);
    return [key, parsed.success ? parsed.data : null];
  }));
}

/** Creates the quote of a reviewed document in one transaction and returns its id (SPEC-009 §5.4). */
export function createQuoteFromTdr(db: Database.Database, row: TdrRow, user: string): number {
  if (row.status !== 'done' || !row.extraction_json) throw conflict('The document has not been analyzed yet');
  if (row.quote_id !== null) throw conflict('A quote already exists', { quoteId: String(row.quote_id) });
  const extraction = JSON.parse(row.extraction_json) as TdrExtraction;
  if (!extraction.zones.length) throw validationError({ zones: 'Add at least one zone' });
  const name = cut(extraction.title, 100) ?? cut(extraction.client.legalName, 100) ?? cut(row.file_name.replace(/\.(pdf|docx)$/i, ''), 100) ?? `TDR ${row.id}`;
  const notes = cut([`Creada desde el documento TDR «${row.file_name}».`, extraction.summary].filter(Boolean).join('\n\n'), 2000);
  return db.transaction(() => {
    const now = new Date().toISOString();
    const quoteId = Number(db.prepare(`INSERT INTO quotes (name, installation_type, city, measurement_origin, external_reference_price, notes, created_by, created_at, updated_at)
      VALUES (?, ?, ?, 'estimate', ?, ?, ?, ?, ?)`).run(name, extraction.installationType, cut(extraction.city, 100),
      extraction.referencePrice && extraction.referencePrice > 0 ? extraction.referencePrice : null, notes, user, now, now).lastInsertRowid);
    replaceZones(db, quoteId, zonesFrom(db, extraction));
    documentRepository(db).saveData(quoteId, emptyData, documentDataFrom(extraction), user);
    enqueue(db, quoteId, 'generate', user);
    db.prepare('UPDATE tdr_documents SET quote_id = ?, updated_at = ? WHERE id = ?').run(quoteId, now, row.id);
    return quoteId;
  })();
}
