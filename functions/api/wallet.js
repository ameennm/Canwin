export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  
  // Protect route
  if (!data?.user || (data.user.id != userId && data.user.rank !== 'Super Admin')) {
     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const db = env.DB;

  try {
    // Read from optimized user_stats table instead of calculating
    const stats = await db.prepare(`
      SELECT s.wallet_balance, s.withdrawable_balance, s.pending_balance, s.total_points, s.total_earnings, s.direct_referrals, s.team_size, u.rank 
      FROM user_stats s 
      JOIN users u ON s.user_id = u.id 
      WHERE user_id = ?
    `).bind(userId).first();

    if (!stats) return new Response(JSON.stringify({ error: 'User stats not found' }), { status: 404 });

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function onRequestPost({ request, env, data }) {
  const { user_id, amount } = await request.json();
  
  // Protect route
  if (!data?.user || data.user.id != user_id) {
     return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const db = env.DB;

  try {
    const stats = await db.prepare('SELECT withdrawable_balance FROM user_stats WHERE user_id = ?').bind(user_id).first();
    if (!stats) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

    if (amount < 500) {
      return new Response(JSON.stringify({ error: 'Minimum withdrawal is ₹500' }), { status: 400 });
    }

    if (stats.withdrawable_balance < amount) {
      return new Response(JSON.stringify({ error: 'Insufficient withdrawable balance' }), { status: 400 });
    }

    // Atomic transaction for withdrawal request
    await db.batch([
      // 1. Record request
      db.prepare('INSERT INTO withdraw_requests (user_id, amount, status) VALUES (?, ?, "pending")').bind(user_id, amount),
      
      // 2. Add to Ledger (Negative amount to deduct from system total tracking if needed, but primarily we adjust stats)
      db.prepare('INSERT INTO commission_ledger (user_id, type, amount, description) VALUES (?, "withdrawal_request", ?, "Requested withdrawal")').bind(user_id, -amount),

      // 3. Move from withdrawable to pending
      db.prepare('UPDATE user_stats SET withdrawable_balance = withdrawable_balance - ?, pending_balance = pending_balance + ? WHERE user_id = ?').bind(amount, amount, user_id)
    ]);

    return new Response(JSON.stringify({ message: 'Withdrawal request submitted' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
