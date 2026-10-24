import { json, error, serverError, readJson } from '../../lib/server/http.js';
import { PROMOTER_RANKS } from '../../lib/server/users.js';
import { toUtcIso } from '../../lib/server/catalog.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT b.*, c.course_name
      FROM bonus_campaigns b
      JOIN courses c ON b.course_id = c.course_id
      ORDER BY b.created_at DESC
    `).all();
    return json(results);
  } catch (err) {
    return serverError(err, 'List bonuses');
  }
}

// Admin only (enforced in _middleware.js).
export async function onRequestPost({ request, env }) {
  const { course_id, bonus_amount, start_time, end_time, eligible_roles } = await readJson(request);
  const amount = Number(bonus_amount);
  const start = toUtcIso(start_time);
  const end = toUtcIso(end_time);

  if (!course_id) return error('Please choose a course');
  if (!Number.isFinite(amount) || amount <= 0) return error('Bonus amount must be more than 0');
  if (!start || !end || end <= start) return error('End time must be after start time');

  const roles = String(eligible_roles || 'ALL').split(',').map(r => r.trim()).filter(Boolean);
  if (!roles.every(r => r === 'ALL' || PROMOTER_RANKS.includes(r))) return error('Invalid eligible role');

  try {
    await env.DB.prepare(`
      INSERT INTO bonus_campaigns (course_id, bonus_amount, start_time, end_time, eligible_roles)
      VALUES (?, ?, ?, ?, ?)
    `).bind(course_id, amount, start, end, roles.join(',')).run();
    return json({ message: 'Bonus campaign created' });
  } catch (err) {
    return serverError(err, 'Create bonus');
  }
}
