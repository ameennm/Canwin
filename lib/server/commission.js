// Commission engine: runs when the admin approves a pending admission.
//
// Level 1 (the promoter who added the student):
//   base     = the course's commission for the promoter's rank (comm_jso, comm_so, ...)
//              or, when that is 0, the course's level_1_payout
//   + offer  = the active special offer's amount for that rank
//   + bonus  = the largest active bonus campaign the rank is eligible for
// Levels 2-5 (the uplines above them): the course's level_N_payout.
//
// Only active promoters are paid; the Super Admin never takes a commission,
// so unpaid shares stay with the company. Every statement is guarded on the
// admission still being pending, so a double click cannot pay twice.

import { parseChain, promotedRank, rankIndex } from './users.js';

const RANK_COMMISSION_COLUMN = { JSO: 'comm_jso', SO: 'comm_so', SOP: 'comm_sop', SDO: 'comm_sdo', Platinum: 'comm_platinum' };
const RANK_OFFER_COLUMN = { JSO: 'jso_amount', SO: 'so_amount', SOP: 'sop_amount', SDO: 'sdo_amount', Platinum: 'platinum_amount' };
const STILL_PENDING = "EXISTS (SELECT 1 FROM admissions WHERE id = ? AND status = 'pending')";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export async function approveAdmission(db, admissionId, adminId) {
  const admission = await db.prepare("SELECT * FROM admissions WHERE id = ? AND status = 'pending'").bind(admissionId).first();
  if (!admission) return { status: 404, error: 'Pending admission not found' };

  const course = await db.prepare('SELECT * FROM courses WHERE course_id = ?').bind(admission.course_id).first();
  if (!course) return { status: 404, error: 'Course not found' };

  const referrer = await db.prepare('SELECT id, rank, state AS status, points, upline_id, upline_chain FROM users WHERE id = ?')
    .bind(admission.admitted_by_user_id).first();
  if (!referrer) return { status: 404, error: 'Promoter not found' };

  const chain = [referrer.id, ...parseChain(referrer.upline_chain)].slice(0, 5);
  const placeholders = chain.map(() => '?').join(',');
  const { results: chainUsers } = await db.prepare(`SELECT id, rank, state AS status FROM users WHERE id IN (${placeholders})`).bind(...chain).all();
  const usersById = Object.fromEntries(chainUsers.map(u => [u.id, u]));

  const rank = admission.referrer_rank_at_admission || referrer.rank;
  const nowIso = new Date().toISOString();

  const rankCommission = Number(course[RANK_COMMISSION_COLUMN[rank]]) || 0;
  const levelPayouts = [
    rankCommission > 0 ? rankCommission : course.level_1_payout,
    course.level_2_payout, course.level_3_payout, course.level_4_payout, course.level_5_payout,
  ].map(round2);

  const offer = RANK_OFFER_COLUMN[rank] ? await db.prepare(`
    SELECT offer_id, ${RANK_OFFER_COLUMN[rank]} AS amount FROM special_offers
    WHERE course_id = ? AND status = 'active' AND valid_until > ?
    ORDER BY created_at DESC LIMIT 1
  `).bind(course.course_id, nowIso).first() : null;
  const offerAmount = round2(offer?.amount);

  const { results: bonuses } = await db.prepare(`
    SELECT bonus_id, bonus_amount, eligible_roles FROM bonus_campaigns
    WHERE course_id = ? AND status = 'active' AND start_time <= ? AND end_time >= ?
  `).bind(course.course_id, nowIso, nowIso).all();
  const eligibleBonuses = bonuses.filter(b => {
    const roles = String(b.eligible_roles || 'ALL').split(',').map(r => r.trim());
    return roles.includes('ALL') || roles.includes(rank);
  });
  const bonusAmount = round2(Math.max(0, ...eligibleBonuses.map(b => b.bonus_amount)));

  const statements = [];
  const ledger = (userId, type, amount, description) => statements.push(
    db.prepare(`
      INSERT INTO commission_ledger (user_id, type, amount, reference_id, description)
      SELECT ?, ?, ?, ?, ? WHERE ${STILL_PENDING}
    `).bind(userId, type, amount, admissionId, description, admissionId)
  );
  const credit = (userId, amount) => statements.push(
    db.prepare(`
      UPDATE user_stats
      SET wallet_balance = wallet_balance + ?, withdrawable_balance = withdrawable_balance + ?, total_earnings = total_earnings + ?
      WHERE user_id = ? AND ${STILL_PENDING}
    `).bind(amount, amount, amount, userId, admissionId)
  );

  const payouts = [];
  chain.forEach((userId, i) => {
    const user = usersById[userId];
    if (!user || user.status !== 'active' || user.rank === 'Super Admin') return;

    const parts = [{ type: `commission_level_${i + 1}`, amount: levelPayouts[i], label: `Level ${i + 1} commission` }];
    if (i === 0) {
      parts.push({ type: 'bonus', amount: offerAmount, label: 'Special offer' });
      parts.push({ type: 'bonus', amount: bonusAmount, label: 'Bonus campaign' });
    }
    let total = 0;
    for (const part of parts) {
      if (part.amount <= 0) continue;
      ledger(userId, part.type, part.amount, `${part.label} for admission #${admissionId} (${admission.student_name})`);
      total += part.amount;
    }
    if (total > 0) {
      credit(userId, round2(total));
      payouts.push({ level: i + 1, user_id: userId, amount: round2(total) });
    }
  });

  // Points, admission count and automatic promotion for the promoter.
  if (referrer.status === 'active' && referrer.rank !== 'Super Admin') {
    const points = Number(course.points_per_admission) || 0;
    statements.push(db.prepare(`UPDATE users SET points = points + ? WHERE id = ? AND ${STILL_PENDING}`).bind(points, referrer.id, admissionId));
    statements.push(db.prepare(`
      UPDATE user_stats SET total_points = total_points + ?, total_admissions = total_admissions + 1
      WHERE user_id = ? AND ${STILL_PENDING}
    `).bind(points, referrer.id, admissionId));

    const uplineRank = referrer.upline_id ? usersById[referrer.upline_id]?.rank
      ?? (await db.prepare('SELECT rank FROM users WHERE id = ?').bind(referrer.upline_id).first())?.rank : null;
    const newRank = promotedRank(referrer.rank, (referrer.points || 0) + points, uplineRank);
    if (rankIndex(newRank) > rankIndex(referrer.rank)) {
      statements.push(db.prepare(`UPDATE users SET rank = ? WHERE id = ? AND ${STILL_PENDING}`).bind(newRank, referrer.id, admissionId));
    }
  }

  // Must run last: everything above checks that the admission is still pending.
  statements.push(db.prepare(`
    UPDATE admissions
    SET status = 'approved', approved_by_admin = ?, approved_at = CURRENT_TIMESTAMP,
        course_price_at_admission = COALESCE(course_price_at_admission, ?)
    WHERE id = ? AND status = 'pending'
  `).bind(adminId, course.course_price, admissionId));

  const results = await db.batch(statements);
  if (!results[results.length - 1].meta.changes) {
    return { status: 409, error: 'This admission was already processed' };
  }

  return {
    status: 200,
    body: {
      message: 'Admission approved and commissions paid',
      admission_id: Number(admissionId),
      payouts,
      level_1: { base: levelPayouts[0], special_offer: offerAmount, bonus: bonusAmount },
    },
  };
}
