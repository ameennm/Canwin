async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  const db = env.DB;
  
  try {
    // 0. Ensure tables exist or are cleared for fresh seed (Correct Dependency Order)
    await db.prepare('DELETE FROM commission_ledger').run();
    await db.prepare('DELETE FROM admissions').run();
    await db.prepare('DELETE FROM withdraw_requests').run();
    await db.prepare('DELETE FROM user_stats').run();
    await db.prepare('DELETE FROM bonus_campaigns').run();
    await db.prepare('DELETE FROM users').run();
    await db.prepare('DELETE FROM courses').run();

    const adminPassword = 'admin123';
    const hashedAdminPassword = await hashPassword(adminPassword);
    const defaultPassword = 'test123';
    const hashedDefaultPassword = await hashPassword(defaultPassword);

    // 1. Create Super Admin
    await db.prepare(`
      INSERT INTO users (name, phone, email, password_hash, rank, referral_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind('Super Admin', 'admin', 'admin@canwin.com', hashedAdminPassword, 'Super Admin', 'ADMIN', 'active').run();
    
    const adminRows = await db.prepare('SELECT id FROM users WHERE phone = ?').bind('admin').first();
    const adminId = adminRows.id;

    // 2. Insert dummy courses with Dynamic Payouts
    // APP Course (₹500)
    await db.prepare(`
      INSERT INTO courses (
        course_name, course_price, points_per_admission, 
        level_1_payout, level_2_payout, level_3_payout, level_4_payout, level_5_payout,
        commission_pool_percentage, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind('Advanced Placement Program (APP)', 500, 100, 70.05, 40.05, 19.95, 10.05, 9.9, 30, 'active').run();
    const appCourse = await db.prepare('SELECT course_id FROM courses WHERE course_name LIKE ?').bind('Advanced%').first();
    const appCourseId = appCourse.course_id;

    // BCC Course (₹300)
    await db.prepare(`
      INSERT INTO courses (
        course_name, course_price, points_per_admission, 
        level_1_payout, level_2_payout, level_3_payout, level_4_payout, level_5_payout,
        commission_pool_percentage, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind('Basic Certification Course (BCC)', 300, 50, 28.02, 16.02, 7.98, 4.02, 3.96, 20, 'active').run();
    const bccCourse = await db.prepare('SELECT course_id FROM courses WHERE course_name LIKE ?').bind('Basic%').first();
    const bccCourseId = bccCourse.course_id;
    
    // 3. Define Hierarchy Tree logic
    // Admin (Level 0)
    //   -> P1 (Platinum)
    //        -> S1 (SDO)
    //             -> SP1 (SOP)
    //                  -> SO1 (SO)
    //                       -> J1 (JSO)
    //   -> P2 (Platinum)
    //        ... same structure ...

    const standardizedUsers = [
      { id: 1, name: 'Platinum Leader 1', phone: '9000000001', rank: 'Platinum', parent: 'admin' },
      { id: 2, name: 'Platinum Leader 2', phone: '9000000002', rank: 'Platinum', parent: 'admin' },
      { id: 3, name: 'SDO Officer 1', phone: '9000000003', rank: 'SDO', parent: '9000000001' },
      { id: 4, name: 'SDO Officer 2', phone: '9000000004', rank: 'SDO', parent: '9000000002' },
      { id: 5, name: 'SOP Leader 1', phone: '9000000005', rank: 'SOP', parent: '9000000003' },
      { id: 6, name: 'SOP Leader 2', phone: '9000000006', rank: 'SOP', parent: '9000000004' },
      { id: 7, name: 'Sales Officer 1', phone: '9000000007', rank: 'SO', parent: '9000000005' },
      { id: 8, name: 'Sales Officer 2', phone: '9000000008', rank: 'SO', parent: '9000000006' },
      { id: 9, name: 'Junior Sales Officer 1', phone: '9000000009', rank: 'JSO', parent: '9000000007' },
      { id: 10, name: 'Junior Sales Officer 2', phone: '9000000010', rank: 'JSO', parent: '9000000008' },
    ];

    const phoneToId = { 'admin': adminId };
    const phoneToChain = { 'admin': [adminId] };

    for (const u of standardizedUsers) {
      const parentId = phoneToId[u.parent];
      const parentChain = phoneToChain[u.parent];
      const code = u.rank.substring(0, 2).toUpperCase() + u.phone.substring(6);

      await db.prepare(`
        INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_id, upline_chain, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).bind(u.name, u.phone, u.phone + '@canwin.com', hashedDefaultPassword, u.rank, code, parentId, JSON.stringify(parentChain)).run();
      
      const user = await db.prepare('SELECT id FROM users WHERE phone = ?').bind(u.phone).first();
      phoneToId[u.phone] = user.id;
      phoneToChain[u.phone] = [user.id, ...parentChain];

      // Update team stats for all ancestors
      for (const ancestorId of parentChain) {
        await db.prepare('UPDATE user_stats SET team_size = team_size + 1 WHERE user_id = ?').bind(ancestorId).run();
      }
      await db.prepare('UPDATE user_stats SET direct_referrals = direct_referrals + 1 WHERE user_id = ?').bind(parentId).run();
    }

    // 4. Detailed Student Data (15 Students across ranks)
    const enrollmentData = [
      { name: 'Alice (JSO1)', promoter: '9000000009', course: appCourseId, status: 'approved' },
      { name: 'Bob (JSO1)', promoter: '9000000009', course: bccCourseId, status: 'pending' },
      { name: 'Charlie (SO1)', promoter: '9000000007', course: appCourseId, status: 'approved' },
      { name: 'David (SOP1)', promoter: '9000000005', course: appCourseId, status: 'approved' },
      { name: 'Eve (SDO1)', promoter: '9000000003', course: appCourseId, status: 'approved' },
      { name: 'Frank (PL1)', promoter: '9000000001', course: appCourseId, status: 'approved' },
      { name: 'Grace (JSO2)', promoter: '9000000010', course: appCourseId, status: 'pending' },
      { name: 'Heidi (SO2)', promoter: '9000000008', course: appCourseId, status: 'approved' },
      { name: 'Ivan (SOP2)', promoter: '9000000006', course: bccCourseId, status: 'approved' },
      { name: 'Jack (JSO1)', promoter: '9000000009', course: appCourseId, status: 'approved' },
    ];

    for (const [index, s] of enrollmentData.entries()) {
      const studentPhone = `800000000${index}`;
      const promoterId = phoneToId[s.promoter];
      
      await db.prepare(`
        INSERT INTO admissions (course_id, admitted_by_user_id, student_name, student_phone, status)
        VALUES (?, ?, ?, ?, ?)
      `).bind(s.course, promoterId, s.name, studentPhone, s.status).run();

      if (s.status === 'approved') {
        await db.prepare('UPDATE user_stats SET total_admissions = total_admissions + 1 WHERE user_id = ?').bind(promoterId).run();
      }
    }

    return new Response(JSON.stringify({ 
        message: 'Logical Tree Seeded: 11 Promoters, 10 Students across 5 levels. Use 9000000001-9000000010 (pass: test123) for testing.' 
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seeding failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
