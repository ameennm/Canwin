export async function onRequestDelete({ params, env, data }) {
  // 1. Ensure only Super Admin can delete
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403 });
  }

  const userId = params.id;
  const db = env.DB;

  try {
    // 2. Perform deletion in a batch
    await db.batch([
      db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
      db.prepare('DELETE FROM user_stats WHERE user_id = ?').bind(userId)
      // Note: We keep admissions and ledger for audit history, but they will point to a non-existent user_id.
    ]);

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
