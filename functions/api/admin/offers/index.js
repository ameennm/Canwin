// GET - List all special offers
export async function onRequestGet({ env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  const db = env.DB;
  try {
    const offers = await db.prepare(`
      SELECT o.*, c.course_name, c.course_price
      FROM special_offers o
      JOIN courses c ON o.course_id = c.course_id
      ORDER BY o.created_at DESC
    `).all();

    const now = new Date();
    const formattedOffers = offers.results.map(o => ({
      ...o,
      isActive: new Date(o.valid_until) > now && o.status === 'active'
    }));

    return new Response(JSON.stringify(formattedOffers), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// POST - Create special offer
export async function onRequestPost({ request, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const { course_id, valid_until, jso_amount, so_amount, sop_amount, sdo_amount, platinum_amount } = await request.json();
  const db = env.DB;

  try {
    if (!course_id || !valid_until) {
      return new Response(JSON.stringify({ error: 'course_id and valid_until are required' }), { status: 400 });
    }

    const course = await db.prepare('SELECT course_id FROM courses WHERE course_id = ?').bind(course_id).first();
    if (!course) return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404 });

    const result = await db.prepare(`
      INSERT INTO special_offers (course_id, valid_until, jso_amount, so_amount, sop_amount, sdo_amount, platinum_amount, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      course_id, valid_until,
      jso_amount || 0, so_amount || 0, sop_amount || 0, sdo_amount || 0, platinum_amount || 0,
      data.user.id
    ).run();

    return new Response(JSON.stringify({
      message: 'Special offer created successfully',
      offer_id: result.lastRowId
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
