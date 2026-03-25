// PUT - Update special offer
export async function onRequestPut({ params, request, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const { id } = params;
  const { valid_until, jso_amount, so_amount, sop_amount, sdo_amount, platinum_amount, status } = await request.json();
  const db = env.DB;

  try {
    await db.prepare(`
      UPDATE special_offers
      SET valid_until = COALESCE(?, valid_until),
          jso_amount = COALESCE(?, jso_amount),
          so_amount = COALESCE(?, so_amount),
          sop_amount = COALESCE(?, sop_amount),
          sdo_amount = COALESCE(?, sdo_amount),
          platinum_amount = COALESCE(?, platinum_amount),
          status = COALESCE(?, status)
      WHERE offer_id = ?
    `).bind(valid_until, jso_amount, so_amount, sop_amount, sdo_amount, platinum_amount, status, id).run();

    return new Response(JSON.stringify({ message: 'Offer updated successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

// DELETE - Cancel special offer
export async function onRequestDelete({ params, env, data }) {
  if (data?.user?.rank !== 'Super Admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const { id } = params;
  const db = env.DB;

  try {
    await db.prepare("UPDATE special_offers SET status = 'cancelled' WHERE offer_id = ?").bind(id).run();
    return new Response(JSON.stringify({ message: 'Offer cancelled' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
