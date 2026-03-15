export async function onRequestGet({ env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const db = env.DB;
  try {
    const rawReferrals = await db.prepare(`
      SELECT 
        a.id,
        a.student_name,
        a.student_phone,
        a.status,
        a.created_at,
        a.admitted_by_user_id,
        c.course_name,
        c.course_price,
        u.name as admitted_by_name,
        u.rank as admitted_by_rank
      FROM admissions a
      LEFT JOIN courses c ON a.course_id = c.course_id
      LEFT JOIN users u ON a.admitted_by_user_id = u.id
      ORDER BY a.created_at DESC
    `).all();

    const formattedReferrals = rawReferrals.results.map(r => ({
      ...r,
      course_type: r.course_price > 0 ? 'paid' : 'free'
    }));

    return new Response(JSON.stringify(formattedReferrals), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
