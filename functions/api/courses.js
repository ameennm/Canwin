export async function onRequestPost({ request, env }) {
  const { 
    course_name, price, points,
    level_1_payout, level_2_payout, level_3_payout, level_4_payout, level_5_payout 
  } = await request.json();
  const db = env.DB;

  try {
    const defaultPoints = price ? Math.round(price * 0.2) : 10;
    
    const result = await db.prepare(`
      INSERT INTO courses (
        course_name, course_price, points_per_admission, 
        level_1_payout, level_2_payout, level_3_payout, level_4_payout, level_5_payout,
        commission_pool_percentage, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
        course_name, price || 0, points || defaultPoints,
        level_1_payout || 0, level_2_payout || 0, level_3_payout || 0, level_4_payout || 0, level_5_payout || 0,
        0
    )
      .run();

    return new Response(JSON.stringify({ message: 'Course created successfully', id: result.lastRowId }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function onRequestGet({ env }) {
  const db = env.DB;
  try {
    const courses = await db.prepare(`
        SELECT course_id as id, course_name as name, course_price as price, 
               points_per_admission as points, level_1_payout, level_2_payout, 
               level_3_payout, level_4_payout, level_5_payout, 
               status, created_at, CASE WHEN course_price > 0 THEN "paid" ELSE "free" END as course_type 
        FROM courses 
        ORDER BY created_at DESC`).all();
    return new Response(JSON.stringify(courses.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
