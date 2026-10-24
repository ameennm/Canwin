import { json, error, serverError, readJson } from '../../../lib/server/http.js';
import { COURSE_MONEY_FIELDS, toCourseStatus, payoutError } from '../../../lib/server/catalog.js';

// Admin only (enforced in _middleware.js). Only the fields sent are changed.
export async function onRequestPut({ params, request, env }) {
  const body = await readJson(request);
  const updates = [];
  const values = [];
  const set = (column, value) => { updates.push(`${column} = ?`); values.push(value); };

  if (body.course_name !== undefined) {
    const name = String(body.course_name).trim();
    if (!name) return error('Course name is required');
    set('course_name', name);
  }
  if (body.price !== undefined) set('course_price', Math.max(Number(body.price) || 0, 0));
  if (body.points !== undefined) set('points_per_admission', Math.max(Math.round(Number(body.points) || 0), 0));
  if (body.status !== undefined) set('status', toCourseStatus(body.status));
  for (const field of COURSE_MONEY_FIELDS) {
    if (body[field] !== undefined) set(field, Math.max(Math.round((Number(body[field]) || 0) * 100) / 100, 0));
  }
  if (updates.length === 0) return error('No fields to update');

  try {
    // Check the course as it will be after this change.
    const current = await env.DB.prepare('SELECT * FROM courses WHERE course_id = ?').bind(params.id).first();
    if (!current) return error('Course not found', 404);
    const next = { ...current };
    updates.forEach((u, i) => { next[u.split(' = ')[0]] = values[i]; });
    const tooHigh = payoutError(next);
    if (tooHigh) return error(tooHigh);

    const result = await env.DB.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE course_id = ?`).bind(...values, params.id).run();
    if (!result.meta.changes) return error('Course not found', 404);
    return json({ message: 'Course updated' });
  } catch (err) {
    return serverError(err, 'Update course');
  }
}

export async function onRequestDelete({ params, env }) {
  const db = env.DB;
  try {
    const refCount = await db.prepare('SELECT COUNT(*) as count FROM admissions WHERE course_id = ?').bind(params.id).first();
    if (refCount.count > 0) {
      return error('This course has admissions. Mark it inactive instead of deleting it.');
    }
    await db.batch([
      db.prepare('DELETE FROM bonus_campaigns WHERE course_id = ?').bind(params.id),
      db.prepare('DELETE FROM special_offers WHERE course_id = ?').bind(params.id),
      db.prepare('DELETE FROM courses WHERE course_id = ?').bind(params.id),
    ]);
    return json({ message: 'Course deleted' });
  } catch (err) {
    return serverError(err, 'Delete course');
  }
}
