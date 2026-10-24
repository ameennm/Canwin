import { json, error, serverError, readJson } from '../../../../lib/server/http.js';
import { toUtcIso, OFFER_AMOUNT_FIELDS } from '../../../../lib/server/catalog.js';

// PUT - Update special offer (only the fields sent are changed)
export async function onRequestPut({ params, request, env }) {
  const body = await readJson(request);
  const updates = [];
  const values = [];

  if (body.valid_until !== undefined) {
    const validUntil = toUtcIso(body.valid_until);
    if (!validUntil) return error('Invalid valid_until');
    updates.push('valid_until = ?'); values.push(validUntil);
  }
  for (const field of OFFER_AMOUNT_FIELDS) {
    if (body[field] !== undefined) { updates.push(`${field} = ?`); values.push(Math.max(Number(body[field]) || 0, 0)); }
  }
  if (body.status !== undefined) {
    if (!['active', 'expired', 'cancelled'].includes(body.status)) return error('Invalid status');
    updates.push('status = ?'); values.push(body.status);
  }
  if (updates.length === 0) return error('No fields to update');

  try {
    await env.DB.prepare(`UPDATE special_offers SET ${updates.join(', ')} WHERE offer_id = ?`).bind(...values, params.id).run();
    return json({ message: 'Offer updated successfully' });
  } catch (err) {
    return serverError(err, 'Update offer');
  }
}

// DELETE - Cancel special offer
export async function onRequestDelete({ params, env }) {
  try {
    await env.DB.prepare("UPDATE special_offers SET status = 'cancelled' WHERE offer_id = ?").bind(params.id).run();
    return json({ message: 'Offer cancelled' });
  } catch (err) {
    return serverError(err, 'Cancel offer');
  }
}
