import { json, error, serverError, readJson } from '../../../../lib/server/http.js';
import { normalizePhone, isValidMobile } from '../../../../lib/server/security.js';

// Corrects a pending admission's details. Status changes go through the
// approve/reject endpoints so commissions can never be skipped or paid twice.
export async function onRequestPut({ params, request, env }) {
  const { student_name, student_phone, course_id } = await readJson(request);
  const db = env.DB;

  const updates = [];
  const values = [];
  if (student_name) { updates.push('student_name = ?'); values.push(String(student_name).trim()); }
  if (student_phone) {
    const phone = normalizePhone(student_phone);
    if (!isValidMobile(phone)) return error('Enter a valid 10-digit student mobile number');
    updates.push('student_phone = ?'); values.push(phone);
  }
  if (course_id) { updates.push('course_id = ?'); values.push(course_id); }
  if (updates.length === 0) return error('No fields to update');

  try {
    const admission = await db.prepare('SELECT status FROM admissions WHERE id = ?').bind(params.id).first();
    if (!admission) return error('Admission not found', 404);
    if (admission.status !== 'pending') return error('Only pending admissions can be edited');

    await db.prepare(`UPDATE admissions SET ${updates.join(', ')} WHERE id = ? AND status = 'pending'`).bind(...values, params.id).run();
    return json({ message: 'Admission updated successfully' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return error('This student is already registered for this course.');
    }
    return serverError(err, 'Update admission');
  }
}
