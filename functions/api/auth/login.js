import * as jwt from '@tsndr/cloudflare-worker-jwt';
import { json, error, serverError, readJson } from '../../../lib/server/http.js';
import { verifyPassword, hashPassword, normalizePhone, isLoginLocked, recordFailedLogin, clearFailedLogins } from '../../../lib/server/security.js';

const STATUS_MESSAGES = {
  pending: 'Your account is waiting for admin approval',
  suspended: 'Account is suspended',
  deleted: 'Account has been deleted',
};

export async function onRequestPost({ request, env }) {
  const { phone, password } = await readJson(request);
  const db = env.DB;

  if (!phone || !password) return error('Phone and password are required');
  if (!env.JWT_SECRET) return error('Server misconfigured: JWT_SECRET is not set', 500);

  const rawPhone = String(phone).trim();
  const loginKey = normalizePhone(rawPhone).toLowerCase();

  try {
    if (await isLoginLocked(db, loginKey)) {
      return error('Too many failed attempts. Please try again in 15 minutes.', 429);
    }

    // Older accounts may have been saved with +91 or spaces, so match both forms.
    const user = await db.prepare(`
      SELECT id, name, rank, referral_code, points, state AS status, password_hash
      FROM users WHERE phone = ? OR phone = ? LIMIT 1
    `).bind(rawPhone, normalizePhone(rawPhone)).first();

    const { ok, needsRehash } = user ? await verifyPassword(password, user.password_hash) : { ok: false };
    if (!ok) {
      await recordFailedLogin(db, loginKey);
      return error('Invalid credentials', 401);
    }
    await clearFailedLogins(db, loginKey);

    if (user.status !== 'active') {
      return error(STATUS_MESSAGES[user.status] || 'Account is not active', 403);
    }

    if (needsRehash) {
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(password), user.id).run();
    }

    const stats = await db.prepare('SELECT wallet_balance FROM user_stats WHERE user_id = ?').bind(user.id).first() || {};
    const token = await jwt.sign({
      id: user.id,
      rank: user.rank,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    }, env.JWT_SECRET);

    return json({
      token,
      user: {
        id: user.id,
        name: user.name,
        rank: user.rank,
        referral_code: user.referral_code,
        points: user.points,
        wallet_balance: stats.wallet_balance || 0,
      }
    });
  } catch (err) {
    return serverError(err, 'Login');
  }
}
