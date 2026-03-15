export async function onRequestGet({ env, data }) {
  // Ensure only admin can read
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const db = env.DB;
  try {
    const stats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users) as totalPromoters,
        (SELECT COUNT(*) FROM admissions) as totalStudents,
        (SELECT SUM(course_price) FROM courses c JOIN admissions a ON c.course_id = a.course_id WHERE a.status = 'approved') as revenue,
        (SELECT SUM(amount) FROM commission_ledger WHERE type LIKE 'commission_%' OR type = 'bonus') as totalCommissions,
        (SELECT COUNT(*) FROM admissions a JOIN courses c ON c.course_id = a.course_id WHERE c.course_price > 0 AND a.status = 'approved') as paidReferrals,
        (SELECT COUNT(*) FROM admissions a JOIN courses c ON c.course_id = a.course_id WHERE c.course_price <= 0 AND a.status = 'approved') as freeReferrals
      FROM users LIMIT 1
    `).first();

    const revenue = stats?.revenue || 0;
    const commissions = stats?.totalCommissions || 0;
    const profit = revenue - commissions;

    return new Response(JSON.stringify({
      totalPromoters: stats?.totalPromoters || 0,
      totalStudents: stats?.totalStudents || 0,
      revenue,
      commissions,
      profit,
      paidReferrals: stats?.paidReferrals || 0,
      freeReferrals: stats?.freeReferrals || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
