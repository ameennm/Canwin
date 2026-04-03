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

    if (status === 'paid') {
      // Final step: Deduct from pending (where it was held) and from overall wallet balance.
      // Also increment total_paid tracking.
      batchStatements.push(
        db.prepare('UPDATE user_stats SET wallet_balance = wallet_balance - ?, pending_balance = pending_balance - ?, total_paid = total_paid + ? WHERE user_id = ?')
          .bind(wr.amount, wr.amount, wr.amount, wr.user_id)
      );

      // Ledger: Confirmed Payout
      batchStatements.push(
        db.prepare(`INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, "admin_adjustment", ?, ?, "Withdrawal marked as PAID")`).bind(wr.user_id, -wr.amount, id)
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
    // Note: status === 'approved' just updates the status in the first statement, 
    // keeping the funds in pending_balance until 'paid' is clicked.

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
