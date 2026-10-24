import { json, error, serverError } from '../../../../lib/server/http.js';
import { teamStatsStatements } from '../../../../lib/server/users.js';

// Soft delete: the row stays so admissions and ledger history keep their owner,
// but the account can no longer log in or receive commissions.
export async function onRequestDelete({ params, env, data }) {
  const db = env.DB;
  try {
    const user = await db.prepare('SELECT id, rank, upline_id, upline_chain, state AS status FROM users WHERE id = ?').bind(params.id).first();
    if (!user || user.status === 'deleted') return error('User not found', 404);
    if (user.rank === 'Super Admin' || user.id === data.user.id) return error('The Super Admin account cannot be deleted');

    const result = await db.prepare("UPDATE users SET state = 'deleted', status = 'suspended' WHERE id = ? AND state = ?").bind(user.id, user.status).run();
    if (!result.meta.changes) return error('User was changed by someone else, please refresh', 409);

    if (user.status === 'active') {
      const statements = teamStatsStatements(db, user, -1);
      if (statements.length) await db.batch(statements);
    }

    return json({ message: 'User deleted successfully' });
  } catch (err) {
    return serverError(err, 'Delete user');
  }
}
