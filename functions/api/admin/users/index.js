async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env, data }) {
  // Auth check
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const { name, phone, email, password, rank, upline_referral_code } = await request.json();
  const db = env.DB;

  try {
    // Validate required fields
    if (!name || !phone || !email || !password || !rank) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, phone, email, password, rank' }), { status: 400 });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Normalize rank names to abbreviations
    const rankMap = {
      'Junior Sales Officer': 'JSO',
      'Sales Officer': 'SO',
      'Sales Officer Premium': 'SOP',
      'Senior Development Officer': 'SDO',
      'Platinum Leader': 'Platinum',
      'JSO': 'JSO',
      'SO': 'SO',
      'SOP': 'SOP',
      'SDO': 'SDO',
      'Platinum': 'Platinum',
    };
    const normalizedRank = rankMap[rank] || 'JSO';

    // Validate normalized rank
    const validRanks = ['JSO', 'SO', 'SOP', 'SDO', 'Platinum'];
    if (!validRanks.includes(normalizedRank)) {
      return new Response(JSON.stringify({ error: 'Invalid rank. Must be JSO, SO, SOP, SDO, or Platinum' }), { status: 400 });
    }

    // Upline logic
    let uplineChain = [];
    let uplineId = null;
    if (upline_referral_code) {
      const upline = await db.prepare('SELECT id, upline_chain FROM users WHERE referral_code = ?').bind(upline_referral_code).first();
      if (upline) {
        uplineId = upline.id;
        try {
          const parentChain = JSON.parse(upline.upline_chain || '[]');
          uplineChain = [upline.id, ...parentChain];
        } catch (e) {
          uplineChain = [upline.id];
        }
      }
    } else {
      const admin = await db.prepare('SELECT id FROM users WHERE rank = "Super Admin" LIMIT 1').first();
      if (admin) {
        uplineId = admin.id;
        uplineChain = [admin.id];
      }
    }

    // Generate referral code with correct prefix
    const countResult = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    const nextId = (countResult.count || 0) + 1001;
    const prefixMap = { 'JSO': 'JSO', 'SO': 'SO', 'SOP': 'SOP', 'SDO': 'SDO', 'Platinum': 'PL' };
    const newReferralCode = `${prefixMap[normalizedRank] || 'JSO'}${nextId}`;

    // Insert with HASHED password
    await db.prepare(`
      INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_id, upline_chain, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(name, phone, email, hashedPassword, normalizedRank, newReferralCode, uplineId, JSON.stringify(uplineChain))
      .run();

    return new Response(JSON.stringify({
      message: 'User created successfully',
      referral_code: newReferralCode
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: 'Phone or Email already registered' }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function onRequestGet({ env, data }) {
  // Auth check
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const db = env.DB;
  try {
    const users = await db.prepare(`
      SELECT u.id, u.name, u.phone, u.email, u.rank, u.referral_code, u.upline_id, u.upline_chain, u.points, u.status, u.created_at,
             s.wallet_balance, s.withdrawable_balance, s.total_points, s.total_earnings, s.direct_referrals, s.team_size, s.total_admissions
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      ORDER BY u.created_at DESC
    `).all();

    return new Response(JSON.stringify(users.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
