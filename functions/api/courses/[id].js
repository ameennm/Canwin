export async function onRequestPut({ params, request, env }) {
  const courseId = params.id;
  const { course_name, price, points, commission_pool_percentage, status } = await request.json();
  const db = env.DB;

  try {
    await db.prepare(`
      UPDATE courses 
      SET course_name = ?, course_price = ?, points_per_admission = ?, commission_pool_percentage = ?, status = ?
      WHERE course_id = ?
    `).bind(course_name, price, points, commission_pool_percentage, status, courseId)
      .run();

    return new Response(JSON.stringify({ message: 'Course updated' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function onRequestDelete({ params, env }) {
  const courseId = params.id;
  const db = env.DB;

  try {
    // Check if referrals exist
    const refCount = await db.prepare('SELECT COUNT(*) as count FROM admissions WHERE course_id = ?').bind(courseId).first();
    if (refCount.count > 0) {
      return new Response(JSON.stringify({ error: 'Cannot delete course with attached referrals' }), { status: 400 });
    }

    await db.prepare('DELETE FROM courses WHERE course_id = ?').bind(courseId).run();

    return new Response(JSON.stringify({ message: 'Course deleted' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
