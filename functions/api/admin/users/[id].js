export async function onRequestPut({ params, request, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const userId = params.id;
  const { rank, status, points } = await request.json();
  const db = env.DB;

  try {
    const updateStmts = [];
    
    if (rank || status) {
      let query = 'UPDATE users SET ';
      const updates = [];
      const values = [];
      if (rank) { updates.push('rank = ?'); values.push(rank); }
      if (status) { updates.push('status = ?'); values.push(status); }
      
      query += updates.join(', ') + ' WHERE id = ?';
      values.push(userId);
      updateStmts.push(db.prepare(query).bind(...values));
    }
    
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
