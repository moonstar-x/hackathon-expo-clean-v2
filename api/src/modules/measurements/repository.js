import { createHash } from 'node:crypto';
import { conflict } from '../../lib/errors.js';
import { dateBoundFilter, intFilter, textFilter } from '../../lib/listQuery.js';
import { roundQuantity } from '../../lib/numbers.js';
import { publicUrlFor } from '../../lib/publicUrl.js';
import { FILE_TYPES } from './schemas.js';

const columns = 'id, client_id, name, notes, scanned_at, room_count, total_floor_area, is_area_approximate, footprint_width, footprint_length, is_merged, geometry_version, rooms_json, app_version, device_model, user_id, created_by, created_at, updated_at';
export const measurementListSpec = {
  resource: 'measurements', table: 'measurements',
  sortable: { id: 'id', name: 'name', scannedAt: 'scanned_at', roomCount: 'room_count', totalFloorArea: 'total_floor_area', createdBy: 'created_by', createdAt: 'created_at', updatedAt: 'updated_at' },
  textSorts: ['name', 'createdBy'], defaultSort: ['createdAt', 'DESC'],
  filters: { userId: intFilter('user_id'), createdBy: textFilter('created_by'), scannedAt_gte: dateBoundFilter('scanned_at', 'gte'), scannedAt_lte: dateBoundFilter('scanned_at', 'lte') },
  search: ['name', 'notes', 'created_by'],
};
export function createMeasurementsRepository(db, config) {
  const byId = db.prepare(`SELECT ${columns} FROM measurements WHERE id = ?`);
  const fileInfo = db.prepare('SELECT kind, content_type, size FROM measurement_files WHERE measurement_id = ?');
  function record(row) {
    if (!row) return null;
    return {
      id: row.id, clientId: row.client_id, name: row.name, notes: row.notes, scannedAt: row.scanned_at,
      roomCount: row.room_count, totalFloorArea: row.total_floor_area, isAreaApproximate: !!row.is_area_approximate,
      footprint: row.footprint_width === null ? null : { width: row.footprint_width, length: row.footprint_length },
      isMerged: !!row.is_merged, geometryVersion: row.geometry_version, rooms: JSON.parse(row.rooms_json),
      appVersion: row.app_version, deviceModel: row.device_model, userId: row.user_id, createdBy: row.created_by,
      files: Object.fromEntries(fileInfo.all(row.id).map((f) => [f.kind, { url: publicUrlFor(config, `/api/measurements/${row.id}/files/${f.kind}`), contentType: f.content_type, size: f.size }])),
      createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }
  function replay(clientId, user) {
    const row = db.prepare(`SELECT ${columns} FROM measurements WHERE client_id = ?`).get(clientId);
    if (!row) return null;
    if (row.user_id !== user.id) throw conflict('This measurement was uploaded by another user', { clientId: 'This measurement was uploaded by another user' });
    return record(row);
  }
  const insert = db.transaction((m, files, user) => {
    const existing = replay(m.clientId, user);
    if (existing) return { record: existing, created: false };
    const now = new Date().toISOString();
    const values = [m.clientId, m.name, null, m.scannedAt, m.rooms.length, roundQuantity(m.rooms.reduce((n, r) => n + (r.floorArea ?? 0), 0)), +m.rooms.some((r) => r.isFloorApproximate), m.footprint?.width ?? null, m.footprint?.length ?? null, +m.isMerged, m.geometryVersion, JSON.stringify(m.rooms), m.appVersion, m.deviceModel, user.id, user.email, now, now];
    const { lastInsertRowid: id } = db.prepare(`INSERT INTO measurements (${columns.split(', ').slice(1).join(', ')}) VALUES (${values.map(() => '?').join(', ')})`).run(...values);
    const put = db.prepare('INSERT INTO measurement_files (measurement_id, kind, content_type, size, sha256, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const [kind, parts] of Object.entries(files)) {
      const data = parts[0].buffer;
      put.run(id, kind, FILE_TYPES[kind], data.length, createHash('sha256').update(data).digest('hex'), data, now);
    }
    return { record: record(byId.get(id)), created: true };
  });
  return {
    findById: (id) => record(byId.get(id)),
    list({ where, orderBy, range }) {
      const rows = db.prepare(`SELECT ${columns} FROM measurements WHERE ${where.sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...where.params, range.end - range.start + 1, range.start);
      const total = db.prepare(`SELECT COUNT(*) FROM measurements WHERE ${where.sql}`).pluck().get(...where.params);
      return { records: rows.map(record), total };
    },
    upload(m, files, user) {
      try { return insert(m, files, user); } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' && err.message.includes('client_id')) {
          const existing = replay(m.clientId, user);
          if (existing) return { record: existing, created: false };
        }
        throw err;
      }
    },
    update(id, data) {
      db.prepare('UPDATE measurements SET name = ?, notes = ?, updated_at = ? WHERE id = ?').run(data.name, data.notes, new Date().toISOString(), id);
      return record(byId.get(id));
    },
    remove(id) { db.prepare('DELETE FROM measurements WHERE id = ?').run(id); },
    file: (id, kind) => db.prepare('SELECT content_type, size, sha256, data FROM measurement_files WHERE measurement_id = ? AND kind = ?').get(id, kind),
  };
}
