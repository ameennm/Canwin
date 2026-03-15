export async function onRequestGet({ env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const db = env.DB;
  try {
    const withdrawals = await db.prepare(`
      SELECT wr.*, u.name as user_name, u.phone as user_phone, u.rank as user_rank
      FROM withdraw_requests wr
      JOIN users u ON wr.user_id = u.id
      ORDER BY wr.created_at DESC
    `).all();

    return new Response(JSON.stringify(withdrawals.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPut({ request, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const { id, status } = await request.json();
  const db = env.DB;

  try {
    const wr = await db.prepare('SELECT * FROM withdraw_requests WHERE id = ?').bind(id).first();
    if (!wr) return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 });
    if (wr.status !== 'pending') return new Response(JSON.stringify({ error: 'Request already processed' }), { status: 400 });

    const batchStatements = [];
    batchStatements.push(db.prepare(`UPDATE withdraw_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(status, id));

    if (status === 'approved') {
      // Amount is already deducted off withdrawable and sitting in pending.
      // So on approval, we just remove it from pending and wallet_balance (Total balance).
      batchStatements.push(
        db.prepare('UPDATE user_stats SET wallet_balance = wallet_balance - ?, pending_balance = pending_balance - ? WHERE user_id = ?')
          .bind(wr.amount, wr.amount, wr.user_id)
      );

      // Ledger: Confirmed
      batchStatements.push(
        db.prepare(`INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, "admin_adjustment", 0, ?, "Approved withdrawal request")`).bind(wr.user_id, id)
      );

    } else if (status === 'rejected') {
      // Refund withdrawable_balance and remove from pending. Wallet total remains unchanged.
      batchStatements.push(
        db.prepare('UPDATE user_stats SET withdrawable_balance = withdrawable_balance + ?, pending_balance = pending_balance - ? WHERE user_id = ?')
          .bind(wr.amount, wr.amount, wr.user_id)
      );
      
      // Ledger: Rejected
      batchStatements.push(
        db.prepare(`INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, "withdrawal_rejected", ?, ?, "Rejected withdrawal refund")`).bind(wr.user_id, wr.amount, id)
      );
    }

    await db.batch(batchStatements);

    return new Response(JSON.stringify({ message: `Withdrawal ${status}` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
