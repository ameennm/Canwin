// Course and campaign field helpers.

export const COURSE_MONEY_FIELDS = [
  'level_1_payout', 'level_2_payout', 'level_3_payout', 'level_4_payout', 'level_5_payout',
  'comm_jso', 'comm_so', 'comm_sop', 'comm_sdo', 'comm_platinum',
];

// Most a single admission can pay out across levels 1-5 (level 1 uses the
// highest of the level 1 payout and the per-rank amounts).
export function payoutTotal(course) {
  const n = (v) => Number(v) || 0;
  const level1 = Math.max(n(course.level_1_payout), n(course.comm_jso), n(course.comm_so), n(course.comm_sop), n(course.comm_sdo), n(course.comm_platinum));
  return Math.round((level1 + n(course.level_2_payout) + n(course.level_3_payout) + n(course.level_4_payout) + n(course.level_5_payout)) * 100) / 100;
}

export function payoutError(course) {
  const price = Number(course.course_price) || 0;
  const total = payoutTotal(course);
  return price > 0 && total > price
    ? `Total commission (₹${total}) cannot be more than the course fee (₹${price})`
    : null;
}

export function toCourseStatus(status) {
  if (status === 'inactive' || status === false) return 'closed';
  return ['active', 'closed', 'draft'].includes(status) ? status : 'active';
}

export const OFFER_AMOUNT_FIELDS = ['jso_amount', 'so_amount', 'sop_amount', 'sdo_amount', 'platinum_amount'];

// Stored as UTC ISO strings so they compare correctly with the server clock.
export function toUtcIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
