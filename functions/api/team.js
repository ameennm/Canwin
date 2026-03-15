export async function onRequestGet({ env, data }) {
  if (!data?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const db = env.DB;
  const userId = data.user.id;

  try {
    const stats = await db.prepare('SELECT * FROM user_stats WHERE user_id = ?').bind(userId).first() || {};
    
    const directReferrals = await db.prepare(`
      SELECT u.id, u.name, u.rank, u.referral_code, u.avatar_url, s.total_points, s.team_size
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      WHERE u.upline_id = ?
      ORDER BY s.total_points DESC
    `).bind(userId).all();

    return new Response(JSON.stringify({
        stats,
        directReferrals: directReferrals.results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
