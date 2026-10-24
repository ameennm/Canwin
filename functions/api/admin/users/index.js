import { json, error, serverError, readJson } from '../../../../lib/server/http.js';
import { hashPassword, normalizePhone, isValidMobile } from '../../../../lib/server/security.js';
import { normalizeRank, findUpline, canRecruit, insertUserStatements, teamStatsStatements } from '../../../../lib/server/users.js';

// Admin creates an already-active promoter at any rank below their upline.
export async function onRequestPost({ request, env }) {
  const { name, phone, email, password, rank, upline_referral_code } = await readJson(request);
  const db = env.DB;

  const cleanName = String(name || '').trim();
  const cleanPhone = normalizePhone(phone);
  const cleanEmail = String(email || '').trim().toLowerCase();
  const newRank = normalizeRank(rank);

  if (!cleanName || !cleanPhone || !cleanEmail || !password) {
    return error('Missing required fields: name, phone, email, password');
  }
  if (!isValidMobile(cleanPhone)) return error('Enter a valid 10-digit mobile number');
  if (!newRank) return error('Invalid rank. Must be JSO, SO, SOP, SDO, or Platinum');
  if (String(password).length < 6) return error('Password must be at least 6 characters');

  try {
    const upline = await findUpline(db, upline_referral_code || 'ADMIN');
    if (!upline) return error('Upline referral code not found');
    if (!canRecruit(upline.rank, newRank)) {
      return error(`A ${newRank} cannot be placed under a ${upline.rank}. Choose a higher-ranked upline.`);
    }

    const { statements } = insertUserStatements(db, {
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      passwordHash: await hashPassword(password),
      rank: newRank,
      uplineId: upline.id,
      uplineChain: upline.chain,
      status: 'active',
    });
    statements.push(...teamStatsStatements(db, { upline_id: upline.id, upline_chain: JSON.stringify(upline.chain) }, 1));
    await db.batch(statements);

    const created = await db.prepare('SELECT referral_code FROM users WHERE phone = ?').bind(cleanPhone).first();
    return json({ message: 'User created successfully', referral_code: created?.referral_code });
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return error('Phone or Email already registered');
    }
    return serverError(err, 'Create user');
  }
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(`
      SELECT u.id, u.name, u.phone, u.email, u.rank, u.referral_code, u.upline_id, u.upline_chain, u.points, u.state AS status, u.created_at,
             s.wallet_balance, s.withdrawable_balance, u.points AS total_points, s.total_earnings, s.direct_referrals, s.team_size, s.total_admissions
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      WHERE u.state != 'deleted'
      ORDER BY u.created_at DESC
    `).all();
    return json(results);
  } catch (err) {
    return serverError(err, 'List users');
  }
}
