import { json, error, serverError, readJson, isAdmin } from '../../lib/server/http.js';
import { COURSE_MONEY_FIELDS, toCourseStatus } from '../../lib/server/catalog.js';

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

// Admin only (enforced in _middleware.js).
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const name = String(body.course_name || '').trim();
  const price = money(body.price);
  if (!name) return error('Course name is required');

  const points = Number.isFinite(Number(body.points)) && Number(body.points) >= 0
    ? Math.round(Number(body.points))
    : Math.round(price * 0.2);

  try {
    const result = await env.DB.prepare(`
      INSERT INTO courses (
        course_name, course_price, points_per_admission, ${COURSE_MONEY_FIELDS.join(', ')},
        commission_pool_percentage, status
      )
      VALUES (?, ?, ?, ${COURSE_MONEY_FIELDS.map(() => '?').join(', ')}, ?, ?)
    `).bind(
      name, price, points, ...COURSE_MONEY_FIELDS.map(f => money(body[f])),
      price > 0 ? Math.round(COURSE_MONEY_FIELDS.slice(0, 5).reduce((sum, f) => sum + money(body[f]), 0) / price * 10000) / 100 : 0,
      toCourseStatus(body.status)
    ).run();

    return json({ message: 'Course created successfully', id: result.meta.last_row_id });
  } catch (err) {
    return serverError(err, 'Create course');
  }
}

export async function onRequestGet({ request, env, data }) {
  const showAll = new URL(request.url).searchParams.get('admin') === 'true' && isAdmin(data);

  try {
    const { results } = await env.DB.prepare(`
      SELECT course_id as id, course_name as name, course_price as price,
             points_per_admission as points, ${COURSE_MONEY_FIELDS.join(', ')},
             status, created_at
      FROM courses
      ${showAll ? '' : "WHERE status = 'active'"}
      ORDER BY created_at DESC
    `).all();
    return json(results);
  } catch (err) {
    return serverError(err, 'List courses');
  }
}
