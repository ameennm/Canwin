export async function onRequestDelete({ params, env }) {
  const userId = params.id;
  const db = env.DB;

  try {
    // Delete user (user_stats will likely cascade or need manual cleanup)
    await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    await db.prepare('DELETE FROM user_stats WHERE user_id = ?').bind(userId).run();

    return new Response(JSON.stringify({ message: 'User deleted' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
