import { json, error, serverError, readJson } from '../../../lib/server/http.js';
import { hashPassword, normalizePhone, isValidMobile } from '../../../lib/server/security.js';
import { findUpline, canRecruit, insertUserStatements } from '../../../lib/server/users.js';

// Every self-registration starts as a pending JSO. The admin approves the
// account and can promote it afterwards; nobody can pick their own rank.
export async function onRequestPost({ request, env }) {
  const { name, phone, email, password, referral_code } = await readJson(request);
  const db = env.DB;

  const cleanName = String(name || '').trim();
  const cleanPhone = normalizePhone(phone);
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanName || !cleanPhone || !cleanEmail || !password) {
    return error('Missing required fields: name, phone, email, password');
  }
  if (!isValidMobile(cleanPhone)) return error('Enter a valid 10-digit mobile number');
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return error('Enter a valid email address');
  if (String(password).length < 6) return error('Password must be at least 6 characters');
  if (!referral_code) return error('Referral code is mandatory');

  try {
    const upline = await findUpline(db, referral_code);
    if (!upline) return error('Invalid referral code');

    const rank = 'JSO';
    if (!canRecruit(upline.rank, rank)) {
      return error(`A ${upline.rank} cannot recruit new members. Please use another referral code.`, 403);
    }

    const { tempCode, statements } = insertUserStatements(db, {
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      passwordHash: await hashPassword(password),
      rank,
      uplineId: upline.id,
      uplineChain: upline.chain,
      status: 'pending',
    });
    await db.batch(statements);

    const created = await db.prepare('SELECT referral_code FROM users WHERE phone = ?').bind(cleanPhone).first();
    return json({ message: 'Registered successfully. Waiting for admin approval.', referral_code: created?.referral_code || tempCode });
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return error('Phone number or email already registered');
    }
    return serverError(err, 'Registration');
  }
}
