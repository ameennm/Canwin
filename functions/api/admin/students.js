import { json, serverError } from '../../../lib/server/http.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT
        a.id, a.student_name, a.student_phone, a.status, a.created_at, a.approved_at,
        a.admitted_by_user_id, a.course_id, a.referrer_rank_at_admission,
        c.course_name, COALESCE(a.course_price_at_admission, c.course_price) AS course_price,
        u.name AS admitted_by_name, u.rank AS admitted_by_rank, u.referral_code AS admitted_by_code
      FROM admissions a
      LEFT JOIN courses c ON a.course_id = c.course_id
      LEFT JOIN users u ON a.admitted_by_user_id = u.id
      ORDER BY a.created_at DESC
    `).all();

    return json(results.map(r => ({ ...r, course_type: r.course_price > 0 ? 'paid' : 'free' })));
  } catch (err) {
    return serverError(err, 'List admissions');
  }
}
