export async function onRequestPut({ params, request, env, data }) {
  // Ensure only admin can edit
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const admissionId = params.id;
  const { student_name, student_phone, course_id, status } = await request.json();
  const db = env.DB;

  try {
    let updates = [];
    let values = [];
    
    if (student_name) { updates.push('student_name = ?'); values.push(student_name); }
    if (student_phone) { updates.push('student_phone = ?'); values.push(student_phone); }
    if (course_id) { updates.push('course_id = ?'); values.push(course_id); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) {
        return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
    }

    let query = 'UPDATE admissions SET ' + updates.join(', ') + ' WHERE id = ?';
    values.push(admissionId);
    
    await db.prepare(query).bind(...values).run();

    return new Response(JSON.stringify({ message: 'Admission updated successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
