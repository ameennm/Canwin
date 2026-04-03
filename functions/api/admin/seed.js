async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function onRequestPost({ request, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  const db = env.DB;
  const now = new Date();

  try {
    // 0. Clear all data in correct order
    await db.batch([
      db.prepare('DELETE FROM special_offers'),
      db.prepare('DELETE FROM bonus_campaigns'),
      db.prepare('DELETE FROM withdraw_requests'),
      db.prepare('DELETE FROM commission_ledger'),
      db.prepare('DELETE FROM admissions'),
      db.prepare('DELETE FROM courses'),
      db.prepare('DELETE FROM user_stats'),
      db.prepare('DELETE FROM users'),
    ]);

    const adminPass = await hashPassword('admin123');
    const testPass = await hashPassword('test123');

    // 1. Create Super Admin
    const adminRes = await db.prepare(`
      INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_chain, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind('Super Admin', 'admin', 'admin@canwin.com', adminPass, 'Super Admin', 'ADMIN', '[]').run();
    const adminId = adminRes.lastRowId;
    await db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').bind(adminId).run();

    // 2. Insert dummy courses (New unified structure)
    // APP Course (₹500)
    await db.prepare(`
      INSERT INTO courses (
        course_name, course_price, points_per_admission, 
        level_1_payout, level_2_payout, level_3_payout, level_4_payout, level_5_payout,
        admission_start_date, admission_end_date, course_start_date,
        commission_pool_percentage, status, schedule_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        'Advanced Placement Program (APP)', 500, 100, 
        100.00, 40.00, 20.00, 10.00, 10.00,
        addDays(now, -10), addDays(now, 30), addDays(now, 35),
        20, 'active', 'scheduled'
    ).run();

    // BCC Course (₹300)
    await db.prepare(`
      INSERT INTO courses (
        course_name, course_price, points_per_admission, 
        level_1_payout, level_2_payout, level_3_payout, level_4_payout, level_5_payout,
        admission_start_date, admission_end_date, course_start_date,
        commission_pool_percentage, status, schedule_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        'Basic Certification Course (BCC)', 300, 50, 
        60.00, 30.00, 15.00, 10.00, 5.00,
        addDays(now, -5), addDays(now, 25), addDays(now, 30),
        20, 'active', 'scheduled'
    ).run();

    const appCourse = await db.prepare('SELECT course_id FROM courses WHERE course_name LIKE ?').bind('Advanced%').first();
    const appCourseId = appCourse.course_id;
    const bccCourse = await db.prepare('SELECT course_id FROM courses WHERE course_name LIKE ?').bind('Basic%').first();
    const bccCourseId = bccCourse.course_id;
    
    // 3. Define Hierarchy Tree logic (Unified CNWN Structure)
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

    for (const [idx, u] of standardizedUsers.entries()) {
      const parentId = phoneToId[u.parent];
      const parentChain = phoneToChain[u.parent];
      const code = `CNWN${1001 + idx}`; // SEQUENTIAL CNWN ID

      const res = await db.prepare(`
        INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_id, upline_chain, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).bind(u.name, u.phone, u.phone + '@canwin.com', testPass, u.rank, code, parentId, JSON.stringify(parentChain)).run();
      
      const newUserId = res.lastRowId;
      phoneToId[u.phone] = newUserId;
      phoneToChain[u.phone] = [newUserId, ...parentChain];

      await db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').bind(newUserId).run();

      // Update team stats for all ancestors
      for (const ancestorId of parentChain) {
        await db.prepare('UPDATE user_stats SET team_size = team_size + 1 WHERE user_id = ?').bind(ancestorId).run();
      }
      await db.prepare('UPDATE user_stats SET direct_referrals = direct_referrals + 1 WHERE user_id = ?').bind(parentId).run();
    }

    // 4. Detailed Student Data
    const enrollmentData = [
      { name: 'Alice (CNWN1009)', promoter: '9000000009', course: appCourseId, status: 'approved' },
      { name: 'Bob (CNWN1009)', promoter: '9000000009', course: bccCourseId, status: 'pending' },
      { name: 'Charlie (CNWN1007)', promoter: '9000000007', course: appCourseId, status: 'approved' },
      { name: 'David (CNWN1005)', promoter: '9000000005', course: appCourseId, status: 'approved' },
      { name: 'Eve (CNWN1003)', promoter: '9000000003', course: appCourseId, status: 'approved' },
      { name: 'Frank (CNWN1001)', promoter: '9000000001', course: appCourseId, status: 'approved' },
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
        message: 'CanWin Unified Data Seeded: CNWN IDs (1001-1002) + Unified Courses. Log in with admin (pass: admin123) or 9000000001 (pass: test123).' 
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seeding failed:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500 });
  }
}
