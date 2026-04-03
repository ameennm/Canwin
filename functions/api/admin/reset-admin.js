// One-time admin password reset endpoint
// Computes the hash server-side in Cloudflare runtime so it matches login.js exactly
// DELETE THIS FILE after use

async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ env }) {
  const db = env.DB;
  try {
    const hash = await hashPassword('admin123');

    // Disable FK checks temporarily
    await db.prepare("PRAGMA foreign_keys = OFF").run();

    // Delete old admin stats first, then admin user
    await db.prepare("DELETE FROM user_stats WHERE user_id IN (SELECT id FROM users WHERE phone = 'admin')").run();
    await db.prepare("DELETE FROM users WHERE phone = 'admin'").run();
    
    const result = await db.prepare(`
      INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_chain, status)
      VALUES ('Super Admin', 'admin', 'admin@canwin.com', ?, 'Super Admin', 'ADMIN', '[]', 'active')
    `).bind(hash).run();

    // Re-enable FK checks
    await db.prepare("PRAGMA foreign_keys = ON").run();

    // Also ensure user_stats row exists
    if (result.lastRowId) {
      await db.prepare("INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)").bind(result.lastRowId).run();
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Admin password reset to admin123',
      hash_preview: hash.substring(0, 8) + '...',
      hash_length: hash.length
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
