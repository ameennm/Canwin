import * as jwt from '@tsndr/cloudflare-worker-jwt';

async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const { phone, password } = await request.json();
  const db = env.DB;

  try {
    const hashedPassword = await hashPassword(password);
    
    // Check for 'admin' shorthand or regular phone
    const user = await db.prepare('SELECT id, name, rank, referral_code, points, status FROM users WHERE (phone = ? OR (rank = "Super Admin" AND phone = "admin")) AND password_hash = ?')
      .bind(phone, hashedPassword)
      .first();

    if (!user) {
      console.warn(`Login failed for phone: ${phone} (User not found or password mismatch)`);
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    if (user.status && user.status !== 'active') {
       console.warn(`Login blocked for phone: ${phone} (Status: ${user.status})`);
       return new Response(JSON.stringify({ error: 'Account is suspended' }), { status: 403 });
    }

    // Fetch user stats
    const stats = await db.prepare('SELECT * FROM user_stats WHERE user_id = ?').bind(user.id).first() || {};

    const secret = env.JWT_SECRET || 'fallback_secret_key_change_in_production';
    const payload = {
        id: user.id,
        phone,
        rank: user.rank,
        exp: Math.floor(Date.now() / 1000) + (24 * (60 * 60)) // 24 hours
    };

    const token = await jwt.sign(payload, secret);

    return new Response(JSON.stringify({ 
      token, 
      user: {
        id: user.id,
        name: user.name,
        rank: user.rank,
        referral_code: user.referral_code,
        points: user.points,
        wallet_balance: stats.wallet_balance || 0,
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Login failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
