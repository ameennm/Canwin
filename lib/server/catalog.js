// Course and campaign field helpers.

export const COURSE_MONEY_FIELDS = [
  'level_1_payout', 'level_2_payout', 'level_3_payout', 'level_4_payout', 'level_5_payout',
  'comm_jso', 'comm_so', 'comm_sop', 'comm_sdo', 'comm_platinum',
];

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
