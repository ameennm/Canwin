export async function onRequestPost({ request, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const { admissionId } = await request.json();
  const db = env.DB;

  try {
    const admission = await db.prepare('SELECT status FROM admissions WHERE id = ?').bind(admissionId).first();

    if (!admission) return new Response(JSON.stringify({ error: 'Admission not found' }), { status: 404 });
    if (admission.status !== 'pending') return new Response(JSON.stringify({ error: 'Admission already processed' }), { status: 400 });

    await db.prepare('UPDATE admissions SET status = "rejected" WHERE id = ?').bind(admissionId).run();

    return new Response(JSON.stringify({ message: 'Admission rejected successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
