export async function onRequestPost({ params, env }) {
  const referralId = params.id;
  const db = env.DB;

  try {
    // 1. Fetch Referral and Course details
    const referral = await db.prepare(`
      SELECT a.*, c.course_price, c.course_name
      FROM admissions a
      JOIN courses c ON a.course_id = c.course_id
      WHERE a.id = ?
    `).bind(referralId).first();

    if (!referral) return new Response(JSON.stringify({ error: 'Admission not found' }), { status: 404 });
    if (referral.status === 'approved') return new Response(JSON.stringify({ message: 'Admission already verified' }), { status: 200 });

    // 2. Fetch Direct Referrer (L1) and their Upline Chain
    const referrer = await db.prepare('SELECT id, upline_chain FROM users WHERE id = ?')
      .bind(referral.admitted_by_user_id)
      .first();

    if (!referrer) return new Response(JSON.stringify({ error: 'Referrer not found' }), { status: 404 });

    // 3. Calculate Commission Pool (30% of Course Price)
    const totalPool = referral.course_price * 0.3;
    const distribution = [
      { percentage: 0.467, type: 'commission_level_1' }, // L1
      { percentage: 0.267, type: 'commission_level_2' }, // L2
      { percentage: 0.133, type: 'commission_level_3' }, // L3
      { percentage: 0.067, type: 'commission_level_4' }, // L4
      { percentage: 0.067, type: 'commission_level_5' }  // L5
    ];

    // Uplines include the direct referrer at index 0
    let uplineChain = [];
    try {
        uplineChain = JSON.parse(referrer.upline_chain || '[]');
    } catch (e) {
        console.error('Failed to parse upline chain', e);
    }
    const fullChain = [referrer.id, ...uplineChain];

    // 4. Check for active Bonus Campaign
    const activeBonus = await db.prepare(`
      SELECT bonus_amount 
      FROM bonus_campaigns 
      WHERE course_id = ? AND status = 'active'
      AND start_date <= CURRENT_TIMESTAMP AND end_date >= CURRENT_TIMESTAMP
      LIMIT 1
    `).bind(referral.course_id).first();

    const statements = [];
    let totalDistributed = 0;

    // 5. Distribute Commissions across 5 Levels
    for (let i = 0; i < distribution.length; i++) {
      let amount = Math.round(totalPool * distribution[i].percentage * 100) / 100;
      const userId = fullChain[i];

      if (userId) {
        // Special Logic: Add Bonus only to Level 1 (Direct Referrer)
        let isBonusApplied = false;
        if (i === 0 && activeBonus) {
            amount += activeBonus.bonus_amount;
            isBonusApplied = true;
        }

        statements.push(db.prepare(`
          UPDATE user_stats 
          SET pending_balance = pending_balance + ?, 
              total_earnings = total_earnings + ?
          WHERE user_id = ?
        `).bind(amount, amount, userId));

        // Industrial Standard: Clear, detailed ledger entries
        const desc = `Commission: ${referral.student_name} (${referral.course_name})` + 
                    (isBonusApplied ? ` + Bonus ₹${activeBonus.bonus_amount}` : '');
        
        statements.push(db.prepare(`
          INSERT INTO commission_ledger (user_id, type, amount, reference_id, description)
          VALUES (?, ?, ?, ?, ?)
        `).bind(userId, isBonusApplied ? 'bonus' : distribution[i].type, amount, referralId, desc));
        
        totalDistributed += amount;
      }
    }

    // 5. Update Admission Status
    statements.push(db.prepare('UPDATE admissions SET status = "approved", approved_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(referralId));

    // 6. Execute all updates in a batch
    await db.batch(statements);

    return new Response(JSON.stringify({ 
      message: 'Admission verified and commissions distributed',
      total_pool: totalPool,
      distributed: totalDistributed
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Verification failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
