import { json, error, serverError } from '../../../../lib/server/http.js';
import { teamStatsStatements } from '../../../../lib/server/users.js';

// Activates a self-registered (pending) promoter and adds them to their uplines' team counts.
export async function onRequestPost({ params, env }) {
  const db = env.DB;
  try {
    const user = await db.prepare('SELECT id, upline_id, upline_chain, state AS status FROM users WHERE id = ?').bind(params.id).first();
    if (!user) return error('User not found', 404);
    if (user.status !== 'pending') return error(`User is already ${user.status}`, 409);

    // Only the request that actually flips pending -> active updates the team counts.
    const flipped = await db.prepare("UPDATE users SET state = 'active', status = 'active' WHERE id = ? AND state = 'pending'").bind(user.id).run();
    if (!flipped.meta.changes) return error('User was already approved', 409);

    const statements = teamStatsStatements(db, user, 1);
    if (statements.length) await db.batch(statements);

    return json({ message: 'User approved' });
  } catch (err) {
    return serverError(err, 'Approve user');
  }
}
