export async function onRequestGet({ env }) {
  const db = env.DB;
  try {
    const bonuses = await db.prepare(`
      SELECT b.*, c.course_name 
      FROM bonus_campaigns b
      JOIN courses c ON b.course_id = c.course_id
      ORDER BY b.created_at DESC
    `).all();

    return new Response(JSON.stringify(bonuses.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost({ request, env }) {
  const { course_id, bonus_amount, start_time, end_time, eligible_roles } = await request.json();
  const db = env.DB;

  try {
    await db.prepare(`
      INSERT INTO bonus_campaigns (course_id, bonus_amount, start_time, end_time, eligible_roles)
      VALUES (?, ?, ?, ?, ?)
    `).bind(course_id, bonus_amount, start_time, end_time, eligible_roles)
      .run();

    return new Response(JSON.stringify({ message: 'Bonus campaign created' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
