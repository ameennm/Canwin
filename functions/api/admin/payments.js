import { json, error, serverError, readJson } from '../../../lib/server/http.js';

// The admin records money they paid a promoter outside the website
// (GPay, UPI, bank). No request from the promoter is needed.
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const userId = Number(body.user_id);
  const amount = Math.round(Number(body.amount) * 100) / 100;
  const note = String(body.note || '').trim().slice(0, 300) || null;

  if (!userId) return error('Choose a promoter');
  if (!Number.isFinite(amount) || amount <= 0) return error('Enter the amount you paid');

  const db = env.DB;
  try {
    const user = await db.prepare("SELECT id, rank FROM users WHERE id = ? AND state != 'deleted'").bind(userId).first();
    if (!user || user.rank === 'Super Admin') return error('Promoter not found', 404);

    // Only take it if it is not more than what the promoter is owed.
    const paid = await db.prepare(`
      UPDATE user_stats
      SET withdrawable_balance = withdrawable_balance - ?, wallet_balance = wallet_balance - ?, total_paid = total_paid + ?
      WHERE user_id = ? AND withdrawable_balance >= ?
    `).bind(amount, amount, amount, userId, amount).run();
    if (!paid.meta.changes) {
      const owed = await db.prepare('SELECT withdrawable_balance FROM user_stats WHERE user_id = ?').bind(userId).first();
      return error(`This is more than the promoter is owed (₹${Number(owed?.withdrawable_balance || 0).toLocaleString('en-IN')})`);
    }

    try {
      await db.batch([
        db.prepare(`
          INSERT INTO withdraw_requests (user_id, amount, paid_amount, status, source, note, paid_at, updated_at)
          VALUES (?, ?, ?, 'paid', 'admin', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(userId, amount, amount, note),
        db.prepare(`
          INSERT INTO commission_ledger (user_id, type, amount, description)
          VALUES (?, 'admin_adjustment', ?, ?)
        `).bind(userId, -amount, note ? `Paid by admin: ${note}` : 'Paid by admin'),
      ]);
    } catch (err) {
      await db.prepare(`
        UPDATE user_stats SET withdrawable_balance = withdrawable_balance + ?, wallet_balance = wallet_balance + ?, total_paid = total_paid - ?
        WHERE user_id = ?
      `).bind(amount, amount, amount, userId).run();
      throw err;
    }

    return json({ message: `Payment of ₹${amount.toLocaleString('en-IN')} recorded` });
  } catch (err) {
    return serverError(err, 'Record payment');
  }
}
