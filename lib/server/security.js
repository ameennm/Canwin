// Password hashing, phone normalisation and login throttling.

const PBKDF2_ITERATIONS = 100000; // Workers' maximum for PBKDF2
const encoder = new TextEncoder();

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toHex(bits);
}

async function legacySha256(password) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(password)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Stored format: pbkdf2$<iterations>$<saltHex>$<hashHex>
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${hash}`;
}

// Returns { ok, needsRehash }. Old accounts still have unsalted SHA-256 hashes;
// those verify once and are upgraded by the caller.
export async function verifyPassword(password, stored) {
  if (!stored || typeof password !== 'string') return { ok: false, needsRehash: false };
  if (stored.startsWith('pbkdf2$')) {
    const [, iterations, saltHex, hashHex] = stored.split('$');
    const candidate = await pbkdf2(password, fromHex(saltHex), Number(iterations));
    return { ok: safeEqual(candidate, hashHex), needsRehash: false };
  }
  const ok = safeEqual(await legacySha256(password), stored);
  return { ok, needsRehash: ok };
}

// Indian mobile numbers: keep the last 10 digits ("+91 98765 43210" -> "9876543210").
// Anything that is not a plain number (e.g. the "admin" login) is returned trimmed.
export function normalizePhone(phone) {
  if (phone === undefined || phone === null) return '';
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits || /[a-z]/i.test(raw)) return raw;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidMobile(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export async function isLoginLocked(db, key) {
  const row = await db.prepare(
    `SELECT failed_count FROM login_attempts
     WHERE login_key = ? AND last_failed_at > datetime('now', ?)`
  ).bind(key, `-${LOCK_MINUTES} minutes`).first();
  return (row?.failed_count || 0) >= MAX_FAILED_LOGINS;
}

export async function recordFailedLogin(db, key) {
  await db.prepare(
    `INSERT INTO login_attempts (login_key, failed_count, last_failed_at)
     VALUES (?, 1, datetime('now'))
     ON CONFLICT(login_key) DO UPDATE SET
       failed_count = CASE WHEN last_failed_at > datetime('now', ?) THEN failed_count + 1 ELSE 1 END,
       last_failed_at = datetime('now')`
  ).bind(key, `-${LOCK_MINUTES} minutes`).run();
}

export async function clearFailedLogins(db, key) {
  await db.prepare('DELETE FROM login_attempts WHERE login_key = ?').bind(key).run();
}
