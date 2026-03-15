-- Scalable Architecture for CanWin Referral System
-- Replaces initial schema with optimized precomputed chains and financial ledgers

-- 1. Users Table (Optimized with JSON upline_chain)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rank TEXT NOT NULL CHECK (rank IN ('Super Admin', 'Platinum', 'SDO', 'SOP', 'SO', 'JSO')),
    referral_code TEXT UNIQUE NOT NULL,
    upline_id INTEGER REFERENCES users(id),
    upline_chain TEXT DEFAULT '[]', -- JSON array of upline IDs: [SO_id, SOP_id, SDO_id, PL_id]
    points INTEGER DEFAULT 0,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'))
);

-- 2. User Stats Cache (Fast Dashboard Reads)
CREATE TABLE IF NOT EXISTS user_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    total_earnings REAL DEFAULT 0,
    wallet_balance REAL DEFAULT 0,
    withdrawable_balance REAL DEFAULT 0,
    pending_balance REAL DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    direct_referrals INTEGER DEFAULT 0,
    team_size INTEGER DEFAULT 0,
    total_admissions INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Courses Table (Added Admission Batches support)
CREATE TABLE IF NOT EXISTS courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    course_price REAL NOT NULL,
    points_per_admission INTEGER NOT NULL,
    commission_pool_percentage REAL NOT NULL, -- e.g., 30 for 30%
    admission_start_date DATETIME,
    admission_end_date DATETIME,
    course_start_date DATETIME,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Admissions Table (With Batch handling)
CREATE TABLE IF NOT EXISTS admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    student_phone TEXT NOT NULL,
    course_id INTEGER REFERENCES courses(course_id),
    admitted_by_user_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by_admin INTEGER REFERENCES users(id),
    approved_at DATETIME,
    UNIQUE(student_phone, course_id) -- Prevent duplicate student admissions for same course
);

-- 5. Financial Ledger (Immutable transaction history)
CREATE TABLE IF NOT EXISTS commission_ledger (
    ledger_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('commission_level_1', 'commission_level_2', 'commission_level_3', 'commission_level_4', 'commission_level_5', 'bonus', 'withdrawal_request', 'withdrawal_rejected', 'admin_adjustment')),
    amount REAL NOT NULL, -- Positive for earnings/refunds, negative for withdrawals
    reference_id INTEGER, -- Points to admission_id, bonus_id, or withdraw_id depending on type
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bonus Campaigns
CREATE TABLE IF NOT EXISTS bonus_campaigns (
    bonus_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(course_id),
    bonus_amount REAL NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    eligible_roles TEXT NOT NULL, -- JSON list or comma separated: 'Super Admin,Platinum,SDO,SOP,SO,JSO'
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Withdrawals Table
CREATE TABLE IF NOT EXISTS withdraw_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    amount REAL NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    ifsc TEXT,
    upi_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Indexes for performance
CREATE INDEX idx_users_ref_code ON users(referral_code);
CREATE INDEX idx_users_upline ON users(upline_id);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_ledger_user ON commission_ledger(user_id);
CREATE INDEX idx_withdrawals_user ON withdraw_requests(user_id);
CREATE INDEX idx_bonus_course ON bonus_campaigns(course_id);

-- 9. Trigger to auto-create user_stats on new user
CREATE TRIGGER trg_create_user_stats
AFTER INSERT ON users
BEGIN
    INSERT INTO user_stats (user_id) VALUES (NEW.id);
END;

-- 10. Seed Initial Data (Ensure Super Admin exists)
INSERT INTO users (name, phone, email, password_hash, rank, referral_code, upline_chain)
VALUES ('Super Admin', 'admin', 'admin@canwin.com', '240be518fabd2724ddb6f0403f023d1f22918d1d526bee5718313dfd50d7560b', 'Super Admin', 'ADMIN', '[]');
