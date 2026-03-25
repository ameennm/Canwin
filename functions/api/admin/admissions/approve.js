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
    const now = new Date();
    if (course.admission_end_date && new Date(course.admission_end_date) < now) {
      return new Response(JSON.stringify({ error: 'Course admission period has ended' }), { status: 400 });
    }
    if (course.admission_start_date && new Date(course.admission_start_date) > now) {
      return new Response(JSON.stringify({ error: 'Course admission period has not started yet' }), { status: 400 });
    }

    // 4. Fetch referrer and their upline chain
    const referrer = await db.prepare('SELECT id, rank, upline_chain, points FROM users WHERE id = ?').bind(admission.admitted_by_user_id).first();
    let uplineChainIds = [];
    if (referrer) {
       try {
           uplineChainIds = JSON.parse(referrer.upline_chain || '[]');
       } catch (e) {
           uplineChainIds = [referrer.id];
       }
    }

    // Prepare batch statements for atomicity
    const batchStatements = [];

    // 5. Mark admission as approved
    batchStatements.push(
      db.prepare('UPDATE admissions SET status = "approved", approved_by_admin = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(data.user.id, admission_id)
    );

    // 6. Determine referrer's rank for commission lookup
    // Use stored rank if available (captured at admission creation time)
    const referrerRank = admission.referrer_rank_at_admission || referrer?.rank || 'JSO';

    // 7. Build rank-to-commission mapping from course
    const rankCommissionMap = {
      'JSO': course.comm_jso || 0,
      'SO': course.comm_so || 0,
      'SOP': course.comm_sop || 0,
      'SDO': course.comm_sdo || 0,
      'Platinum': course.comm_platinum || 0,
      'Super Admin': course.comm_platinum || 0,
    };

    // 8. Check for active special offer for this course
    const nowISO = now.toISOString();
    const activeOffer = await db.prepare(`
      SELECT * FROM special_offers
      WHERE course_id = ? AND valid_until >= ? AND status = 'active'
    `).bind(course.course_id, nowISO).first();

    // Get the base commission for direct referrer
    const baseCommission = rankCommissionMap[referrerRank] || 0;

    // If offer exists, ADD offer amount on top of base commission
    let directReferrerCommission = baseCommission;
    let offerApplied = false;
    if (activeOffer) {
      const offerMap = {
        'JSO': activeOffer.jso_amount,
        'SO': activeOffer.so_amount,
        'SOP': activeOffer.sop_amount,
        'SDO': activeOffer.sdo_amount,
        'Platinum': activeOffer.platinum_amount,
      };
      const offerBonus = offerMap[referrerRank] || 0;
      directReferrerCommission += offerBonus;
      offerApplied = true;
    }

    // 9. Check for active bonus campaign (legacy bonus - applied on top of everything)
    const activeBonus = await db.prepare(`
      SELECT * FROM bonus_campaigns
      WHERE course_id = ? AND start_time <= ? AND end_time >= ? AND status = 'active'
    `).bind(course.course_id, nowISO, nowISO).first();

    // 10. Level distribution percentages
    // Level 1 = 46.7%, Level 2 = 26.7%, Level 3 = 13.3%, Level 4 = 6.7%, Level 5 = 6.6%
    const levelPercentages = [46.7, 26.7, 13.3, 6.7, 6.6];

    // Iterate max 5 levels
    for (let i = 0; i < Math.min(uplineChainIds.length, 5); i++) {
        const userId = uplineChainIds[i];

        const user = await db.prepare('SELECT rank, points FROM users WHERE id = ?').bind(userId).first();
        if (!user) continue;

        // FIXED BUG: percentage is raw number (46.7), so amount = commission * percentage / 100
        // The directReferrerCommission is the L1 (direct referrer) total commission
        // Each level gets a percentage of that total
        const levelPercentage = levelPercentages[i];
        let amount = directReferrerCommission * levelPercentage / 100;
        let type = `commission_level_${i+1}`;

        // Apply legacy bonus to Level 1 only (on top of everything)
        if (i === 0 && activeBonus) {
            const eligibleRoles = (activeBonus.eligible_roles || 'ALL').split(',');
            if (eligibleRoles.includes(user.rank) || activeBonus.eligible_roles === 'ALL') {
                amount += activeBonus.bonus_amount;
                type = offerApplied ? 'special_offer' : 'bonus';
            }
        }

        if (amount > 0) {
            const description = offerApplied
              ? `Commission for admission ${admission_id} (Special Offer applied: +Rs.${
                  (offerMap || {})[referrerRank] || 0
                } bonus commission)`
              : `Commission for admission ${admission_id}`;

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

            // Add points to direct referrer only (Level 1)
            if (i === 0) {
               batchStatements.push(
                  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(course.points_per_admission, userId)
               );
               batchStatements.push(
                  db.prepare('UPDATE user_stats SET total_points = total_points + ?, total_admissions = total_admissions + 1 WHERE user_id = ?').bind(course.points_per_admission, userId)
               );

               // Role Upgrade Logic for direct referrer based on points
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
        message: 'Admission approved and commissions distributed successfully',
        breakdown: {
          referrerRank,
          baseCommission,
          specialOfferApplied: offerApplied,
          offerBonus: offerApplied ? (offerMap || {})[referrerRank] || 0 : 0,
          totalDirectReferrerCommission: directReferrerCommission,
          courseName: course.course_name,
          studentName: admission.student_name,
        }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
