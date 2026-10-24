import { json, error, serverError, readJson } from '../../../../lib/server/http.js';
import { toUtcIso, OFFER_AMOUNT_FIELDS } from '../../../../lib/server/catalog.js';

// GET - List all special offers
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT o.*, c.course_name, c.course_price
      FROM special_offers o
      JOIN courses c ON o.course_id = c.course_id
      ORDER BY o.created_at DESC
    `).all();

    const now = new Date();
    return json(results.map(o => ({ ...o, isActive: new Date(o.valid_until) > now && o.status === 'active' })));
  } catch (err) {
    return serverError(err, 'List offers');
  }
}

// POST - Create special offer. Each amount is added on top of the Level 1
// commission for promoters of that rank until valid_until.
export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  const validUntil = toUtcIso(body.valid_until);
  if (!body.course_id || !validUntil) return error('course_id and valid_until are required');
  if (new Date(validUntil) <= new Date()) return error('Offer end time must be in the future');

  const amounts = OFFER_AMOUNT_FIELDS.map(f => Math.max(Number(body[f]) || 0, 0));
  if (amounts.every(a => a === 0)) return error('Enter an extra amount for at least one rank');

  const db = env.DB;
  try {
    const course = await db.prepare('SELECT course_id FROM courses WHERE course_id = ?').bind(body.course_id).first();
    if (!course) return error('Course not found', 404);

    const result = await db.prepare(`
      INSERT INTO special_offers (course_id, valid_until, ${OFFER_AMOUNT_FIELDS.join(', ')}, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(body.course_id, validUntil, ...amounts, data.user.id).run();

    return json({ message: 'Special offer created successfully', offer_id: result.meta.last_row_id });
  } catch (err) {
    return serverError(err, 'Create offer');
  }
}
