export async function onRequestPost({ params, env }) {
  const userId = params.id;
  const db = env.DB;

  try {
    // 1. Get user and check if already approved
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    if (user.status === 'active') return new Response(JSON.stringify({ message: 'User already approved' }), { status: 200 });

    // 2. Update user status
    const updateStmts = [];
    updateStmts.push(db.prepare('UPDATE users SET status = "active" WHERE id = ?').bind(userId));

    // 3. Process direct_referrals and team_size for upline
    if (user.upline_id) {
        // Update direct referrals for immediate upline
        updateStmts.push(db.prepare('UPDATE user_stats SET direct_referrals = direct_referrals + 1 WHERE user_id = ?').bind(user.upline_id));
        
        // Update team size for entire upline chain
        let uplineChain = [];
        try {
            uplineChain = JSON.parse(user.upline_chain || '[]');
        } catch(e) {}
        
        for (const parentId of uplineChain) {
            updateStmts.push(db.prepare('UPDATE user_stats SET team_size = team_size + 1 WHERE user_id = ?').bind(parentId));
        }
    }

    await db.batch(updateStmts);

    return new Response(JSON.stringify({ message: 'User approved' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
