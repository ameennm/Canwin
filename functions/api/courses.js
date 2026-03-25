export async function onRequestPost({ request, env }) {
  const {
    course_name, price, points, commission_pool_percentage,
    admission_start_date, admission_end_date, course_start_date,
    comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum
  } = await request.json();
  const db = env.DB;

  try {
    const defaultPoints = price ? Math.round(price * 0.2) : 10;
    const hasSchedule = !!(admission_start_date || admission_end_date || course_start_date);
    const hasCommissions = !!(comm_jso || comm_so || comm_sop || comm_sdo || comm_platinum);

    const result = await db.prepare(`
      INSERT INTO courses (
        course_name, course_price, points_per_admission, commission_pool_percentage,
        admission_start_date, admission_end_date, course_start_date,
        comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum,
        schedule_status, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      course_name, price || 0, points || defaultPoints, commission_pool_percentage || 30,
      admission_start_date || null, admission_end_date || null, course_start_date || null,
      comm_jso || 0, comm_so || 0, comm_sop || 0, comm_sdo || 0, comm_platinum || 0,
      hasSchedule ? 'scheduled' : 'unscheduled'
    ).run();

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
      SELECT
        course_id as id,
        course_name as name,
        course_price as price,
        points_per_admission as points,
        commission_pool_percentage,
        admission_start_date,
        admission_end_date,
        course_start_date,
        comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum,
        schedule_status,
        status,
        created_at,
        CASE WHEN course_price > 0 THEN "paid" ELSE "free" END as course_type
      FROM courses
      ORDER BY created_at DESC
    `).all();
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
