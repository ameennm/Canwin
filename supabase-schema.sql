-- =============================================================================
-- CANWIN REFERRAL PLATFORM - FRESH DATABASE SCHEMA
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

-- Drop functions
DROP FUNCTION IF EXISTS generate_custom_id();
DROP FUNCTION IF EXISTS update_user_level();
DROP FUNCTION IF EXISTS process_referral_approval();

-- Drop tables (referrals first due to foreign key constraints)
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS public_users CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- Drop sequence
DROP SEQUENCE IF EXISTS user_id_seq;

-- ============================================================================
-- STEP 2: CREATE SEQUENCE FOR CUSTOM IDs
-- ============================================================================
CREATE SEQUENCE user_id_seq START WITH 1001;

-- ============================================================================
-- STEP 3: CREATE COURSES TABLE
-- ============================================================================
CREATE TABLE courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    course_type TEXT NOT NULL CHECK (course_type IN ('paid', 'free')),
    points INTEGER NOT NULL DEFAULT 2,
    price DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: CREATE PUBLIC_USERS TABLE
-- ============================================================================
-- This table is for public signups (not linked to auth.users for flexibility)
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
    custom_id TEXT,
    total_points INTEGER DEFAULT 0,
    paid_referrals INTEGER DEFAULT 0,
    free_referrals INTEGER DEFAULT 0,
    current_level TEXT DEFAULT 'Bronze',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: CREATE REFERRALS TABLE
-- ============================================================================
CREATE TABLE referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_contact TEXT NOT NULL,
    student_aadhar TEXT NOT NULL,
    points_earned INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_public_users_whatsapp ON public_users(whatsapp_number);
CREATE INDEX idx_public_users_aadhar ON public_users(aadhar_number);
CREATE INDEX idx_public_users_approved ON public_users(is_approved);
CREATE INDEX idx_public_users_name ON public_users(full_name);
CREATE INDEX idx_public_users_level ON public_users(current_level);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_student_aadhar ON referrals(student_aadhar);
CREATE INDEX idx_referrals_student_contact ON referrals(student_contact);
CREATE INDEX idx_referrals_course ON referrals(course_id);
CREATE INDEX idx_referrals_created ON referrals(created_at);
CREATE INDEX idx_courses_type ON courses(course_type);

-- ============================================================================
-- STEP 7: FUNCTION TO GENERATE CUSTOM ID ON APPROVAL
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
-- STEP 8: FUNCTION TO UPDATE USER LEVEL BASED ON POINTS
-- ============================================================================
-- NEW LEVEL SYSTEM:
-- Bronze: 0-99 points
-- Silver: 100-249 points  
-- Gold: 250-499 points
-- Diamond: 500+ points
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_points >= 500 THEN
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
-- STEP 9: FUNCTION TO PROCESS REFERRAL APPROVAL
-- ============================================================================
-- Points: Free = 2, Paid = 10
-- ============================================================================
CREATE OR REPLACE FUNCTION process_referral_approval()
RETURNS TRIGGER AS $$
DECLARE
    course_points INTEGER;
    course_type_val TEXT;
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
        SELECT points, course_type INTO course_points, course_type_val
        FROM courses WHERE id = NEW.course_id;
        
        NEW.points_earned := course_points;
        
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_referral
    BEFORE UPDATE OF status ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_approval();

-- ============================================================================
-- STEP 10: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE public_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Admin (Authenticated users) - Full Access to public_users
CREATE POLICY "Admin full access to public_users"
ON public_users FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Public (Anon) - Can INSERT (Sign up)
CREATE POLICY "Public can signup"
ON public_users FOR INSERT TO anon
WITH CHECK (true);

-- Public (Anon) - Can SELECT their own record by whatsapp_number
CREATE POLICY "Public can check own status"
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

-- ============================================================================
-- STEP 11: INSERT SAMPLE COURSES
-- ============================================================================
INSERT INTO courses (id, name, description, course_type, points, price, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', 'Quran Tajweed Basics', 'Learn proper Quran recitation with Tajweed rules', 'free', 2, 0, true),
('c2222222-2222-2222-2222-222222222222', 'Islamic Finance Fundamentals', 'Introduction to Halal banking and finance', 'free', 2, 0, true),
('c3333333-3333-3333-3333-333333333333', 'Arabic Language Mastery', 'Complete Arabic language course for beginners to advanced', 'paid', 10, 4999, true),
('c4444444-4444-4444-4444-444444444444', 'Islamic History & Civilization', 'Comprehensive course on Islamic history', 'paid', 10, 2999, true),
('c5555555-5555-5555-5555-555555555555', 'Fiqh for Daily Life', 'Practical Islamic jurisprudence for everyday situations', 'paid', 10, 3499, true),
('c6666666-6666-6666-6666-666666666666', 'Kids Islamic Studies', 'Fun and engaging Islamic education for children', 'free', 2, 0, true),
('c7777777-7777-7777-7777-777777777777', 'Advanced Hadith Sciences', 'Deep dive into Hadith methodology and authentication', 'paid', 10, 5999, true);

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
-- Diamond      | 500+
--
-- Points per referral:
-- Free Course  | 2 points
-- Paid Course  | 10 points
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
AND table_name IN ('public_users', 'referrals', 'courses')
UNION ALL
SELECT 
    'Courses' as check_type,
    COUNT(*) as count 
FROM courses;
