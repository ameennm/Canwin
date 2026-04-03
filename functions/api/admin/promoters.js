export async function onRequestGet({ env }) {
  const db = env.DB;
  try {
    const promoters = await db.prepare(`
      SELECT u.id, u.name, u.phone, u.email, u.rank, u.referral_code, u.upline_id, u.upline_chain, u.points, u.status, u.created_at, u.avatar_url,
             s.total_earnings, s.wallet_balance, s.withdrawable_balance, s.pending_balance, s.total_paid, s.total_points, s.direct_referrals, s.team_size, s.total_admissions
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      ORDER BY u.created_at DESC
    `).all();

    return new Response(JSON.stringify(promoters.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
