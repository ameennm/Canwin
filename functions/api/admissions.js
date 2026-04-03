export async function onRequestPost({ request, env }) {
  const { student_name, student_phone, course_id, admitted_by } = await request.json();
  const db = env.DB;

  try {
    // 1. Fetch course details
    const course = await db.prepare('SELECT * FROM courses WHERE course_id = ?').bind(course_id).first();
    if (!course) return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404 });

    // 2. Fetch referrer with rank
    const referrer = await db.prepare('SELECT id, rank FROM users WHERE id = ?').bind(admitted_by).first();
    if (!referrer) return new Response(JSON.stringify({ error: 'Referrer not found' }), { status: 404 });

    // 3. Check if course is open for admission (schedule enforcement)
    const now = new Date();
    if (course.admission_start_date && new Date(course.admission_start_date) > now) {
      return new Response(JSON.stringify({ error: 'Course admission has not started yet' }), { status: 400 });
    }
    if (course.admission_end_date && new Date(course.admission_end_date) < now) {
      return new Response(JSON.stringify({ error: 'Course admission period has ended' }), { status: 400 });
    }
    if (course.status === 'closed' || course.schedule_status === 'closed') {
      return new Response(JSON.stringify({ error: 'Course admissions are closed' }), { status: 400 });
    }

    // 4. Capture referrer's rank at admission time (for commission calculation)
    const referrerRankAtAdmission = referrer.rank;

    // 5. Record Admission as Pending
    try {
      const result = await db.prepare(`
        INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status, referrer_rank_at_admission)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).bind(student_name, student_phone, course_id, admitted_by, referrerRankAtAdmission)
        .run();

      return new Response(JSON.stringify({
          message: 'Admission submitted for approval',
          id: result.lastRowId
      }), { headers: { 'Content-Type': 'application/json' } });

    } catch (dbError) {
       if (dbError.message.includes('UNIQUE constraint failed')) {
           return new Response(JSON.stringify({ error: 'This student is already registered for this course.' }), { status: 400 });
       }
       throw dbError;
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
