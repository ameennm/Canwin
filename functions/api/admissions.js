import { json, error, serverError, readJson } from '../../lib/server/http.js';
import { normalizePhone, isValidMobile } from '../../lib/server/security.js';

// A promoter submits a student. The admission is always credited to the
// logged-in promoter and waits for admin approval.
export async function onRequestPost({ request, env, data }) {
  const { student_name, student_phone, course_id } = await readJson(request);
  const db = env.DB;

  const name = String(student_name || '').trim();
  const phone = normalizePhone(student_phone);
  if (!name) return error('Student name is required');
  if (!isValidMobile(phone)) return error('Enter a valid 10-digit student mobile number');
  if (!course_id) return error('Please choose a course');

  try {
    const course = await db.prepare('SELECT * FROM courses WHERE course_id = ?').bind(course_id).first();
    if (!course) return error('Course not found', 404);

    const now = new Date();
    if (course.status !== 'active' || course.schedule_status === 'closed') {
      return error('Course admissions are closed');
    }
    if (course.admission_start_date && new Date(course.admission_start_date) > now) {
      return error('Course admission has not started yet');
    }
    if (course.admission_end_date && new Date(course.admission_end_date) < now) {
      return error('Course admission period has ended');
    }

    // A student can only be in a course once. If an earlier submission was
    // rejected, that row is reused for the new submission.
    const result = await db.prepare(`
      INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status, referrer_rank_at_admission, course_price_at_admission)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
      ON CONFLICT(student_phone, course_id) DO UPDATE SET
        student_name = excluded.student_name,
        admitted_by_user_id = excluded.admitted_by_user_id,
        status = 'pending',
        referrer_rank_at_admission = excluded.referrer_rank_at_admission,
        course_price_at_admission = excluded.course_price_at_admission,
        created_at = CURRENT_TIMESTAMP,
        approved_by_admin = NULL,
        approved_at = NULL
      WHERE admissions.status = 'rejected'
    `).bind(name, phone, course.course_id, data.user.id, data.user.rank === 'Super Admin' ? null : data.user.rank, course.course_price).run();

    if (!result.meta.changes) {
      return error('This student is already registered for this course.');
    }
    return json({ message: 'Admission submitted for approval' });
  } catch (err) {
    return serverError(err, 'Create admission');
  }
}
