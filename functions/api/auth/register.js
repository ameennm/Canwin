async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const { name, phone, email, password, referral_code, rank: requestedRank } = await request.json();
  const db = env.DB;

  try {
    // Validate required fields
    if (!name || !phone || !email || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, phone, email, password' }), { status: 400 });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Normalize rank name to abbreviation
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
    const rank = rankMap[requestedRank] || 'JSO';

    let upline = null;
    let uplineChain = [];

    // 1. Validate referral code (find upline)
    if (referral_code && referral_code !== 'ADMIN') {
      upline = await db.prepare('SELECT id, rank, upline_chain FROM users WHERE referral_code = ?')
        .bind(referral_code)
        .first();

      if (!upline) {
        return new Response(JSON.stringify({ error: 'Invalid referral code' }), { status: 400 });
      }

      // 2. Enforce Recruitment Rules
      const canRecruit = {
        'JSO': [],
        'SO': ['JSO'],
        'SOP': ['SO', 'JSO'],
        'SDO': ['SOP', 'SO', 'JSO'],
        'Platinum': ['SDO', 'SOP', 'SO', 'JSO'],
        'Super Admin': ['SDO', 'SOP', 'SO', 'JSO'],
      };

      if (!canRecruit[upline.rank] || !canRecruit[upline.rank].includes(rank)) {
        return new Response(JSON.stringify({ error: `Your referrer rank (${upline.rank}) cannot directly recruit a ${rank}` }), { status: 403 });
      }

      // 3. Construct the upline chain
      try {
          const parentChain = JSON.parse(upline.upline_chain || '[]');
          uplineChain = [upline.id, ...parentChain];
      } catch (e) {
          uplineChain = [upline.id];
      }
    } else if (referral_code === 'ADMIN') {
        const admin = await db.prepare('SELECT id FROM users WHERE rank = "Super Admin" LIMIT 1').first();
        if (admin) {
            upline = admin;
            uplineChain = [admin.id];
        }
    } else {
         return new Response(JSON.stringify({ error: 'Referral code is mandatory' }), { status: 400 });
    }

    // 4. Generate unique referral code
    const countResult = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    const nextId = (countResult.count || 0) + 1001;
    let rankPrefix = 'JSO';
    if (rank === 'SO') rankPrefix = 'SO';
    else if (rank === 'SOP') rankPrefix = 'SOP';
    else if (rank === 'SDO') rankPrefix = 'SDO';
    else if (rank === 'Platinum') rankPrefix = 'PL';

    const newReferralCode = `${rankPrefix}${nextId}`;

    // 5. Create user (always pending initially)
    await db.prepare(`
      INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_id, upline_chain, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(name, phone, email, hashedPassword, rank, newReferralCode, upline?.id || null, JSON.stringify(uplineChain))
      .run();

    return new Response(JSON.stringify({ message: 'User registered successfully', referral_code: newReferralCode }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
        return new Response(JSON.stringify({ error: 'Phone number or email already registered' }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
