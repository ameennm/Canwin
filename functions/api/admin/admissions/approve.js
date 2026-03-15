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

    // 3. Fetch referrer and their upline chain
    const referrer = await db.prepare('SELECT id, rank, upline_chain FROM users WHERE id = ?').bind(admission.admitted_by_user_id).first();
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

    // 4. Mark admission as approved
    batchStatements.push(
      db.prepare('UPDATE admissions SET status = "approved", approved_by_admin = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(data.user.id, admission_id)
    );

    // 5. Calculate Pool and Distribute
    const poolAmount = (course.course_price * course.commission_pool_percentage) / 100;
    
    // Level Percentages matching spec exact exactly
    // Level 1 = 46.7%, Level 2 = 26.7%, Level 3 = 13.3%, Level 4 = 6.7%, Level 5 = 6.6% (Adjusted to exactly 100%)
    const levelPercentages = [46.7, 26.7, 13.3, 6.7, 6.6]; 

    // Check for active bonus
    const now = new Date().toISOString();
    const activeBonus = await db.prepare(`
      SELECT * FROM bonus_campaigns 
      WHERE course_id = ? AND start_time <= ? AND end_time >= ? AND status = 'active'
    `).bind(course.course_id, now, now).first();

    // Iterate max 5 levels
    for (let i = 0; i < Math.min(uplineChainIds.length, 5); i++) {
        const userId = uplineChainIds[i];
        
        // Need to know the rank to give bonus. Fetching it individually because chain only has IDs.
        // In a highly optimized system, we'd batch fetch these or store ranks in the chain. 
        // For now, doing a quick query.
        const user = await db.prepare('SELECT rank, points FROM users WHERE id = ?').bind(userId).first();
        if (!user) continue;

        const percentage = levelPercentages[i];
        let amount = (poolAmount * percentage) / 100;
        let type = `commission_level_${i+1}`;

        // Apply bonus to Level 1 (Direct Referrer) only
        if (i === 0 && activeBonus) {
            const eligibleRoles = activeBonus.eligible_roles.split(',');
            if (eligibleRoles.includes(user.rank) || activeBonus.eligible_roles === 'ALL') {
                amount += activeBonus.bonus_amount;
                type = 'bonus';
            }
        }

        if (amount > 0) {
            // Write to Ledger
            batchStatements.push(
                db.prepare(`
                  INSERT INTO commission_ledger (user_id, type, amount, reference_id, description)
                  VALUES (?, ?, ?, ?, ?)
                `).bind(userId, type, amount, admission_id, `Commission for admission ${admission_id}`)
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
               const newPoints = user.points + course.points_per_admission;
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
        message: 'Admission approved and commissions distributed successfully' 
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
