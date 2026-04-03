async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPut({ params, request, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const userId = params.id;
  const { name, phone, email, password, rank, status, points } = await request.json();
  const db = env.DB;

  try {
    const updateStmts = [];
    
    // 1. Prepare User Table Updates
    let userUpdates = [];
    let userValues = [];
    
    if (name) { userUpdates.push('name = ?'); userValues.push(name); }
    if (phone) { userUpdates.push('phone = ?'); userValues.push(phone); }
    if (email) { userUpdates.push('email = ?'); userValues.push(email); }
    if (password) { 
        const hashedPassword = await hashPassword(password);
        userUpdates.push('password_hash = ?'); 
        userValues.push(hashedPassword); 
    }
    if (rank) { userUpdates.push('rank = ?'); userValues.push(rank); }
    if (status) { userUpdates.push('status = ?'); userValues.push(status); }

    if (userUpdates.length > 0) {
      let query = 'UPDATE users SET ' + userUpdates.join(', ') + ' WHERE id = ?';
      userValues.push(userId);
      updateStmts.push(db.prepare(query).bind(...userValues));
    }
    
    // 2. Prepare Stats Table Updates
    if (points !== undefined) {
      updateStmts.push(db.prepare('UPDATE user_stats SET total_points = ? WHERE user_id = ?').bind(points, userId));
    }

    if (updateStmts.length > 0) {
      await db.batch(updateStmts);
    }

    return new Response(JSON.stringify({ message: 'User updated successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
        return new Response(JSON.stringify({ error: 'Phone number or email already in use' }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
