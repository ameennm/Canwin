-- ============================================================
-- Migration 0003: Rank-Based Commissions, Course Scheduling,
-- Special Offers, and Admission Tracking
-- ============================================================

-- STEP 1: Add rank-based commission columns to courses table
-- These store absolute INR amounts per rank for Level 1 (direct referrer) commission
ALTER TABLE courses ADD COLUMN comm_jso REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN comm_so  REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN comm_sop REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN comm_sdo REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN comm_platinum REAL DEFAULT 0;

-- STEP 2: Add schedule status
ALTER TABLE courses ADD COLUMN schedule_status TEXT DEFAULT 'unscheduled'
    CHECK (schedule_status IN ('unscheduled', 'scheduled', 'closed'));

-- STEP 3: Fix existing admin user password hash (SHA-256 of "admin123")
UPDATE users SET password_hash = '240be518fabd2724ddb6f0403f023d1f22918d1d526bee5718313dfd50d7560b' WHERE rank = 'Super Admin';

-- STEP 4: Normalize existing rank names to abbreviated forms
UPDATE users SET rank = 'Platinum' WHERE rank = 'Platinum Leader';
UPDATE users SET rank = 'SDO' WHERE rank = 'Senior Development Officer';
UPDATE users SET rank = 'SOP' WHERE rank = 'Sales Officer Premium';
UPDATE users SET rank = 'SO' WHERE rank = 'Sales Officer';
UPDATE users SET rank = 'JSO' WHERE rank = 'Junior Sales Officer';

-- STEP 5: Track referrer's rank AT admission time for commission calculation
-- We store the referrer's rank when the admission is created, so even if they
-- get promoted later, the commission is based on their rank at admission time.
ALTER TABLE admissions ADD COLUMN referrer_rank_at_admission TEXT
    CHECK (referrer_rank_at_admission IN ('JSO', 'SO', 'SOP', 'SDO', 'Platinum', 'Super Admin', NULL));

-- Backfill existing approved admissions with their referrer's current rank
UPDATE admissions
SET referrer_rank_at_admission = (
    SELECT u.rank FROM users u WHERE u.id = admissions.admitted_by_user_id
)
WHERE status = 'approved' AND referrer_rank_at_admission IS NULL;

-- STEP 6: Store special offers table
CREATE TABLE IF NOT EXISTS special_offers (
    offer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(course_id),
    valid_until DATETIME NOT NULL,
    -- Per-rank increased commission amounts (absolute INR, ADDED on top of base commission)
    jso_amount REAL NOT NULL DEFAULT 0,
    so_amount  REAL NOT NULL DEFAULT 0,
    sop_amount REAL NOT NULL DEFAULT 0,
    sdo_amount REAL NOT NULL DEFAULT 0,
    platinum_amount REAL NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- STEP 7: Add indexes for efficient offer lookups
CREATE INDEX IF NOT EXISTS idx_special_offers_course ON special_offers(course_id);
CREATE INDEX IF NOT EXISTS idx_special_offers_validity ON special_offers(valid_until);
CREATE INDEX IF NOT EXISTS idx_special_offers_status ON special_offers(status);
