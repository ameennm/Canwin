-- Migration 0006 (additive only, no table rebuilds, safe on live data)
--
-- * users.state replaces users.status as the source of truth. The old status
--   column only allows 'active'/'suspended' and SQLite cannot change a CHECK
--   without rebuilding the table, so the app now writes both: state holds
--   pending/active/suspended/deleted and status mirrors it as active/suspended.
-- * admissions.course_price_at_admission keeps revenue correct if a course
--   price changes later.
-- * login_attempts table for login throttling.
-- * user_stats.total_points synced with users.points.

ALTER TABLE users ADD COLUMN state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('pending', 'active', 'suspended', 'deleted'));
UPDATE users SET state = status;
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);

ALTER TABLE admissions ADD COLUMN course_price_at_admission REAL;
UPDATE admissions SET course_price_at_admission = (SELECT c.course_price FROM courses c WHERE c.course_id = admissions.course_id);
CREATE INDEX IF NOT EXISTS idx_admissions_promoter ON admissions(admitted_by_user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
    login_key TEXT PRIMARY KEY,
    failed_count INTEGER NOT NULL DEFAULT 0,
    last_failed_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_reference ON commission_ledger(reference_id);
INSERT OR IGNORE INTO user_stats (user_id) SELECT id FROM users;
UPDATE user_stats SET total_points = COALESCE((SELECT points FROM users WHERE users.id = user_stats.user_id), 0);
