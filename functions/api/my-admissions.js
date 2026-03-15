export async function onRequestGet({ env, data }) {
  if (!data?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const db = env.DB;
  const userId = data.user.id;

  try {
    const rawAdmissions = await db.prepare(`
      SELECT 
        a.id,
        a.student_name,
        a.student_phone,
        a.status,
        a.created_at,
        c.course_name,
        c.course_price,
        c.points_per_admission as points_earned
      FROM admissions a
      LEFT JOIN courses c ON a.course_id = c.course_id
      WHERE a.admitted_by_user_id = ?
      ORDER BY a.created_at DESC
    `).bind(userId).all();

    return new Response(JSON.stringify(rawAdmissions.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
