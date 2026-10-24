import { json, serverError } from '../../lib/server/http.js';

export async function onRequestGet({ env, data }) {
  const db = env.DB;
  const userId = data.user.id;

  try {
    const stats = await db.prepare('SELECT * FROM user_stats WHERE user_id = ?').bind(userId).first() || {};
    const { results: directReferrals } = await db.prepare(`
      SELECT u.id, u.name, u.rank, u.referral_code, u.avatar_url, u.state AS status, u.points AS total_points, s.team_size, s.total_admissions
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      WHERE u.upline_id = ? AND u.state IN ('active', 'pending')
      ORDER BY u.points DESC
    `).bind(userId).all();

    return json({ stats, directReferrals });
  } catch (err) {
    return serverError(err, 'Team');
  }
}
