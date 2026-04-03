-- Migration 0003: Dynamic commissions and payout tracking

-- 1. Update Courses table for dynamic level payouts
ALTER TABLE courses ADD COLUMN level_1_payout REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN level_2_payout REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN level_3_payout REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN level_4_payout REAL DEFAULT 0;
ALTER TABLE courses ADD COLUMN level_5_payout REAL DEFAULT 0;

-- 2. Update User Stats for payout tracking
ALTER TABLE user_stats ADD COLUMN total_paid REAL DEFAULT 0;

-- 3. Data Migration: Update existing courses to use pool percentage math for levels
-- APP Course (₹500, 30% pool = ₹150)
-- Level 1: 46.7% of 150 = 70.05
-- Level 2: 26.7% of 150 = 40.05
-- Level 3: 13.3% of 150 = 19.95
-- Level 4: 6.7% of 150 = 10.05
-- Level 5: 6.6% of 150 = 9.9
UPDATE courses SET 
    level_1_payout = 70.05,
    level_2_payout = 40.05,
    level_3_payout = 19.95,
    level_4_payout = 10.05,
    level_5_payout = 9.9
WHERE course_name LIKE 'Advanced%';

-- BCC Course (₹300, 20% pool = ₹60)
-- Level 1: 46.7% of 60 = 28.02
-- Level 2: 26.7% of 60 = 16.02
-- Level 3: 13.3% of 60 = 7.98
-- Level 4: 6.7% of 60 = 4.02
-- Level 5: 6.6% of 60 = 3.96
UPDATE courses SET 
    level_1_payout = 28.02,
    level_2_payout = 16.02,
    level_3_payout = 7.98,
    level_4_payout = 4.02,
    level_5_payout = 3.96
WHERE course_name LIKE 'Basic%';

-- 4. Update existing 'approved' withdrawals to 'paid' status as per recommendation
UPDATE withdraw_requests SET status = 'paid' WHERE status = 'approved';
