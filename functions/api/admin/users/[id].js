import { json, error, serverError, readJson } from '../../../../lib/server/http.js';
import { hashPassword, normalizePhone, isValidMobile } from '../../../../lib/server/security.js';
import { normalizeRank, teamStatsStatements, legacyStatus } from '../../../../lib/server/users.js';

export async function onRequestPut({ params, request, env, data }) {
  const body = await readJson(request);
  const db = env.DB;

  try {
    const user = await db.prepare('SELECT id, rank, upline_id, upline_chain, state AS status FROM users WHERE id = ?').bind(params.id).first();
    if (!user || user.status === 'deleted') return error('User not found', 404);

    const updates = [];
    const values = [];
    const set = (column, value) => { updates.push(`${column} = ?`); values.push(value); };

    if (body.name) set('name', String(body.name).trim());
    if (body.phone) {
      const phone = normalizePhone(body.phone);
      if (user.rank !== 'Super Admin' && !isValidMobile(phone)) return error('Enter a valid 10-digit mobile number');
      set('phone', phone);
    }
    if (body.email) set('email', String(body.email).trim().toLowerCase());
    if (body.password) {
      if (String(body.password).length < 6) return error('Password must be at least 6 characters');
      set('password_hash', await hashPassword(body.password));
    }
    if (body.rank && body.rank !== user.rank) {
      if (user.rank === 'Super Admin') return error("The Super Admin's rank cannot be changed");
      const rank = normalizeRank(body.rank);
      if (!rank) return error('Invalid rank. Must be JSO, SO, SOP, SDO, or Platinum');
      set('rank', rank);
    }

    let teamDelta = 0;
    if (body.status && body.status !== user.status) {
      if (!['active', 'suspended'].includes(body.status)) return error('Status must be active or suspended');
      if (user.id === data.user.id) return error('You cannot change your own status');
      set('state', body.status);
      set('status', legacyStatus(body.status));
      if (body.status === 'active') teamDelta = 1;
      else if (user.status === 'active') teamDelta = -1;
    }

    const statements = [];
    if (updates.length > 0) {
      statements.push(db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values, user.id));
    }
    if (body.points !== undefined && body.points !== '') {
      const points = Math.max(Math.round(Number(body.points) || 0), 0);
      statements.push(db.prepare('UPDATE users SET points = ? WHERE id = ?').bind(points, user.id));
      statements.push(db.prepare('UPDATE user_stats SET total_points = ? WHERE user_id = ?').bind(points, user.id));
    }
    if (teamDelta) statements.push(...teamStatsStatements(db, user, teamDelta));
    if (statements.length === 0) return error('No fields to update');

    await db.batch(statements);
    return json({ message: 'User updated successfully' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return error('Phone number or email already in use');
    }
    return serverError(err, 'Update user');
  }
}
