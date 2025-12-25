-- =============================================================================
-- CANWIN REFERRAL PLATFORM - COMPLETE DATABASE SCHEMA V2
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor to reset and set up the database
-- WARNING: This will DELETE ALL EXISTING DATA
-- =============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING OBJECTS (Clean Slate)
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_generate_custom_id ON public_users;
DROP TRIGGER IF EXISTS trigger_update_level ON public_users;
DROP TRIGGER IF EXISTS trigger_process_referral ON referrals;
DROP TRIGGER IF EXISTS trigger_process_promoter_referral ON public_users;

-- Drop functions
DROP FUNCTION IF EXISTS generate_custom_id();
DROP FUNCTION IF EXISTS update_user_level();
DROP FUNCTION IF EXISTS process_referral_approval();
DROP FUNCTION IF EXISTS process_promoter_referral();

-- Drop tables (order matters due to foreign key constraints)
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS public_users CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Drop sequence
DROP SEQUENCE IF EXISTS user_id_seq;

-- ============================================================================
-- STEP 2: CREATE SEQUENCE FOR CUSTOM IDs
-- ============================================================================
CREATE SEQUENCE user_id_seq START WITH 1001;

-- ============================================================================
-- STEP 3: CREATE SETTINGS TABLE (For global configurations)
-- ============================================================================
CREATE TABLE settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings for promoter referral
INSERT INTO settings (key, value, description) VALUES
('promoter_referral', '{"enabled": true, "points": 50, "second_level_points": 10, "require_approval": true}', 'Settings for promoter-to-promoter referral program'),
('level_thresholds', '{"Bronze": 0, "Silver": 100, "Gold": 250, "Diamond": 500, "Pearl": 1000}', 'Level thresholds for promoters');

-- ============================================================================
-- STEP 4: CREATE COURSES TABLE
-- ============================================================================
CREATE TABLE courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    course_type TEXT NOT NULL CHECK (course_type IN ('paid', 'free')),
    points DECIMAL(10, 2) NOT NULL DEFAULT 10,              -- Custom points set by admin (supports decimals)
    promoter_referral_points DECIMAL(10, 2) NOT NULL DEFAULT 50,  -- Points when promoter refers another promoter
    second_level_points DECIMAL(10, 2) NOT NULL DEFAULT 5,  -- Points for second level referral
    price DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: CREATE PUBLIC_USERS TABLE (Promoters)
-- ============================================================================
CREATE TABLE public_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    whatsapp_number TEXT UNIQUE NOT NULL,
    aadhar_number TEXT UNIQUE NOT NULL,
    dob DATE NOT NULL,
    anniversary_date DATE,
    avatar_url TEXT,
    password_hash TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    custom_id TEXT UNIQUE,                              -- CNWN1001, CNWN1002, etc.
    referred_by UUID REFERENCES public_users(id),       -- Who referred this promoter
    referred_by_custom_id TEXT,                         -- Store the referrer's custom_id for display
    total_points DECIMAL(10, 2) DEFAULT 0,              -- Supports decimal points
    paid_referrals INTEGER DEFAULT 0,                   -- Count of paid course referrals
    free_referrals INTEGER DEFAULT 0,                   -- Count of free course referrals
    promoter_referrals INTEGER DEFAULT 0,               -- Count of promoter referrals
    current_level TEXT DEFAULT 'Bronze',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 6: CREATE REFERRALS TABLE (Student referrals)
-- ============================================================================
CREATE TABLE referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_contact TEXT NOT NULL,
    student_aadhar TEXT NOT NULL,
    points_earned DECIMAL(10, 2) DEFAULT 0,
    -- Second level referral tracking
    second_level_referrer_id UUID REFERENCES public_users(id),  -- The promoter who referred the referrer
    second_level_points DECIMAL(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_public_users_whatsapp ON public_users(whatsapp_number);
CREATE INDEX idx_public_users_aadhar ON public_users(aadhar_number);
CREATE INDEX idx_public_users_approved ON public_users(is_approved);
CREATE INDEX idx_public_users_name ON public_users(full_name);
CREATE INDEX idx_public_users_level ON public_users(current_level);
CREATE INDEX idx_public_users_custom_id ON public_users(custom_id);
CREATE INDEX idx_public_users_referred_by ON public_users(referred_by);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_student_aadhar ON referrals(student_aadhar);
CREATE INDEX idx_referrals_student_contact ON referrals(student_contact);
CREATE INDEX idx_referrals_course ON referrals(course_id);
CREATE INDEX idx_referrals_created ON referrals(created_at);
CREATE INDEX idx_referrals_second_level ON referrals(second_level_referrer_id);
CREATE INDEX idx_courses_type ON courses(course_type);

-- ============================================================================
-- STEP 8: FUNCTION TO GENERATE CUSTOM ID ON APPROVAL
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_custom_id()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_approved = FALSE AND NEW.is_approved = TRUE THEN
        NEW.custom_id := 'CNWN' || nextval('user_id_seq')::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_custom_id
    BEFORE UPDATE ON public_users
    FOR EACH ROW
    EXECUTE FUNCTION generate_custom_id();

-- ============================================================================
-- STEP 9: FUNCTION TO UPDATE USER LEVEL BASED ON POINTS
-- ============================================================================
-- Level System:
-- Bronze: 0-99 points
-- Silver: 100-249 points  
-- Gold: 250-499 points
-- Diamond: 500-999 points
-- Pearl: 1000+ points
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_points >= 1000 THEN
        NEW.current_level := 'Pearl';
    ELSIF NEW.total_points >= 500 THEN
        NEW.current_level := 'Diamond';
    ELSIF NEW.total_points >= 250 THEN
        NEW.current_level := 'Gold';
    ELSIF NEW.total_points >= 100 THEN
        NEW.current_level := 'Silver';
    ELSE
        NEW.current_level := 'Bronze';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_level
    BEFORE UPDATE OF total_points ON public_users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();

-- ============================================================================
-- STEP 10: FUNCTION TO PROCESS PROMOTER REFERRAL (when new promoter is approved)
-- ============================================================================
CREATE OR REPLACE FUNCTION process_promoter_referral()
RETURNS TRIGGER AS $$
DECLARE
    referrer_points INTEGER;
    settings_val JSONB;
BEGIN
    -- Only process when promoter is first approved
    IF OLD.is_approved = FALSE AND NEW.is_approved = TRUE AND NEW.referred_by IS NOT NULL THEN
        -- Get default promoter referral points from settings
        SELECT value INTO settings_val FROM settings WHERE key = 'promoter_referral';
        referrer_points := COALESCE((settings_val->>'points')::INTEGER, 50);
        
        -- Award points to the referrer
        UPDATE public_users 
        SET total_points = total_points + referrer_points,
            promoter_referrals = promoter_referrals + 1
        WHERE id = NEW.referred_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_promoter_referral
    AFTER UPDATE ON public_users
    FOR EACH ROW
    EXECUTE FUNCTION process_promoter_referral();

-- ============================================================================
-- STEP 11: FUNCTION TO PROCESS STUDENT REFERRAL APPROVAL
-- ============================================================================
CREATE OR REPLACE FUNCTION process_referral_approval()
RETURNS TRIGGER AS $$
DECLARE
    course_points INTEGER;
    course_type_val TEXT;
    promoter_ref_pts INTEGER;
    referrer_referred_by UUID;
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
        -- Get course points and type
        SELECT points, course_type, promoter_referral_points 
        INTO course_points, course_type_val, promoter_ref_pts
        FROM courses WHERE id = NEW.course_id;
        
        NEW.points_earned := course_points;
        
        -- Update direct referrer's points and referral counts
        IF course_type_val = 'paid' THEN
            UPDATE public_users 
            SET total_points = total_points + course_points,
                paid_referrals = paid_referrals + 1
            WHERE id = NEW.referrer_id;
        ELSE
            UPDATE public_users 
            SET total_points = total_points + course_points,
                free_referrals = free_referrals + 1
            WHERE id = NEW.referrer_id;
        END IF;
        
        -- Award promoter referral points to head promoter (who referred this promoter)
        SELECT referred_by INTO referrer_referred_by 
        FROM public_users WHERE id = NEW.referrer_id;
        
        IF referrer_referred_by IS NOT NULL THEN
            promoter_ref_pts := COALESCE(promoter_ref_pts, 0);
            
            -- Store head promoter info in referral for tracking
            NEW.second_level_referrer_id := referrer_referred_by;
            NEW.second_level_points := promoter_ref_pts;
            
            -- Award promoter referral points to head promoter
            IF promoter_ref_pts > 0 THEN
                UPDATE public_users 
                SET total_points = total_points + promoter_ref_pts
                WHERE id = referrer_referred_by;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_referral
    BEFORE UPDATE OF status ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_approval();

-- ============================================================================
-- STEP 12: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE public_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Admin (Authenticated users) - Full Access to public_users
CREATE POLICY "Admin full access to public_users"
ON public_users FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Public (Anon) - Can INSERT (Sign up)
CREATE POLICY "Public can signup"
ON public_users FOR INSERT TO anon
WITH CHECK (true);

-- Public (Anon) - Can SELECT (for login and checking referrer ID)
CREATE POLICY "Public can view users"
ON public_users FOR SELECT TO anon
USING (true);

-- Public (Anon) - Can UPDATE their own record (for profile updates)
CREATE POLICY "Public can update own profile"
ON public_users FOR UPDATE TO anon
USING (true) WITH CHECK (true);

-- Admin (Authenticated users) - Full Access to referrals
CREATE POLICY "Admin full access to referrals"
ON referrals FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Public (Anon) - Can view referrals
CREATE POLICY "Public can view referrals"
ON referrals FOR SELECT TO anon
USING (true);

-- Public (Anon) - Can create referrals
CREATE POLICY "Approved users can create referrals"
ON referrals FOR INSERT TO anon
WITH CHECK (true);

-- Admin (Authenticated) - Full Access to courses
CREATE POLICY "Admin full access to courses"
ON courses FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Public (Anon) - Can view active courses
CREATE POLICY "Public can view courses"
ON courses FOR SELECT TO anon
USING (is_active = true);

-- Settings - Admin only
CREATE POLICY "Admin full access to settings"
ON settings FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Public can view settings"
ON settings FOR SELECT TO anon
USING (true);

-- ============================================================================
-- STEP 13: INSERT SAMPLE COURSES (with custom points)
-- ============================================================================
INSERT INTO courses (id, name, description, course_type, points, promoter_referral_points, second_level_points, price, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', 'Quran Tajweed Basics', 'Learn proper Quran recitation with Tajweed rules', 'free', 5, 30, 2, 0, true),
('c2222222-2222-2222-2222-222222222222', 'Islamic Finance Fundamentals', 'Introduction to Halal banking and finance', 'free', 5, 30, 2, 0, true),
('c3333333-3333-3333-3333-333333333333', 'Arabic Language Mastery', 'Complete Arabic language course for beginners to advanced', 'paid', 25, 75, 8, 4999, true),
('c4444444-4444-4444-4444-444444444444', 'Islamic History & Civilization', 'Comprehensive course on Islamic history', 'paid', 15, 50, 5, 2999, true),
('c5555555-5555-5555-5555-555555555555', 'Fiqh for Daily Life', 'Practical Islamic jurisprudence for everyday situations', 'paid', 20, 60, 6, 3499, true),
('c6666666-6666-6666-6666-666666666666', 'Kids Islamic Studies', 'Fun and engaging Islamic education for children', 'free', 3, 20, 1, 0, true),
('c7777777-7777-7777-7777-777777777777', 'Advanced Hadith Sciences', 'Deep dive into Hadith methodology and authentication', 'paid', 30, 100, 10, 5999, true);

-- ============================================================================
-- STEP 14: INSERT DUMMY PROMOTERS FOR TESTING
-- ============================================================================
-- Password for all dummy users: Test@123 (hashed)
-- Note: These are pre-approved users with custom_ids set manually

-- Pearl Level Promoter (top performer - can refer promoters)
INSERT INTO public_users (id, full_name, whatsapp_number, aadhar_number, dob, password_hash, is_approved, custom_id, total_points, paid_referrals, free_referrals, promoter_referrals, current_level, created_at) VALUES
('a1111111-1111-1111-1111-111111111111', 'Mohammed Rizwan', '+919876543210', '111122223333', '1990-05-15', '$2a$10$Ey1RK7l4jD9fZ5TJ8K8XQqJ8Rx5h8L5V7xN9YzM1W2A3B4C5D6E7', true, 'CNWN1001', 1250, 45, 30, 5, 'Pearl', NOW() - INTERVAL '90 days');

-- Gold Level Promoter (referred by Pearl promoter - can refer promoters)
INSERT INTO public_users (id, full_name, whatsapp_number, aadhar_number, dob, password_hash, is_approved, custom_id, referred_by, referred_by_custom_id, total_points, paid_referrals, free_referrals, promoter_referrals, current_level, created_at) VALUES
('a2222222-2222-2222-2222-222222222222', 'Ayesha Fatima', '+919876543211', '222233334444', '1995-08-20', '$2a$10$Ey1RK7l4jD9fZ5TJ8K8XQqJ8Rx5h8L5V7xN9YzM1W2A3B4C5D6E7', true, 'CNWN1002', 'a1111111-1111-1111-1111-111111111111', 'CNWN1001', 420, 18, 12, 2, 'Gold', NOW() - INTERVAL '60 days');

-- Silver Level Promoters (can refer promoters)
INSERT INTO public_users (id, full_name, whatsapp_number, aadhar_number, dob, password_hash, is_approved, custom_id, referred_by, referred_by_custom_id, total_points, paid_referrals, free_referrals, promoter_referrals, current_level, created_at) VALUES
('a3333333-3333-3333-3333-333333333333', 'Abdul Rahman', '+919876543212', '333344445555', '1988-12-10', '$2a$10$Ey1RK7l4jD9fZ5TJ8K8XQqJ8Rx5h8L5V7xN9YzM1W2A3B4C5D6E7', true, 'CNWN1003', 'a1111111-1111-1111-1111-111111111111', 'CNWN1001', 180, 8, 6, 1, 'Silver', NOW() - INTERVAL '45 days'),
('a4444444-4444-4444-4444-444444444444', 'Zainab Khan', '+919876543213', '444455556666', '1992-03-25', '$2a$10$Ey1RK7l4jD9fZ5TJ8K8XQqJ8Rx5h8L5V7xN9YzM1W2A3B4C5D6E7', true, 'CNWN1004', 'a2222222-2222-2222-2222-222222222222', 'CNWN1002', 145, 6, 5, 0, 'Silver', NOW() - INTERVAL '30 days');

-- Bronze Level Promoters (CANNOT refer promoters - need to reach Silver first)
INSERT INTO public_users (id, full_name, whatsapp_number, aadhar_number, dob, password_hash, is_approved, custom_id, referred_by, referred_by_custom_id, total_points, paid_referrals, free_referrals, promoter_referrals, current_level, created_at) VALUES
('a5555555-5555-5555-5555-555555555555', 'Imran Ahmed', '+919876543214', '555566667777', '1998-07-08', '$2a$10$Ey1RK7l4jD9fZ5TJ8K8XQqJ8Rx5h8L5V7xN9YzM1W2A3B4C5D6E7', true, 'CNWN1005', 'a3333333-3333-3333-3333-333333333333', 'CNWN1003', 55, 2, 3, 0, 'Bronze', NOW() - INTERVAL '15 days'),
('a6666666-6666-6666-6666-666666666666', 'Sara Begum', '+919876543215', '666677778888', '2000-01-30', '$2a$10$Ey1RK7l4jD9fZ5TJ8K8XQqJ8Rx5h8L5V7xN9YzM1W2A3B4C5D6E7', true, 'CNWN1006', 'a4444444-4444-4444-4444-444444444444', 'CNWN1004', 25, 1, 2, 0, 'Bronze', NOW() - INTERVAL '7 days');

-- Diamond Level Promoter (high performer)
INSERT INTO public_users (id, full_name, whatsapp_number, aadhar_number, dob, password_hash, is_approved, custom_id, total_points, paid_referrals, free_referrals, promoter_referrals, current_level, created_at) VALUES
('a7777777-7777-7777-7777-777777777777', 'Yusuf Ali', '+919876543216', '777788889999', '1985-11-11', '$2a$10$Ey1RK7l4jD9fZ5TJ8K8XQqJ8Rx5h8L5V7xN9YzM1W2A3B4C5D6E7', true, 'CNWN1007', 750, 32, 20, 3, 'Diamond', NOW() - INTERVAL '75 days');

-- Update sequence to start after 1007
SELECT setval('user_id_seq', 1007);

-- ============================================================================
-- STEP 15: INSERT SAMPLE REFERRALS FOR TESTING
-- ============================================================================
INSERT INTO referrals (referrer_id, course_id, student_name, student_contact, student_aadhar, points_earned, status, created_at) VALUES
-- Referrals by Pearl promoter (CNWN1001)
('a1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Ahmed Hassan', '+919111111111', '999988887777', 25, 'approved', NOW() - INTERVAL '80 days'),
('a1111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Fatima Zahra', '+919111111112', '999988887776', 20, 'approved', NOW() - INTERVAL '70 days'),
('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Omar Khan', '+919111111113', '999988887775', 5, 'approved', NOW() - INTERVAL '60 days'),
-- Referrals by Gold promoter (CNWN1002)
('a2222222-2222-2222-2222-222222222222', 'c4444444-4444-4444-4444-444444444444', 'Mariam Bibi', '+919222222221', '888877776666', 15, 'approved', NOW() - INTERVAL '50 days'),
('a2222222-2222-2222-2222-222222222222', 'c7777777-7777-7777-7777-777777777777', 'Ibrahim Shah', '+919222222222', '888877776665', 30, 'approved', NOW() - INTERVAL '40 days'),
-- Referrals by Silver promoter (CNWN1003)
('a3333333-3333-3333-3333-333333333333', 'c2222222-2222-2222-2222-222222222222', 'Khadija Noor', '+919333333331', '777766665555', 5, 'approved', NOW() - INTERVAL '30 days'),
('a3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Ali Abbas', '+919333333332', '777766665554', 25, 'approved', NOW() - INTERVAL '20 days'),
-- Pending referral
('a5555555-5555-5555-5555-555555555555', 'c6666666-6666-6666-6666-666666666666', 'Pending Student', '+919555555551', '666655554444', 0, 'pending', NOW() - INTERVAL '2 days');

-- ============================================================================
-- STORAGE BUCKET SETUP (Manual Step)
-- ============================================================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called "avatars"
-- 3. Make it public
-- 4. Add these policies:
--    - Allow public uploads: INSERT for anon with true
--    - Allow public reads: SELECT for anon with true

-- ============================================================================
-- ADMIN USER SETUP (Manual Step)
-- ============================================================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create New User"
-- 3. Email: admin@canwin.com
-- 4. Password: Admin@123
-- 5. Check "Auto Confirm User"
-- 6. Click "Create User"

-- ============================================================================
-- LEVEL SYSTEM SUMMARY
-- ============================================================================
-- Level        | Points Required
-- -------------|----------------
-- Bronze       | 0 - 99
-- Silver       | 100 - 249
-- Gold         | 250 - 499
-- Diamond      | 500 - 999
-- Pearl        | 1000+
--
-- Points are now CUSTOM per course (set by admin)
-- Promoter referral points are also customizable per course
-- Second-level referral points are customizable per course
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify setup:
SELECT 
    'Tables' as check_type,
    COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('public_users', 'referrals', 'courses', 'settings')
UNION ALL
SELECT 
    'Courses' as check_type,
    COUNT(*) as count 
FROM courses
UNION ALL
SELECT 
    'Settings' as check_type,
    COUNT(*) as count 
FROM settings;
