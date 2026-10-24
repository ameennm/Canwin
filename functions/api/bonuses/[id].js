import { json, error, serverError, readJson } from '../../../lib/server/http.js';

// Admin only (enforced in _middleware.js).
export async function onRequestPut({ params, request, env }) {
  const { status } = await readJson(request);
  if (!['active', 'inactive', 'expired'].includes(status)) return error('Invalid status');

  try {
    await env.DB.prepare('UPDATE bonus_campaigns SET status = ? WHERE bonus_id = ?').bind(status, params.id).run();
    return json({ message: 'Bonus campaign updated' });
  } catch (err) {
    return serverError(err, 'Update bonus');
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    await env.DB.prepare('DELETE FROM bonus_campaigns WHERE bonus_id = ?').bind(params.id).run();
    return json({ message: 'Bonus campaign deleted' });
  } catch (err) {
    return serverError(err, 'Delete bonus');
  }
}
