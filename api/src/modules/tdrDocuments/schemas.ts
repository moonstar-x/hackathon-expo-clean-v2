import { z } from 'zod';
import { nullableText, requiredText } from '../../lib/validation.ts';
import { MAX_NUMBER } from '../../lib/numbers.ts';

// The information a TDR document gives for a quote (SPEC-009 §4.1): what the model extracts, what the
// admin reviews and saves, and what a quote is created from. Every value may be null; text is Spanish.

export const PDF_TYPE = 'application/pdf';
export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const TDR_CONTENT_TYPES = [PDF_TYPE, DOCX_TYPE] as const;
export type TdrContentType = typeof TDR_CONTENT_TYPES[number];
export const TDR_MAX_BYTES = 20 * 1024 * 1024;
export const TDR_FOLDER = 'tdr';
export const TDR_EXTENSIONS: Record<TdrContentType, string> = { [PDF_TYPE]: '.pdf', [DOCX_TYPE]: '.docx' };

export const INSTALLATION_TYPES = ['privateHospital', 'publicHospital', 'office', 'mall', 'other'] as const;
export const RISKS = ['critical', 'semicritical', 'noncritical'] as const;

/** Text limits, shared by the strict schema, the normalization and the model's JSON schema. */
const LIMITS = {
  title: 150, summary: 3000, city: 100, paymentTerms: 500, serviceHours: 300,
  legalName: 150, taxId: 20, contactName: 100, contactTitle: 100, email: 254, phone: 30, address: 200,
  zoneName: 100, zoneNotes: 1000, role: 100, staffNotes: 300, equipment: 300, equipmentNotes: 300,
  supply: 500, presentation: 100, frequency: 50, requirement: 500,
} as const;
/** How many rows each list keeps. */
export const LIST_LIMITS = { zones: 100, staff: 50, equipment: 100, supplies: 200, requirements: 50 } as const;
const MAX_CONTRACT_MONTHS = 120;

const amount = () => z.number({ error: 'Must be a number' }).min(0, 'Must be at least 0').max(MAX_NUMBER, `Must be at most ${MAX_NUMBER}`).nullable();
const count = (max = 100000) => z.number({ error: 'Must be a number' }).int('Must be an integer').min(0, 'Must be at least 0').max(max, `Must be at most ${max}`).nullable();
const id = () => z.number({ error: 'Must be an integer id' }).int('Must be an integer id').positive('Must be a positive integer id').nullable();
const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max, `Must have at most ${max} items`);

const zoneSchema = z.object({
  name: requiredText(LIMITS.zoneName),
  risk: z.enum(RISKS).nullable(),
  zoneTypeId: id(),
  scheduleId: id(),
  floorArea: amount(),
  fixedPosts: count(1000),
  hoursPerDay: z.number({ error: 'Must be a number' }).gt(0, 'Must be greater than 0').max(24, 'Must be at most 24').nullable(),
  daysPerMonth: z.number({ error: 'Must be a number' }).gt(0, 'Must be greater than 0').max(31, 'Must be at most 31').nullable(),
  notes: nullableText(LIMITS.zoneNotes),
});

/** What the admin saves (PUT): strict, so a refusal names the field to fix. */
export const extractionSchema = z.object({
  title: nullableText(LIMITS.title),
  summary: nullableText(LIMITS.summary),
  client: z.object({
    legalName: nullableText(LIMITS.legalName), taxId: nullableText(LIMITS.taxId), contactName: nullableText(LIMITS.contactName),
    contactTitle: nullableText(LIMITS.contactTitle), email: nullableText(LIMITS.email), phone: nullableText(LIMITS.phone), address: nullableText(LIMITS.address),
  }),
  city: nullableText(LIMITS.city),
  installationType: z.enum(INSTALLATION_TYPES).nullable(),
  referencePrice: amount(),
  contractMonths: z.number({ error: 'Must be a number' }).int('Must be an integer').min(1, 'Must be at least 1').max(MAX_CONTRACT_MONTHS, `Must be at most ${MAX_CONTRACT_MONTHS}`).nullable(),
  paymentTerms: nullableText(LIMITS.paymentTerms),
  totalArea: amount(),
  serviceHours: nullableText(LIMITS.serviceHours),
  zones: list(zoneSchema, LIST_LIMITS.zones),
  staff: list(z.object({ role: requiredText(LIMITS.role), count: count(), notes: nullableText(LIMITS.staffNotes) }), LIST_LIMITS.staff),
  equipment: list(z.object({ description: requiredText(LIMITS.equipment), quantity: amount(), notes: nullableText(LIMITS.equipmentNotes) }), LIST_LIMITS.equipment),
  supplies: list(z.object({ description: requiredText(LIMITS.supply), presentation: nullableText(LIMITS.presentation), quantity: amount(), frequency: nullableText(LIMITS.frequency) }), LIST_LIMITS.supplies),
  requirements: list(z.object({ text: requiredText(LIMITS.requirement) }), LIST_LIMITS.requirements),
});
export type TdrExtraction = z.infer<typeof extractionSchema>;
export type TdrZone = TdrExtraction['zones'][number];

// ---------------------------------------------------------------------------
// Normalization: the model's reply is untrusted. Whatever doesn't fit becomes null or is dropped, so a
// reply with one bad value still gives the rest, and the result always passes `extractionSchema`.
// ---------------------------------------------------------------------------

const record = (v: unknown): Record<string, unknown> => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
/** At most `max` characters, cut at the last word that fits (with an ellipsis), not mid-word. */
export function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = s.slice(0, max - 1);
  const space = head.search(/\s\S*$/);
  return `${(space > max / 2 ? head.slice(0, space) : head).trimEnd()}…`;
}
const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s ? clip(s, max) : null;
};
/** Like `text`, but keeps line breaks (a summary reads better in paragraphs). */
const paragraphs = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return s ? clip(s, max) : null;
};
const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(/[^\d.-]/g, '')) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const nonNegative = (v: unknown, max = MAX_NUMBER): number | null => { const n = toNumber(v); return n !== null && n >= 0 && n <= max ? n : null; };
const integer = (v: unknown, min: number, max: number): number | null => { const n = toNumber(v); return n !== null && Number.isInteger(n) && n >= min && n <= max ? n : null; };
const within = (v: unknown, max: number): number | null => { const n = toNumber(v); return n !== null && n > 0 && n <= max ? n : null; };
const oneOf = <T extends string>(v: unknown, values: readonly T[]): T | null => (values as readonly unknown[]).includes(v) ? v as T : null;
const rows = <T>(v: unknown, max: number, map: (row: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : []).map((row) => map(record(row))).filter((row): row is T => row !== null).slice(0, max);

/** The company's catalog the extraction may point to. */
export interface TdrCatalog {
  zoneTypes: { id: number; name: string; risk: string }[];
  schedules: { id: number; name: string; serviceHoursPerDay: number }[];
}

/** The active schedule with these hours a day, if exactly one has them. */
export function scheduleFor(hoursPerDay: number | null, catalog: TdrCatalog): number | null {
  if (hoursPerDay === null) return null;
  const matches = catalog.schedules.filter((s) => s.serviceHoursPerDay === hoursPerDay);
  return matches.length === 1 ? matches[0].id : null;
}

/** Any value (the model's reply) as a valid extraction; zone types and schedules only from the catalog. */
export function normalizeExtraction(raw: unknown, catalog: TdrCatalog): TdrExtraction {
  const r = record(raw);
  const c = record(r.client);
  const zoneTypeIds = new Set(catalog.zoneTypes.map((t) => t.id));
  return {
    title: text(r.title, LIMITS.title),
    summary: paragraphs(r.summary, LIMITS.summary),
    client: {
      legalName: text(c.legalName, LIMITS.legalName), taxId: text(c.taxId, LIMITS.taxId), contactName: text(c.contactName, LIMITS.contactName),
      contactTitle: text(c.contactTitle, LIMITS.contactTitle), email: text(c.email, LIMITS.email), phone: text(c.phone, LIMITS.phone), address: text(c.address, LIMITS.address),
    },
    city: text(r.city, LIMITS.city),
    installationType: oneOf(r.installationType, INSTALLATION_TYPES),
    referencePrice: nonNegative(r.referencePrice),
    contractMonths: integer(r.contractMonths, 1, MAX_CONTRACT_MONTHS),
    paymentTerms: text(r.paymentTerms, LIMITS.paymentTerms),
    totalArea: nonNegative(r.totalArea),
    serviceHours: text(r.serviceHours, LIMITS.serviceHours),
    zones: rows(r.zones, LIST_LIMITS.zones, (z) => {
      const name = text(z.name, LIMITS.zoneName);
      if (!name) return null;
      const zoneTypeId = integer(z.zoneTypeId, 1, Number.MAX_SAFE_INTEGER);
      const hoursPerDay = within(z.hoursPerDay, 24);
      return {
        name, risk: oneOf(z.risk, RISKS), zoneTypeId: zoneTypeId !== null && zoneTypeIds.has(zoneTypeId) ? zoneTypeId : null,
        scheduleId: scheduleFor(hoursPerDay, catalog), floorArea: nonNegative(z.floorArea), fixedPosts: integer(z.fixedPosts, 0, 1000),
        hoursPerDay, daysPerMonth: within(z.daysPerMonth, 31), notes: text(z.notes, LIMITS.zoneNotes),
      };
    }),
    staff: rows(r.staff, LIST_LIMITS.staff, (s) => { const role = text(s.role, LIMITS.role); return role ? { role, count: integer(s.count, 0, 100000), notes: text(s.notes, LIMITS.staffNotes) } : null; }),
    equipment: rows(r.equipment, LIST_LIMITS.equipment, (e) => { const description = text(e.description, LIMITS.equipment); return description ? { description, quantity: nonNegative(e.quantity), notes: text(e.notes, LIMITS.equipmentNotes) } : null; }),
    supplies: rows(r.supplies, LIST_LIMITS.supplies, (s) => { const description = text(s.description, LIMITS.supply); return description ? { description, presentation: text(s.presentation, LIMITS.presentation), quantity: nonNegative(s.quantity), frequency: text(s.frequency, LIMITS.frequency) } : null; }),
    // A plain string is a requirement too.
    requirements: rows((Array.isArray(r.requirements) ? r.requirements : []).map((q: unknown) => (typeof q === 'string' ? { text: q } : q)), LIST_LIMITS.requirements, (q) => { const t = text(q.text, LIMITS.requirement); return t ? { text: t } : null; }),
  };
}

// ---------------------------------------------------------------------------
// The JSON schema the model answers with (OpenRouter `response_format`, strict): every property is
// required and nullable instead of optional; descriptions tell the model what each one is.
// ---------------------------------------------------------------------------

type JsonSchema = Record<string, unknown>;
const nullable = (type: string, description: string): JsonSchema => ({ type: [type, 'null'], description });
/** Anthropic refuses an enum beside a ['string', 'null'] type, so a nullable enum is one of two schemas. */
const nullableEnum = (values: readonly string[], description: string): JsonSchema => ({ description, anyOf: [{ type: 'string', enum: [...values] }, { type: 'null' }] });
const object = (properties: Record<string, JsonSchema>, description?: string): JsonSchema =>
  ({ type: 'object', ...(description ? { description } : {}), properties, required: Object.keys(properties), additionalProperties: false });
const array = (items: JsonSchema, description: string): JsonSchema => ({ type: 'array', description, items });

export const extractionJsonSchema: JsonSchema = object({
  title: nullable('string', 'Nombre del servicio o del proceso de contratación, como lo nombra el documento.'),
  summary: nullable('string', 'Resumen en español, en pocas oraciones, de lo que se pide: alcance, áreas, jornada, personal, insumos y condiciones clave.'),
  client: object({
    legalName: nullable('string', 'Razón social o nombre de la entidad contratante.'),
    taxId: nullable('string', 'RUC u otra identificación tributaria de la entidad contratante.'),
    contactName: nullable('string', 'Persona de contacto o administrador del contrato.'),
    contactTitle: nullable('string', 'Cargo de la persona de contacto.'),
    email: nullable('string', 'Correo de contacto.'),
    phone: nullable('string', 'Teléfono de contacto.'),
    address: nullable('string', 'Dirección donde se presta el servicio.'),
  }, 'La entidad contratante.'),
  city: nullable('string', 'Ciudad donde se presta el servicio.'),
  installationType: nullableEnum(INSTALLATION_TYPES, 'Tipo de instalación: publicHospital es un hospital o unidad de salud pública (MSP, IESS…).'),
  referencePrice: nullable('number', 'Precio referencial o presupuesto MENSUAL sin IVA, en USD. Si solo hay un total y un plazo en meses, divide y dilo en el resumen.'),
  contractMonths: nullable('integer', 'Plazo del contrato en meses.'),
  paymentTerms: nullable('string', 'Forma y frecuencia de pago, anticipos.'),
  totalArea: nullable('number', 'Superficie total a limpiar en m². Si es un rango, el valor medio.'),
  serviceHours: nullable('string', 'La jornada del servicio tal como la describe el documento.'),
  zones: array(object({
    name: { type: 'string', description: 'Nombre del área o punto, p. ej. "Hospitalización 4to piso".' },
    risk: nullableEnum(RISKS, 'Riesgo sanitario del área.'),
    zoneTypeId: nullable('integer', 'El id del tipo de zona del catálogo que mejor corresponde, o null si ninguno corresponde.'),
    floorArea: nullable('number', 'Superficie del área en m², solo si el documento la da.'),
    fixedPosts: nullable('integer', 'Puestos o puntos fijos de personal en el área.'),
    hoursPerDay: nullable('number', 'Horas al día de esos puestos (p. ej. 24 u 8).'),
    daysPerMonth: nullable('number', 'Días de servicio al mes según la jornada del documento: todos los días o 365 días al año es 30.4; de lunes a viernes, 22; de lunes a sábado, 26. null solo si el documento no dice qué días.'),
    notes: nullable('string', 'Lo demás que el documento dice del área.'),
  }), 'Una fila por área o línea de puestos. Un área con puestos de 24 h y de 8 h son dos filas.'),
  staff: array(object({
    role: { type: 'string', description: 'Cargo, p. ej. "Auxiliar de limpieza".' },
    count: nullable('integer', 'Número de personas.'),
    notes: nullable('string', 'Requisitos, turnos u otros detalles.'),
  }), 'Personal requerido.'),
  equipment: array(object({
    description: { type: 'string', description: 'Máquina, equipo o herramienta.' },
    quantity: nullable('number', 'Cantidad.'),
    notes: nullable('string', 'Periodicidad u otros detalles, p. ej. "semestral".'),
  }), 'Maquinaria, equipos y herramientas que debe aportar el proveedor.'),
  supplies: array(object({
    description: { type: 'string', description: 'Producto químico o insumo.' },
    presentation: nullable('string', 'Presentación, p. ej. "Galón" o "Rollo x 200 m".'),
    quantity: nullable('number', 'Cantidad.'),
    frequency: nullable('string', 'Periodo de esa cantidad, p. ej. "mensual".'),
  }), 'Productos químicos e insumos fungibles que debe aportar el proveedor.'),
  requirements: array(object({
    text: { type: 'string', description: 'Un requisito o condición.' },
  }), 'Requisitos y condiciones importantes para cotizar: formación del personal, garantías, multas, plazos.'),
});
