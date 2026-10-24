import { json, error, serverError, readJson, isAdmin } from '../../lib/server/http.js';

const MIN_WITHDRAWAL = 500;

export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id') || data.user.id;

  if (data.user.id != userId && !isAdmin(data)) {
    return error('Unauthorized', 403);
  }

  const db = env.DB;
  try {
    await db.prepare('INSERT OR IGNORE INTO user_stats (user_id) SELECT id FROM users WHERE id = ?').bind(userId).run();
    const stats = await db.prepare(`
      SELECT s.wallet_balance, s.withdrawable_balance, s.pending_balance, s.total_paid, u.points AS total_points,
             s.total_earnings, s.direct_referrals, s.team_size, s.total_admissions, u.rank
      FROM user_stats s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `).bind(userId).first();
    if (!stats) return error('User not found', 404);

    const { results: withdrawals } = await db.prepare(`
      SELECT id, amount, status, upi_id, bank_name, account_number, created_at, updated_at
      FROM withdraw_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
    `).bind(userId).all();

    return json({ ...stats, withdrawals });
  } catch (err) {
    return serverError(err, 'Wallet');
  }
}

// Requests a payout. Either a UPI ID or full bank details are required so the
// admin knows where to send the money.
export async function onRequestPost({ request, env, data }) {
  const body = await readJson(request);
  const amount = Math.round(Number(body.amount) * 100) / 100;
  const upiId = String(body.upi_id || '').trim();
  const bankName = String(body.bank_name || '').trim();
  const accountNumber = String(body.account_number || '').replace(/\s/g, '');
  const ifsc = String(body.ifsc || '').trim().toUpperCase();
  const userId = data.user.id;

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
    return error(`Minimum withdrawal is ₹${MIN_WITHDRAWAL}`);
  }
  const hasUpi = /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId);
  const hasBank = bankName && /^\d{6,18}$/.test(accountNumber) && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  if (!hasUpi && !hasBank) {
    return error('Enter a valid UPI ID, or bank name, account number and IFSC');
  }

  const db = env.DB;
  try {
    // Deduct only if the balance covers it, in one statement, so two quick
    // requests can never take more than the user has.
    const hold = await db.prepare(`
      UPDATE user_stats
      SET withdrawable_balance = withdrawable_balance - ?, pending_balance = pending_balance + ?
      WHERE user_id = ? AND withdrawable_balance >= ?
    `).bind(amount, amount, userId, amount).run();
    if (!hold.meta.changes) return error('Insufficient withdrawable balance');

    try {
      const created = await db.prepare(`
        INSERT INTO withdraw_requests (user_id, amount, bank_name, account_number, ifsc, upi_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).bind(userId, amount, hasBank ? bankName : null, hasBank ? accountNumber : null, hasBank ? ifsc : null, hasUpi ? upiId : null).run();
      await db.prepare(`
        INSERT INTO commission_ledger (user_id, type, amount, reference_id, description)
        VALUES (?, 'withdrawal_request', ?, ?, 'Withdrawal requested')
      `).bind(userId, -amount, created.meta.last_row_id).run();
    } catch (err) {
      await db.prepare('UPDATE user_stats SET withdrawable_balance = withdrawable_balance + ?, pending_balance = pending_balance - ? WHERE user_id = ?')
        .bind(amount, amount, userId).run();
      throw err;
    }

    return json({ message: 'Withdrawal request submitted' });
  } catch (err) {
    return serverError(err, 'Withdrawal request');
  }
}
