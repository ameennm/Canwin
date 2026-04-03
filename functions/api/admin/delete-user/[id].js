export async function onRequestDelete({ params, env, data }) {
  // 1. Ensure only Super Admin can delete
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403 });
  }

  const userId = params.id;
  const db = env.DB;

  try {
    // 2. Perform Soft Deletion to preserve data integrity (Foreign Keys)
    await db.prepare('UPDATE users SET status = "deleted" WHERE id = ?').bind(userId).run();

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
