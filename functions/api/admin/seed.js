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
    // Clear all data in correct order (respecting FK constraints)
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind('Super Admin', 'admin', 'admin@canwin.com', adminPass, 'Super Admin', 'ADMIN', '[]', 'active').run();
    const adminId = adminRes.lastRowId;
    await db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').bind(adminId).run();

    // 2. Create 5 Courses with schedules and rank-based commissions
    // Course 1: Free course, starts in 30 days
    const c1 = await db.prepare(`
      INSERT INTO courses (course_name, course_price, points_per_admission, commission_pool_percentage,
        admission_start_date, admission_end_date, course_start_date, schedule_status,
        comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'Free Orientation Workshop', 0, 5, 0,
      addDays(now, 15), addDays(now, 25), addDays(now, 30), 'scheduled',
      0, 0, 0, 0, 0, 'active'
    ).run();

    // Course 2: Rs.999, starts in 7 days - open for admission
    const c2 = await db.prepare(`
      INSERT INTO courses (course_name, course_price, points_per_admission, commission_pool_percentage,
        admission_start_date, admission_end_date, course_start_date, schedule_status,
        comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'Foundation Certification', 999, 20, 30,
      addDays(now, -5), addDays(now, 5), addDays(now, 7), 'scheduled',
      50, 100, 150, 200, 250, 'active'
    ).run();

    // Course 3: Rs.2999, admission open, starts TOMORROW (for special offer testing!)
    const c3 = await db.prepare(`
      INSERT INTO courses (course_name, course_price, points_per_admission, commission_pool_percentage,
        admission_start_date, admission_end_date, course_start_date, schedule_status,
        comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'Advanced Certification Program', 2999, 50, 30,
      addDays(now, -10), addDays(now, 2), addDays(now, 3), 'scheduled',
      100, 200, 300, 400, 500, 'active'
    ).run();

    // Course 4: Rs.4999, admission CLOSED (started 10 days ago)
    const c4 = await db.prepare(`
      INSERT INTO courses (course_name, course_price, points_per_admission, commission_pool_percentage,
        admission_start_date, admission_end_date, course_start_date, schedule_status,
        comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'Professional Diploma', 4999, 100, 30,
      addDays(now, -30), addDays(now, -10), addDays(now, -5), 'closed',
      200, 350, 500, 700, 900, 'closed'
    ).run();

    // Course 5: Rs.9999, starts in 14 days
    const c5 = await db.prepare(`
      INSERT INTO courses (course_name, course_price, points_per_admission, commission_pool_percentage,
        admission_start_date, admission_end_date, course_start_date, schedule_status,
        comm_jso, comm_so, comm_sop, comm_sdo, comm_platinum, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'Executive Masterclass', 9999, 150, 30,
      addDays(now, 5), addDays(now, 12), addDays(now, 14), 'scheduled',
      300, 500, 750, 1000, 1500, 'active'
    ).run();

    // 3. Create Users - 2 of each rank
    // Upline chain: Admin -> PL001 -> PL002 -> SDO001 -> SDO002 -> SOP001 -> SOP002 -> SO001 -> SO002 -> JSO001 -> JSO002
    const userDefs = [
      { name: 'Arun Mehta', phone: '9000000001', rank: 'Platinum', code: 'PL001' },
      { name: 'Priya Sharma', phone: '9000000002', rank: 'Platinum', code: 'PL002' },
      { name: 'Vikram Patel', phone: '9000000003', rank: 'SDO', code: 'SDO001' },
      { name: 'Neha Gupta', phone: '9000000004', rank: 'SDO', code: 'SDO002' },
      { name: 'Raj Khan', phone: '9000000005', rank: 'SOP', code: 'SOP001' },
      { name: 'Sunita Devi', phone: '9000000006', rank: 'SOP', code: 'SOP002' },
      { name: 'Amit Singh', phone: '9000000007', rank: 'SO', code: 'SO001' },
      { name: 'Pooja Verma', phone: '9000000008', rank: 'SO', code: 'SO002' },
      { name: 'Ravi Kumar', phone: '9000000009', rank: 'JSO', code: 'JSO001' },
      { name: 'Kavita Yadav', phone: '9000000010', rank: 'JSO', code: 'JSO002' },
    ];

    // Pre-computed upline chains for each user
    const uplineChains = {
      'PL001': [adminId],
      'PL002': [null, adminId], // PL002 under PL001
      'SDO001': [null, null, adminId], // under PL002
      'SDO002': [null, null, null, adminId], // under SDO001
      'SOP001': [null, null, null, null, adminId],
      'SOP002': [null, null, null, null, null, adminId],
      'SO001': [null, null, null, null, null, null, adminId],
      'SO002': [null, null, null, null, null, null, null, adminId],
      'JSO001': [null, null, null, null, null, null, null, null, adminId],
      'JSO002': [null, null, null, null, null, null, null, null, null, adminId],
    };

    const userIdMap = {};

    // Insert users in chain order so parents exist first
    for (const u of userDefs) {
      const chainTemplate = uplineChains[u.code];
      // First non-null is the direct parent
      const directParentIndex = chainTemplate.findIndex(v => v !== null);
      const directParentId = chainTemplate[directParentIndex];
      const actualChain = chainTemplate.map((v, idx) => {
        if (idx === directParentIndex) return u.code === 'PL001' ? adminId : userIdMap[userDefs[directParentIndex].code];
        return v === null ? adminId : v;
      });

      // Wait for parent to be created if this is the second Platinum
      let uplineId = null;
      let uplineChain = [];
      if (u.code === 'PL001') {
        uplineId = adminId;
        uplineChain = [adminId];
      } else if (u.code === 'PL002') {
        uplineId = userIdMap['PL001'];
        uplineChain = [userIdMap['PL001'], adminId];
      } else if (u.code === 'SDO001') {
        uplineId = userIdMap['PL002'];
        uplineChain = [userIdMap['PL002'], userIdMap['PL001'], adminId];
      } else if (u.code === 'SDO002') {
        uplineId = userIdMap['SDO001'];
        uplineChain = [userIdMap['SDO001'], userIdMap['PL002'], userIdMap['PL001'], adminId];
      } else if (u.code === 'SOP001') {
        uplineId = userIdMap['SDO002'];
        uplineChain = [userIdMap['SDO002'], userIdMap['SDO001'], userIdMap['PL002'], userIdMap['PL001'], adminId];
      } else if (u.code === 'SOP002') {
        uplineId = userIdMap['SOP001'];
        uplineChain = [userIdMap['SOP001'], userIdMap['SDO002'], userIdMap['SDO001'], userIdMap['PL002'], userIdMap['PL001'], adminId];
      } else if (u.code === 'SO001') {
        uplineId = userIdMap['SOP002'];
        uplineChain = [userIdMap['SOP002'], userIdMap['SOP001'], userIdMap['SDO002'], userIdMap['SDO001'], userIdMap['PL002'], userIdMap['PL001'], adminId];
      } else if (u.code === 'SO002') {
        uplineId = userIdMap['SO001'];
        uplineChain = [userIdMap['SO001'], userIdMap['SOP002'], userIdMap['SOP001'], userIdMap['SDO002'], userIdMap['SDO001'], userIdMap['PL002'], userIdMap['PL001'], adminId];
      } else if (u.code === 'JSO001') {
        uplineId = userIdMap['SO002'];
        uplineChain = [userIdMap['SO002'], userIdMap['SO001'], userIdMap['SOP002'], userIdMap['SOP001'], userIdMap['SDO002'], userIdMap['SDO001'], userIdMap['PL002'], userIdMap['PL001'], adminId];
      } else if (u.code === 'JSO002') {
        uplineId = userIdMap['JSO001'];
        uplineChain = [userIdMap['JSO001'], userIdMap['SO002'], userIdMap['SO001'], userIdMap['SOP002'], userIdMap['SOP001'], userIdMap['SDO002'], userIdMap['SDO001'], userIdMap['PL002'], userIdMap['PL001'], adminId];
      }

      // Give some users starting points to test rank-based commissions
      const startingPoints = u.rank === 'Platinum' ? 600 : u.rank === 'SDO' ? 300 : u.rank === 'SOP' ? 100 : 0;

      const res = await db.prepare(`
        INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_id, upline_chain, status, points)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).bind(
        u.name, u.phone, u.phone + '@canwin.com', testPass,
        u.rank, u.code, uplineId, JSON.stringify(uplineChain),
        startingPoints
      ).run();

      userIdMap[u.code] = res.lastRowId;
      await db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').bind(res.lastRowId).run();
    }

    const jso1Id = userIdMap['JSO001'];
    const jso2Id = userIdMap['JSO002'];
    const so1Id = userIdMap['SO001'];
    const so2Id = userIdMap['SO002'];
    const sdo1Id = userIdMap['SDO001'];
    const sdo2Id = userIdMap['SDO002'];
    const sop1Id = userIdMap['SOP001'];
    const sop2Id = userIdMap['SOP002'];
    const pl1Id = userIdMap['PL001'];
    const pl2Id = userIdMap['PL002'];

    // 4. Create Admissions

    // A. APPROVED - JSO001 refers Student Alpha to Course 2 (Rs.999)
    // JSO base commission = Rs.50, no offer yet, no bonus
    // L1 (JSO001, 46.7%): 23.35, L2 (SO002, 26.7%): 13.35, L3 (SOP002, 13.3%): 6.65, etc.
    const adm1 = await db.prepare(`
      INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status, referrer_rank_at_admission, approved_by_admin, approved_at)
      VALUES (?, ?, ?, ?, 'approved', 'JSO', ?, ?)
    `).bind('Student Alpha', '9880000001', c2.lastRowId, jso1Id, adminId, addDays(now, -5)).run();

    await db.batch([
      db.prepare('INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, ?, ?, ?, ?)').bind(jso1Id, 'commission_level_1', 23.35, adm1.lastRowId, 'Commission for admission 1'),
      db.prepare('INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, ?, ?, ?, ?)').bind(so2Id, 'commission_level_2', 13.35, adm1.lastRowId, 'Commission for admission 1'),
      db.prepare('INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, ?, ?, ?, ?)').bind(sop2Id, 'commission_level_3', 6.65, adm1.lastRowId, 'Commission for admission 1'),
      db.prepare('UPDATE user_stats SET wallet_balance = wallet_balance + 23.35, withdrawable_balance = withdrawable_balance + 23.35, total_earnings = total_earnings + 23.35, total_points = total_points + 20, total_admissions = total_admissions + 1 WHERE user_id = ?').bind(jso1Id),
      db.prepare('UPDATE user_stats SET wallet_balance = wallet_balance + 13.35, withdrawable_balance = withdrawable_balance + 13.35, total_earnings = total_earnings + 13.35 WHERE user_id = ?').bind(so2Id),
      db.prepare('UPDATE user_stats SET wallet_balance = wallet_balance + 6.65, withdrawable_balance = withdrawable_balance + 6.65, total_earnings = total_earnings + 6.65 WHERE user_id = ?').bind(sop2Id),
      db.prepare('UPDATE users SET points = points + 20, rank = ? WHERE id = ?').bind('SO', jso1Id),
    ]);

    // B. APPROVED - SO001 refers Student Beta to Course 3 (Rs.2999)
    // SO base commission = Rs.200
    const adm2 = await db.prepare(`
      INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status, referrer_rank_at_admission, approved_by_admin, approved_at)
      VALUES (?, ?, ?, ?, 'approved', 'SO', ?, ?)
    `).bind('Student Beta', '9880000002', c3.lastRowId, so1Id, adminId, addDays(now, -3)).run();

    await db.batch([
      db.prepare('INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, ?, ?, ?, ?)').bind(so1Id, 'commission_level_1', 93.4, adm2.lastRowId, 'Commission for admission 2'),
      db.prepare('INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, ?, ?, ?, ?)').bind(sdo2Id, 'commission_level_2', 53.4, adm2.lastRowId, 'Commission for admission 2'),
      db.prepare('INSERT INTO commission_ledger (user_id, type, amount, reference_id, description) VALUES (?, ?, ?, ?, ?)').bind(pl2Id, 'commission_level_3', 26.6, adm2.lastRowId, 'Commission for admission 2'),
      db.prepare('UPDATE user_stats SET wallet_balance = wallet_balance + 93.4, withdrawable_balance = withdrawable_balance + 93.4, total_earnings = total_earnings + 93.4, total_points = total_points + 50, total_admissions = total_admissions + 1 WHERE user_id = ?').bind(so1Id),
      db.prepare('UPDATE user_stats SET wallet_balance = wallet_balance + 53.4, withdrawable_balance = withdrawable_balance + 53.4, total_earnings = total_earnings + 53.4 WHERE user_id = ?').bind(sdo2Id),
      db.prepare('UPDATE user_stats SET wallet_balance = wallet_balance + 26.6, withdrawable_balance = withdrawable_balance + 26.6, total_earnings = total_earnings + 26.6 WHERE user_id = ?').bind(pl2Id),
      db.prepare('UPDATE users SET points = points + 50 WHERE id = ?').bind(so1Id),
    ]);

    // C. PENDING - SDO002 refers Student Charlie to Course 5 (Rs.9999)
    // SDO base commission = Rs.1000
    await db.prepare(`
      INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status, referrer_rank_at_admission)
      VALUES (?, ?, ?, ?, 'pending', 'SDO')
    `).bind('Student Charlie', '9880000003', c5.lastRowId, sdo2Id).run();

    // D. PENDING - SOP002 refers Student Delta to Course 2 (Rs.999)
    // SOP base commission = Rs.150
    await db.prepare(`
      INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status, referrer_rank_at_admission)
      VALUES (?, ?, ?, ?, 'pending', 'SOP')
    `).bind('Student Delta', '9880000004', c2.lastRowId, sop2Id).run();

    // E. PENDING - JSO002 refers Student Echo to Course 3 (Rs.2999)
    // JSO base commission = Rs.100
    await db.prepare(`
      INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status, referrer_rank_at_admission)
      VALUES (?, ?, ?, ?, 'pending', 'JSO')
    `).bind('Student Echo', '9880000005', c3.lastRowId, jso2Id).run();

    // F. PENDING - Platinum (PL001) refers Student Foxtrot to Course 5 (Rs.9999)
    // Platinum base commission = Rs.1500
    await db.prepare(`
      INSERT INTO admissions (student_name, student_phone, course_id, admitted_by_user_id, status, referrer_rank_at_admission)
      VALUES (?, ?, ?, ?, 'pending', 'Platinum')
    `).bind('Student Foxtrot', '9880000006', c5.lastRowId, pl1Id).run();

    // 5. Create Special Offer for Course 3 (Rs.2999) - valid until tomorrow
    // Increased commissions ADDED on top of base: JSO +50, SO +100, SOP +150, SDO +200, Platinum +250
    await db.prepare(`
      INSERT INTO special_offers (course_id, valid_until, jso_amount, so_amount, sop_amount, sdo_amount, platinum_amount, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(c3.lastRowId, addDays(now, 1), 50, 100, 150, 200, 250, adminId).run();

    // 6. Create a bonus campaign for Course 2 - active
    await db.prepare(`
      INSERT INTO bonus_campaigns (course_id, bonus_amount, start_time, end_time, eligible_roles, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).bind(c2.lastRowId, 25, addDays(now, -3), addDays(now, 7), 'ALL').run();

    // 7. Create a withdrawal request for SO001
    await db.prepare(`
      INSERT INTO withdraw_requests (user_id, amount, status)
      VALUES (?, ?, 'pending')
    `).bind(so1Id, 500).run();

    return new Response(JSON.stringify({
      message: 'Comprehensive seed data created successfully',
      summary: {
        admin: { phone: 'admin', password: 'admin123' },
        users: {
          platinum: [{ phone: '9000000001', name: 'Arun Mehta', password: 'test123' }, { phone: '9000000002', name: 'Priya Sharma', password: 'test123' }],
          sdo: [{ phone: '9000000003', name: 'Vikram Patel', password: 'test123' }, { phone: '9000000004', name: 'Neha Gupta', password: 'test123' }],
          sop: [{ phone: '9000000005', name: 'Raj Khan', password: 'test123' }, { phone: '9000000006', name: 'Sunita Devi', password: 'test123' }],
          so: [{ phone: '9000000007', name: 'Amit Singh', password: 'test123' }, { phone: '9000000008', name: 'Pooja Verma', password: 'test123' }],
          jso: [{ phone: '9000000009', name: 'Ravi Kumar', password: 'test123' }, { phone: '9000000010', name: 'Kavita Yadav', password: 'test123' }],
        },
        courses: { total: 5, courseIds: [c1.lastRowId, c2.lastRowId, c3.lastRowId, c4.lastRowId, c5.lastRowId] },
        admissions: { approved: 2, pending: 4 },
        specialOffers: 1,
        bonusCampaigns: 1,
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seeding failed:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500 });
  }
}
