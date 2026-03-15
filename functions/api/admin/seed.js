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
    // 0. Ensure tables exist or are cleared for fresh seed
    await db.prepare('DELETE FROM users').run();
    await db.prepare('DELETE FROM user_stats').run();
    await db.prepare('DELETE FROM courses').run();
    await db.prepare('DELETE FROM admissions').run();
    await db.prepare('DELETE FROM commission_ledger').run();

    const adminPassword = 'admin123';
    const hashedAdminPassword = await hashPassword(adminPassword);
    const defaultPassword = 'test123';
    const hashedDefaultPassword = await hashPassword(defaultPassword);

    // 1. Create Super Admin
    const adminResult = await db.prepare(`
      INSERT INTO users (name, phone, email, password_hash, rank, referral_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind('Super Admin', 'admin', 'admin@canwin.com', hashedAdminPassword, 'Super Admin', 'ADMIN', 'active').run();
    
    const adminId = adminResult.lastRowId;
    await db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').bind(adminId).run();

    // 2. Insert dummy courses
    const courseInsert1 = await db.prepare(`
      INSERT INTO courses (course_name, course_price, points_per_admission, commission_pool_percentage, status)
      VALUES (?, ?, ?, ?, ?)
    `).bind('Advanced Placement Program (APP)', 500, 100, 30, 'active').run();
    const appCourseId = courseInsert1.lastRowId;

    const courseInsert2 = await db.prepare(`
      INSERT INTO courses (course_name, course_price, points_per_admission, commission_pool_percentage, status)
      VALUES (?, ?, ?, ?, ?)
    `).bind('Basic Certification Course (BCC)', 300, 50, 20, 'active').run();
    const bccCourseId = courseInsert2.lastRowId;

    // 3. Define Hierarchy Users
    const users = [
      { name: 'Rahman Platinum', phone: '9000000001', rank: 'Platinum Leader', code: 'PL1001' },
      { name: 'Ajmal SDO', phone: '9000000002', rank: 'Senior Development Officer', code: 'SDO1002' },
      { name: 'Shamil SOP', phone: '9000000003', rank: 'Sales Officer Premium', code: 'SOP1003' },
      { name: 'Niyas SO', phone: '9000000004', rank: 'Sales Officer', code: 'SO1004' },
      { name: 'Sameer JSO', phone: '9000000005', rank: 'Junior Sales Officer', code: 'JSO1005' },
    ];

    const userIdMap = {};
    const userChainMap = {};
    
    let currentParentId = adminId;
    let currentChain = [adminId];

    for (const u of users) {
      const result = await db.prepare(`
        INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_id, upline_chain, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).bind(u.name, u.phone, u.phone + '@test.com', hashedDefaultPassword, u.rank, u.code, currentParentId, JSON.stringify(currentChain)).run();
      
      const newUserId = result.lastRowId;
      userIdMap[u.code] = newUserId;
      userChainMap[u.code] = currentChain;
      
      await db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').bind(newUserId).run();

      // Update team stats for ancestors
      for (const ancestor of currentChain) {
          await db.prepare('UPDATE user_stats SET team_size = team_size + 1 WHERE user_id = ?').bind(ancestor).run();
      }
      await db.prepare('UPDATE user_stats SET direct_referrals = direct_referrals + 1 WHERE user_id = ?').bind(currentParentId).run();

      // Move down the chain
      currentChain = [newUserId, ...currentChain];
      currentParentId = newUserId;
    }

    // 4. Create dummy admissions
    const jsoId = userIdMap['JSO1005'];
    await db.prepare(`
      INSERT INTO admissions (course_id, admitted_by_user_id, student_name, student_phone, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).bind(appCourseId, jsoId, 'Dummy Student 1', '8888888881').run();

    return new Response(JSON.stringify({ message: 'Database seeded successfully with Admin (admin/admin123) and full hierarchy.' }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Seeding failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
