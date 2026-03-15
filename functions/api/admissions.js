export async function onRequestPost({ request, env }) {
  const { student_name, student_phone, course_id, admitted_by } = await request.json();
  const db = env.DB;

  try {
    // 1. Fetch course details
    const course = await db.prepare('SELECT * FROM courses WHERE course_id = ?').bind(course_id).first();
    if (!course) return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404 });

    // 2. Fetch referrer (The person adding the student)
    const referrer = await db.prepare('SELECT id FROM users WHERE id = ?').bind(admitted_by).first();
    if (!referrer) return new Response(JSON.stringify({ error: 'Referrer not found' }), { status: 404 });

    // 3. Record Admission as Pending
    try {
      const result = await db.prepare(`
        INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).bind(student_name, student_phone, course_id, admitted_by)
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
