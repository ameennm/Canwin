export async function onRequestPut({ params, request, env }) {
  const courseId = params.id;
  const {
    course_name, price, points, commission_pool_percentage, status,
    admission_start_date, admission_end_date, course_start_date,
    comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum
  } = await request.json();
  const db = env.DB;

  try {
    // Check if course has schedule dates
    const hasSchedule = !!(admission_start_date || admission_end_date || course_start_date);

    await db.prepare(`
      UPDATE courses
      SET course_name = ?,
          course_price = ?,
          points_per_admission = ?,
          commission_pool_percentage = ?,
          status = ?,
          admission_start_date = ?,
          admission_end_date = ?,
          course_start_date = ?,
          comm_jso = ?,
          comm_so = ?,
          comm_sop = ?,
          comm_sdo = ?,
          comm_platinum = ?,
          schedule_status = ?
      WHERE course_id = ?
    `).bind(
      course_name, price, points, commission_pool_percentage, status,
      admission_start_date || null, admission_end_date || null, course_start_date || null,
      comm_jso || 0, comm_so || 0, comm_sop || 0, comm_sdo || 0, comm_platinum || 0,
      hasSchedule ? 'scheduled' : 'unscheduled',
      courseId
    ).run();

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
