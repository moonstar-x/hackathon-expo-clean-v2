import { badRequest } from './errors.js';

// Implements the ra-data-simple-rest list protocol: JSON-encoded `sort`,
// `range` and `filter` query params, answered with a JSON array plus a
// `Content-Range` header. Values only ever reach SQL as bound parameters.

export const DEFAULT_RANGE = Object.freeze([0, 24]);
export const MAX_PAGE_SIZE = 1000;

function parseJsonParam(query, name) {
  const raw = query[name];
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') throw badRequest(`"${name}" must be a single JSON-encoded value`);
  try {
    return JSON.parse(raw);
  } catch {
    throw badRequest(`"${name}" is not valid JSON`);
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Escapes LIKE wildcards so user input matches literally (used with `ESCAPE '\'`). */
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// ---------------------------------------------------------------------------
// Filter builders. Each returns `{ sql, params }`, or `null` to ignore the key.
// They throw 400 when the value has the wrong shape.
// ---------------------------------------------------------------------------

const toInt = (key, v) => {
  if (Number.isSafeInteger(v)) return v;
  if (typeof v === 'string' && /^-?\d{1,15}$/.test(v)) return Number(v);
  throw badRequest(`Filter "${key}" must be an integer or an array of integers`);
};

const inOrEquals = (column, values) =>
  values.length === 0
    ? { sql: '0', params: [] }
    : { sql: `${column} IN (${values.map(() => '?').join(', ')})`, params: values };

/** Integer equality, or "in" for an array. Integer strings are accepted too. */
export const intFilter = (column) => (value, key) => {
  if (Array.isArray(value)) return inOrEquals(column, value.map((v) => toInt(key, v)));
  return { sql: `${column} = ?`, params: [toInt(key, value)] };
};

/** String equality against a fixed set of values, or "in" for an array. */
export const enumFilter = (column, allowed) => (value, key) => {
  const check = (v) => {
    if (!allowed.includes(v)) throw badRequest(`Filter "${key}" must be one of: ${allowed.join(', ')}`);
    return v;
  };
  if (Array.isArray(value)) return inOrEquals(column, value.map(check));
  return { sql: `${column} = ?`, params: [check(value)] };
};

/** Case-insensitive string equality, or "in" for an array. */
export const textFilter = (column) => (value, key) => {
  const check = (v) => {
    if (typeof v !== 'string') throw badRequest(`Filter "${key}" must be a string or an array of strings`);
    return v;
  };
  if (Array.isArray(value)) return inOrEquals(`${column} COLLATE NOCASE`, value.map(check));
  return { sql: `${column} = ? COLLATE NOCASE`, params: [check(value)] };
};

export const toBool = (key, v) => {
  if (v === true || v === 'true' || v === 1) return true;
  if (v === false || v === 'false' || v === 0) return false;
  throw badRequest(`Filter "${key}" must be true or false`);
};

export const boolFilter = (column) => (value, key) => ({ sql: `${column} = ?`, params: [toBool(key, value) ? 1 : 0] });

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?$/;

/** Converts a date or ISO datetime filter value to a stored-format ISO string. */
export function toIsoBound(key, value, bound) {
  if (typeof value === 'string') {
    if (DATE_ONLY.test(value)) {
      const iso = `${value}${bound === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z'}`;
      const d = new Date(iso);
      // Reject impossible dates such as 2026-02-31 (Date would roll them over).
      if (!Number.isNaN(d.getTime()) && d.toISOString() === iso) return iso;
    } else if (DATE_TIME.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  throw badRequest(`Filter "${key}" must be a date (YYYY-MM-DD) or an ISO 8601 datetime`);
}

/** Inclusive lower (`gte`) or upper (`lte`) bound on an ISO timestamp column. */
export const dateBoundFilter = (column, op) => (value, key) => ({
  sql: `${column} ${op === 'gte' ? '>=' : '<='} ?`,
  params: [toIsoBound(key, value, op === 'gte' ? 'start' : 'end')],
});

// ---------------------------------------------------------------------------

/**
 * @typedef {object} ListSpec
 * @property {string} resource         name used in Content-Range
 * @property {string} table
 * @property {Record<string, string>} sortable  API field → SQL expression
 * @property {string[]} [textSorts]     API fields sorted case-insensitively
 * @property {[string, 'ASC'|'DESC']} defaultSort
 * @property {Record<string, Function>} [filters] API filter key → builder
 * @property {string[]} search          columns matched by `q`
 */

function parseSort(raw, spec) {
  if (raw === undefined) return { field: spec.defaultSort[0], order: spec.defaultSort[1] };
  if (!Array.isArray(raw) || raw.length !== 2 || typeof raw[0] !== 'string' || typeof raw[1] !== 'string') {
    throw badRequest('"sort" must be ["<field>", "ASC" | "DESC"]');
  }
  const [field, rawOrder] = raw;
  if (!Object.hasOwn(spec.sortable, field)) {
    throw badRequest(`Cannot sort by "${field}". Sortable fields: ${Object.keys(spec.sortable).join(', ')}`);
  }
  const order = rawOrder.toUpperCase();
  if (order !== 'ASC' && order !== 'DESC') throw badRequest('Sort order must be "ASC" or "DESC"');
  return { field, order };
}

function parseRange(raw) {
  if (raw === undefined) return { start: DEFAULT_RANGE[0], end: DEFAULT_RANGE[1] };
  if (!Array.isArray(raw) || raw.length !== 2 || !raw.every(Number.isSafeInteger)) {
    throw badRequest('"range" must be [start, end] with integer values');
  }
  const [start, end] = raw;
  if (start < 0) throw badRequest('"range" start must be >= 0');
  if (end < start) throw badRequest('"range" end must be >= start');
  if (end - start + 1 > MAX_PAGE_SIZE) throw badRequest(`"range" may span at most ${MAX_PAGE_SIZE} rows`);
  return { start, end };
}

function buildWhere(raw, spec) {
  if (raw === undefined) raw = {};
  if (!isPlainObject(raw)) throw badRequest('"filter" must be a JSON object');

  const builders = { id: intFilter('id'), ...spec.filters };
  const clauses = [];
  const params = [];

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'q') {
      if (value === null || value === undefined) continue;
      if (typeof value !== 'string' && typeof value !== 'number') throw badRequest('Filter "q" must be a string');
      const term = String(value).trim();
      if (term === '') continue;
      const like = `%${escapeLike(term)}%`;
      clauses.push(`(${spec.search.map((col) => `${col} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
      params.push(...spec.search.map(() => like));
      continue;
    }
    const build = Object.hasOwn(builders, key) ? builders[key] : undefined;
    if (!build) {
      const allowed = ['id', 'q', ...Object.keys(spec.filters ?? {})].join(', ');
      throw badRequest(`Unknown filter "${key}". Allowed filters: ${allowed}`);
    }
    if (value === null || value === undefined) continue;
    const clause = build(value, key);
    if (!clause) continue;
    clauses.push(clause.sql);
    params.push(...clause.params);
  }

  return { sql: clauses.length ? clauses.join(' AND ') : '1', params };
}

/** Parses and validates `sort`, `range` and `filter` from `req.query`. */
export function parseListQuery(query, spec) {
  const sort = parseSort(parseJsonParam(query, 'sort'), spec);
  const range = parseRange(parseJsonParam(query, 'range'));
  const where = buildWhere(parseJsonParam(query, 'filter'), spec);

  const expr = spec.sortable[sort.field];
  const collate = spec.textSorts?.includes(sort.field) ? ' COLLATE NOCASE' : '';
  const orderBy = sort.field === 'id' ? `id ${sort.order}` : `${expr}${collate} ${sort.order}, id ASC`;

  return { sort, range, where, orderBy };
}

/** Runs the list query. Returns the requested page of raw rows and the total match count. */
export function queryList(db, spec, parsed) {
  const { where, orderBy, range } = parsed;
  const total = db.prepare(`SELECT COUNT(*) FROM ${spec.table} WHERE ${where.sql}`).pluck().get(...where.params);
  const rows = db
    .prepare(`SELECT * FROM ${spec.table} WHERE ${where.sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...where.params, range.end - range.start + 1, range.start);
  return { rows, total };
}

// `products 0-24/319`, or `products */0` when the page is empty.
export function contentRange(resource, start, count, total) {
  return count > 0 ? `${resource} ${start}-${start + count - 1}/${total}` : `${resource} */${total}`;
}

/** Sends a list response in the ra-data-simple-rest format. */
export function sendList(res, resource, range, records, total) {
  res.set('Content-Range', contentRange(resource, range.start, records.length, total));
  res.json(records);
}
