import { json, error, serverError, readJson } from '../../../../lib/server/http.js';

// Only pending admissions can be rejected; approved ones have already paid out.
export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const admissionId = body.admission_id ?? body.admissionId;
  if (!admissionId) return error('admission_id is required');

  try {
    const result = await env.DB.prepare("UPDATE admissions SET status = 'rejected' WHERE id = ? AND status = 'pending'").bind(admissionId).run();
    if (!result.meta.changes) return error('Pending admission not found', 404);
    return json({ message: 'Admission rejected' });
  } catch (err) {
    return serverError(err, 'Reject admission');
  }
}
