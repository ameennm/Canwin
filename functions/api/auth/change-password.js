import { json, error, serverError, readJson } from '../../../lib/server/http.js';
import { hashPassword, verifyPassword } from '../../../lib/server/security.js';

// Logged-in users (including the admin) change their own password.
export async function onRequestPost({ request, env, data }) {
  const { current_password, new_password } = await readJson(request);
  if (!current_password || !new_password) return error('Current and new password are required');
  if (String(new_password).length < 6) return error('New password must be at least 6 characters');

  const db = env.DB;
  try {
    const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(data.user.id).first();
    const { ok } = await verifyPassword(current_password, user?.password_hash);
    if (!ok) return error('Current password is incorrect', 401);

    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(new_password), data.user.id).run();
    return json({ message: 'Password changed successfully' });
  } catch (err) {
    return serverError(err, 'Change password');
  }
}
