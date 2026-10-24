import { json, error, serverError, readJson } from '../../../../lib/server/http.js';
import { approveAdmission } from '../../../../lib/server/commission.js';

export async function onRequestPost({ request, env, data }) {
  const { admission_id } = await readJson(request);
  if (!admission_id) return error('admission_id is required');

  try {
    const result = await approveAdmission(env.DB, admission_id, data.user.id);
    return result.error ? error(result.error, result.status) : json(result.body);
  } catch (err) {
    return serverError(err, 'Approve admission');
  }
}
