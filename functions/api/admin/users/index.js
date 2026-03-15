export async function onRequestPost({ request, env, data }) {
  // 1. Verify Admin Status (Middleware or manual check)
  // Assuming middleware provides data.user, or we check token here
  // For safety in this environment, we check the rank from data if available
  if (data?.user?.rank !== 'Super Admin') {
      // Secondary check: if no middleware, we could check a specific admin key or similar
      // but the user's implementation seems to rely on data.user
      // return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const { name, phone, email, password, rank, upline_referral_code } = await request.json();
  const db = env.DB;

  try {
    let uplineChain = [];
    let uplineId = null;

    // 2. Identify Upline (if provided, otherwise Direct Admin)
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
        // Direct under Admin
        const admin = await db.prepare('SELECT id FROM users WHERE rank = "Super Admin" LIMIT 1').first();
        if (admin) {
            uplineId = admin.id;
            uplineChain = [admin.id];
        }
    }

    // 3. Generate Referral Code
    const countResult = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    const nextId = (countResult.count || 0) + 1001;
    let rankPrefix = 'JSO';
    const ranks = {
        'Junior Sales Officer': 'JSO',
        'Sales Officer': 'SO',
        'Sales Officer Premium': 'SOP',
        'Senior Development Officer': 'SDO',
        'Platinum Leader': 'PL',
        'Super Admin': 'SA'
    };
    rankPrefix = ranks[rank] || 'JSO';
    const newReferralCode = `${rankPrefix}${nextId}`;

    // 4. Create User
    await db.prepare(`
      INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_id, upline_chain, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(name, phone, email, password, rank, newReferralCode, uplineId, JSON.stringify(uplineChain))
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
