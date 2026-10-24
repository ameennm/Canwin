import { json, error, serverError, readJson } from '../../../lib/server/http.js';

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT wr.*, u.name as user_name, u.phone as user_phone, u.rank as user_rank
      FROM withdraw_requests wr
      JOIN users u ON wr.user_id = u.id
      ORDER BY wr.created_at DESC
    `).all();
    return json(results);
  } catch (err) {
    return serverError(err, 'List withdrawals');
  }
}

// Allowed moves: pending -> approved -> paid, and pending/approved -> rejected.
const ALLOWED_FROM = {
  approved: ['pending'],
  paid: ['pending', 'approved'],
  rejected: ['pending', 'approved'],
};

export async function onRequestPut({ request, env }) {
  const { id, status } = await readJson(request);
  const from = ALLOWED_FROM[status];
  if (!id || !from) return error('Status must be approved, paid or rejected');

  const db = env.DB;
  try {
    const wr = await db.prepare('SELECT * FROM withdraw_requests WHERE id = ?').bind(id).first();
    if (!wr) return error('Request not found', 404);
    if (!from.includes(wr.status)) return error(`Cannot change a ${wr.status} request to ${status}`);

    // Balance changes are guarded on the request still being in the status we
    // read, and the status update runs last, so a double click is a no-op.
    const placeholders = from.map(() => '?').join(',');
    const stillOpen = `EXISTS (SELECT 1 FROM withdraw_requests WHERE id = ? AND status IN (${placeholders}))`;
    const statements = [];

    if (status === 'paid') {
      statements.push(db.prepare(`
        UPDATE user_stats SET wallet_balance = wallet_balance - ?, pending_balance = pending_balance - ?, total_paid = total_paid + ?
        WHERE user_id = ? AND ${stillOpen}
      `).bind(wr.amount, wr.amount, wr.amount, wr.user_id, id, ...from));
    } else if (status === 'rejected') {
      statements.push(db.prepare(`
        UPDATE user_stats SET withdrawable_balance = withdrawable_balance + ?, pending_balance = pending_balance - ?
        WHERE user_id = ? AND ${stillOpen}
      `).bind(wr.amount, wr.amount, wr.user_id, id, ...from));
      statements.push(db.prepare(`
        INSERT INTO commission_ledger (user_id, type, amount, reference_id, description)
        SELECT ?, 'withdrawal_rejected', ?, ?, 'Withdrawal rejected - amount returned' WHERE ${stillOpen}
      `).bind(wr.user_id, wr.amount, id, id, ...from));
    }

    statements.push(db.prepare(`
      UPDATE withdraw_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN (${placeholders})
    `).bind(status, id, ...from));

    const results = await db.batch(statements);
    if (!results[results.length - 1].meta.changes) return error('Request was already processed', 409);

    return json({ message: `Withdrawal ${status}` });
  } catch (err) {
    return serverError(err, 'Update withdrawal');
  }
}
