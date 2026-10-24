import { json, serverError } from '../../../lib/server/http.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT u.id, u.name, u.phone, u.email, u.rank, u.referral_code, u.upline_id, u.upline_chain, u.points, u.state AS status, u.created_at, u.avatar_url,
             up.name AS upline_name, up.referral_code AS upline_code,
             s.total_earnings, s.wallet_balance, s.withdrawable_balance, s.pending_balance, s.total_paid,
             u.points AS total_points, s.direct_referrals, s.team_size, s.total_admissions
      FROM users u
      LEFT JOIN users up ON up.id = u.upline_id
      LEFT JOIN user_stats s ON u.id = s.user_id
      WHERE u.state != 'deleted'
      ORDER BY u.created_at DESC
    `).all();
    return json(results);
  } catch (err) {
    return serverError(err, 'List promoters');
  }
}
