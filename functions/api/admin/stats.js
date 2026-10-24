import { json, serverError } from '../../../lib/server/http.js';

export async function onRequestGet({ env }) {
  try {
    const stats = await env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE rank != 'Super Admin' AND state IN ('active', 'suspended')) AS totalPromoters,
        (SELECT COUNT(*) FROM users WHERE state = 'pending') AS pendingPromoters,
        (SELECT COUNT(*) FROM admissions) AS totalStudents,
        (SELECT COUNT(*) FROM admissions WHERE status = 'pending') AS pendingAdmissions,
        (SELECT COALESCE(SUM(a.course_price_at_admission), 0) FROM admissions a WHERE a.status = 'approved') AS revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM commission_ledger WHERE type LIKE 'commission_%' OR type = 'bonus') AS commissions,
        (SELECT COALESCE(SUM(total_paid), 0) FROM user_stats) AS paidOut,
        (SELECT COALESCE(SUM(amount), 0) FROM withdraw_requests WHERE status IN ('pending', 'approved')) AS pendingWithdrawals,
        (SELECT COUNT(*) FROM admissions WHERE status = 'approved' AND course_price_at_admission > 0) AS paidReferrals,
        (SELECT COUNT(*) FROM admissions WHERE status = 'approved' AND COALESCE(course_price_at_admission, 0) <= 0) AS freeReferrals
    `).first();

    return json({ ...stats, profit: (stats.revenue || 0) - (stats.commissions || 0) });
  } catch (err) {
    return serverError(err, 'Admin stats');
  }
}
