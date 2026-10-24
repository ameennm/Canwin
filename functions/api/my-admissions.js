import { json, serverError } from '../../lib/server/http.js';

export async function onRequestGet({ env, data }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT
        a.id, a.student_name, a.student_phone, a.status, a.created_at,
        c.course_name, COALESCE(a.course_price_at_admission, c.course_price) AS course_price,
        c.points_per_admission AS points_earned,
        (SELECT COALESCE(SUM(l.amount), 0) FROM commission_ledger l
          WHERE l.reference_id = a.id AND l.user_id = a.admitted_by_user_id
            AND (l.type = 'commission_level_1' OR l.type = 'bonus')) AS commission_earned
      FROM admissions a
      LEFT JOIN courses c ON a.course_id = c.course_id
      WHERE a.admitted_by_user_id = ?
      ORDER BY a.created_at DESC
    `).bind(data.user.id).all();
    return json(results);
  } catch (err) {
    return serverError(err, 'My admissions');
  }
}
