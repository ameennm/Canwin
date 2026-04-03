export async function onRequestPut({ params, request, env }) {
  const bonusId = params.id;
  const { status } = await request.json();
  const db = env.DB;

  try {
    await db.prepare('UPDATE bonus_campaigns SET status = ? WHERE bonus_id = ?')
      .bind(status, bonusId)
      .run();

    return new Response(JSON.stringify({ message: 'Bonus campaign updated' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function onRequestDelete({ params, env }) {
  const bonusId = params.id;
  const db = env.DB;

  try {
    await db.prepare('DELETE FROM bonus_campaigns WHERE bonus_id = ?')
      .bind(bonusId)
      .run();

    return new Response(JSON.stringify({ message: 'Bonus campaign deleted' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
