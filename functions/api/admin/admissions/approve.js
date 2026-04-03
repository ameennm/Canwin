export async function onRequestPost({ request, env, data }) {
  // Ensure only admin can approve
  if (data.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403 });
  }

  const { admission_id } = await request.json();
  const db = env.DB;

  try {
    // 1. Fetch pending admission
    const admission = await db.prepare('SELECT * FROM admissions WHERE id = ? AND status = "pending"').bind(admission_id).first();
    if (!admission) return new Response(JSON.stringify({ error: 'Pending admission not found' }), { status: 404 });

    // 2. Fetch course to get pool info
    const course = await db.prepare('SELECT * FROM courses WHERE course_id = ?').bind(admission.course_id).first();
    if (!course) return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404 });

    // 3. Schedule enforcement: Check if course admission window is open
    // 4. Fetch referrer and their upline chain (Max 5 levels for hierarchy)
    const referrer = await db.prepare('SELECT id, rank, upline_chain, points FROM users WHERE id = ?').bind(admission.admitted_by_user_id).first();
    let uplineChainIds = [];
    if (referrer) {
       try {
           uplineChainIds = JSON.parse(referrer.upline_chain || '[]');
           // Put referrer at the start of the chain for processing Level 1
           uplineChainIds = [referrer.id, ...uplineChainIds];
       } catch (e) {
           uplineChainIds = [referrer.id];
       }
    }

    // 5. Setup for Distribution (Dynamic Hierarchy Payouts)
    const levelPayouts = [
      course.level_1_payout || 0,
      course.level_2_payout || 0,
      course.level_3_payout || 0,
      course.level_4_payout || 0,
      course.level_5_payout || 0
    ];

    // 6. Check for active bonus campaign (EXCLUSIVELY for Level 1 boost)
    const nowISO = now.toISOString();
    const activeBonus = await db.prepare(`
      SELECT * FROM bonus_campaigns
      WHERE course_id = ? AND start_time <= ? AND end_time >= ? AND status = 'active'
    `).bind(course.course_id, nowISO, nowISO).first();

    let bonusApplied = false;
    let extraBonus = 0;
    if (activeBonus) {
        const eligibleRoles = (activeBonus.eligible_roles || 'ALL').split(',');
        const directReferrer = referrer; // User at Level 1
        if (directReferrer && (eligibleRoles.includes(directReferrer.rank) || activeBonus.eligible_roles === 'ALL')) {
            extraBonus = activeBonus.bonus_amount;
            levelPayouts[0] += extraBonus; // Only Level 1 gets this boost
            bonusApplied = true;
        }
    }

    // Prepare batch statements for atomicity
    const batchStatements = [];

    // 7. Mark admission as approved (CRITICAL for sync)
    batchStatements.push(
      db.prepare('UPDATE admissions SET status = "approved", approved_by_admin = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(data.user.id, admission_id)
    );

    // 8. Iterate max 5 levels for distribution
    for (let i = 0; i < Math.min(uplineChainIds.length, 5); i++) {
        const userId = uplineChainIds[i];
        const user = await db.prepare('SELECT rank, points FROM users WHERE id = ?').bind(userId).first();
        if (!user) continue;

        let amount = levelPayouts[i];
        let type = i === 0 && bonusApplied ? 'bonus' : `commission_level_${i+1}`;

        if (amount > 0) {
            const description = i === 0 && bonusApplied
              ? `Direct Commission + Bonus (Rs.${extraBonus}) for admission ${admission_id}`
              : `Level ${i+1} Uplink Commission for admission ${admission_id}`;

            // Write to Ledger
            batchStatements.push(
                db.prepare(`
                  INSERT INTO commission_ledger (user_id, type, amount, reference_id, description)
                  VALUES (?, ?, ?, ?, ?)
                `).bind(userId, type, amount, admission_id, description)
            );

            // Update user_stats
            batchStatements.push(
                db.prepare(`
                  UPDATE user_stats
                  SET wallet_balance = wallet_balance + ?,
                      withdrawable_balance = withdrawable_balance + ?,
                      total_earnings = total_earnings + ?
                  WHERE user_id = ?
                `).bind(amount, amount, amount, userId)
            );

            // Add points and admissions count to direct referrer only (Level 1)
            if (i === 0) {
               batchStatements.push(
                  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(course.points_per_admission, userId)
               );
               batchStatements.push(
                  db.prepare('UPDATE user_stats SET total_points = total_points + ?, total_admissions = total_admissions + 1 WHERE user_id = ?').bind(course.points_per_admission, userId)
               );

               // Rank Upgrade Logic
               const newPoints = (user.points || 0) + course.points_per_admission;
               let newRank = user.rank;
               if (newPoints >= 500) newRank = 'Platinum';
               else if (newPoints >= 200) newRank = 'SDO';
               else if (newPoints >= 75) newRank = 'SOP';
               else if (newPoints >= 20) newRank = 'SO';

               if (newRank !== user.rank) {
                   batchStatements.push(db.prepare('UPDATE users SET rank = ? WHERE id = ?').bind(newRank, userId));
               }
            }
        }
    }

    // Execute atomic batch
    await db.batch(batchStatements);

    return new Response(JSON.stringify({
        message: 'Admission verified successfully',
        status: 'approved',
        admission_id: admission_id,
        breakdown: {
          level_1_total: levelPayouts[0],
          bonus_included: bonusApplied ? extraBonus : 0,
          hierarchy: levelPayouts
        }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
