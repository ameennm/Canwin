// Promoter hierarchy rules shared by registration, admin user management and payouts.

// Lowest to highest. Super Admin sits above every promoter rank.
export const RANK_ORDER = ['JSO', 'SO', 'SOP', 'SDO', 'Platinum', 'Super Admin'];
export const PROMOTER_RANKS = ['JSO', 'SO', 'SOP', 'SDO', 'Platinum'];

const RANK_ALIASES = {
  'Junior Sales Officer': 'JSO',
  'Sales Officer': 'SO',
  'Sales Officer Premium': 'SOP',
  'Senior Development Officer': 'SDO',
  'Platinum Leader': 'Platinum',
};

export function normalizeRank(rank) {
  const value = RANK_ALIASES[rank] || rank;
  return PROMOTER_RANKS.includes(value) ? value : null;
}

export function rankIndex(rank) {
  return RANK_ORDER.indexOf(rank);
}

// A recruiter may only bring in people below their own rank.
export function canRecruit(uplineRank, newRank) {
  return rankIndex(uplineRank) > rankIndex(newRank);
}

// Points needed for each automatic promotion.
const PROMOTION_THRESHOLDS = [
  { rank: 'Platinum', points: 500 },
  { rank: 'SDO', points: 200 },
  { rank: 'SOP', points: 75 },
  { rank: 'SO', points: 20 },
];

// Rank earned by points, never a demotion, and never equal to or above the
// person's own upline (unless that upline is the Super Admin).
export function promotedRank(currentRank, points, uplineRank) {
  const earned = PROMOTION_THRESHOLDS.find(t => points >= t.points)?.rank || 'JSO';
  let target = rankIndex(earned) > rankIndex(currentRank) ? earned : currentRank;
  if (uplineRank && uplineRank !== 'Super Admin' && rankIndex(target) >= rankIndex(uplineRank)) {
    target = RANK_ORDER[Math.max(rankIndex(uplineRank) - 1, rankIndex(currentRank))];
  }
  return target;
}

export function parseChain(json) {
  try {
    const chain = JSON.parse(json || '[]');
    return Array.isArray(chain) ? chain.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

// Looks up the recruiter for a referral code. 'ADMIN' means the Super Admin.
export async function findUpline(db, referralCode) {
  const code = String(referralCode || '').trim().toUpperCase();
  if (!code) return null;
  const query = code === 'ADMIN'
    ? db.prepare("SELECT id, rank, state AS status, upline_chain FROM users WHERE rank = 'Super Admin' AND state = 'active' ORDER BY id LIMIT 1")
    : db.prepare("SELECT id, rank, state AS status, upline_chain FROM users WHERE UPPER(referral_code) = ? AND state = 'active'").bind(code);
  const upline = await query.first();
  if (!upline) return null;
  return { ...upline, chain: [upline.id, ...parseChain(upline.upline_chain)] };
}

// users.state is the real account state (pending/active/suspended/deleted).
// users.status is the original column, which only allows active/suspended;
// it is kept in step so older queries still treat non-active users as blocked.
export function legacyStatus(state) {
  return state === 'active' ? 'active' : 'suspended';
}

// Statements that insert a user and give them a referral code derived from
// their row id (CNWN + id + 1000), so codes can never collide.
export function insertUserStatements(db, { name, phone, email, passwordHash, rank, uplineId, uplineChain, status }) {
  const tempCode = `TMP-${crypto.randomUUID()}`;
  return {
    tempCode,
    statements: [
      db.prepare(`
        INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_id, upline_chain, status, state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(name, phone, email, passwordHash, rank, tempCode, uplineId, JSON.stringify(uplineChain), legacyStatus(status), status),
      db.prepare("UPDATE users SET referral_code = 'CNWN' || (id + 1000) WHERE referral_code = ?").bind(tempCode),
    ],
  };
}

// Keeps direct_referrals / team_size in step when a user joins (+1) or leaves (-1) the active team.
export function teamStatsStatements(db, user, delta) {
  const statements = [];
  if (user.upline_id) {
    statements.push(db.prepare('UPDATE user_stats SET direct_referrals = MAX(direct_referrals + ?, 0) WHERE user_id = ?').bind(delta, user.upline_id));
  }
  for (const ancestorId of parseChain(user.upline_chain)) {
    statements.push(db.prepare('UPDATE user_stats SET team_size = MAX(team_size + ?, 0) WHERE user_id = ?').bind(delta, ancestorId));
  }
  return statements;
}
