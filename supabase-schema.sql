-- =============================================================================
-- CANWIN REFERRAL PLATFORM - DATABASE SCHEMA (UPDATED WITH COURSES & POINTS)
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor to set up the database
-- =============================================================================

-- 1. Create sequence for generating custom IDs
CREATE SEQUENCE IF NOT EXISTS user_id_seq START WITH 1001;

-- 2. Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    course_type TEXT NOT NULL CHECK (course_type IN ('paid', 'free')),
    points INTEGER NOT NULL DEFAULT 2,
    price DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create public_users table (No relation to auth.users - for public signups)
CREATE TABLE IF NOT EXISTS public_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    whatsapp_number TEXT UNIQUE NOT NULL,
    aadhar_number TEXT UNIQUE NOT NULL,
    dob DATE NOT NULL,
    anniversary_date DATE,
    avatar_url TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    custom_id TEXT,
    total_points INTEGER DEFAULT 0,
    paid_referrals INTEGER DEFAULT 0,
    free_referrals INTEGER DEFAULT 0,
    current_level TEXT DEFAULT 'Initiator',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create referrals table (with course reference)
CREATE TABLE IF NOT EXISTS referrals (
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

-- 5. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_public_users_whatsapp ON public_users(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_public_users_aadhar ON public_users(aadhar_number);
CREATE INDEX IF NOT EXISTS idx_public_users_approved ON public_users(is_approved);
CREATE INDEX IF NOT EXISTS idx_public_users_name ON public_users(full_name);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_student_aadhar ON referrals(student_aadhar);
CREATE INDEX IF NOT EXISTS idx_referrals_course ON referrals(course_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON referrals(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(course_type);

-- 6. Function to generate custom_id when user is approved
CREATE OR REPLACE FUNCTION generate_custom_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate ID when is_approved changes from false to true
    IF OLD.is_approved = FALSE AND NEW.is_approved = TRUE THEN
        NEW.custom_id := 'CNWN' || nextval('user_id_seq')::TEXT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for custom_id generation
DROP TRIGGER IF EXISTS trigger_generate_custom_id ON public_users;
CREATE TRIGGER trigger_generate_custom_id
    BEFORE UPDATE ON public_users
    FOR EACH ROW
    EXECUTE FUNCTION generate_custom_id();

-- 8. Function to update user level based on total points
-- Level Thresholds:
-- Initiator: 0-99 points
-- Advocate: 100-199 points
-- Guardian: 200-299 points
-- Mentor: 300-399 points
-- Luminary: 400+ points
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_level based on total_points
    IF NEW.total_points >= 400 THEN
        NEW.current_level := 'Luminary';
    ELSIF NEW.total_points >= 300 THEN
        NEW.current_level := 'Mentor';
    ELSIF NEW.total_points >= 200 THEN
        NEW.current_level := 'Guardian';
    ELSIF NEW.total_points >= 100 THEN
        NEW.current_level := 'Advocate';
    ELSE
        NEW.current_level := 'Initiator';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for level updates
DROP TRIGGER IF EXISTS trigger_update_level ON public_users;
CREATE TRIGGER trigger_update_level
    BEFORE UPDATE OF total_points ON public_users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();

-- 10. Function to add points when referral is approved
CREATE OR REPLACE FUNCTION process_referral_approval()
RETURNS TRIGGER AS $$
DECLARE
    course_points INTEGER;
    course_type_val TEXT;
BEGIN
    -- Only process when status changes from 'pending' to 'approved'
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
        -- Get course details
        SELECT points, course_type INTO course_points, course_type_val
        FROM courses WHERE id = NEW.course_id;
        
        -- Set points earned on the referral
        NEW.points_earned := course_points;
        
        -- Update user's points and referral counts
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

-- 11. Create trigger for referral approval
DROP TRIGGER IF EXISTS trigger_process_referral ON referrals;
CREATE TRIGGER trigger_process_referral
    BEFORE UPDATE OF status ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION process_referral_approval();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on tables
ALTER TABLE public_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin full access to public_users" ON public_users;
DROP POLICY IF EXISTS "Public can signup" ON public_users;
DROP POLICY IF EXISTS "Public can check own status" ON public_users;
DROP POLICY IF EXISTS "Admin full access to referrals" ON referrals;
DROP POLICY IF EXISTS "Public can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Approved users can create referrals" ON referrals;
DROP POLICY IF EXISTS "Admin full access to courses" ON courses;
DROP POLICY IF EXISTS "Public can view courses" ON courses;

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

-- Admin (Authenticated users) - Full Access to referrals
CREATE POLICY "Admin full access to referrals"
ON referrals FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Public (Anon) - Can view own referrals
CREATE POLICY "Public can view own referrals"
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

-- =============================================================================
-- SAMPLE COURSES DATA
-- =============================================================================

-- Insert sample courses
INSERT INTO courses (id, name, description, course_type, points, price, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', 'Quran Tajweed Basics', 'Learn proper Quran recitation with Tajweed rules', 'free', 2, 0, true),
('c2222222-2222-2222-2222-222222222222', 'Islamic Finance Fundamentals', 'Introduction to Halal banking and finance', 'free', 2, 0, true),
('c3333333-3333-3333-3333-333333333333', 'Arabic Language Mastery', 'Complete Arabic language course for beginners to advanced', 'paid', 10, 4999, true),
('c4444444-4444-4444-4444-444444444444', 'Islamic History & Civilization', 'Comprehensive course on Islamic history', 'paid', 10, 2999, true),
('c5555555-5555-5555-5555-555555555555', 'Fiqh for Daily Life', 'Practical Islamic jurisprudence for everyday situations', 'paid', 10, 3499, true),
('c6666666-6666-6666-6666-666666666666', 'Kids Islamic Studies', 'Fun and engaging Islamic education for children', 'free', 2, 0, true),
('c7777777-7777-7777-7777-777777777777', 'Advanced Hadith Sciences', 'Deep dive into Hadith methodology and authentication', 'paid', 10, 5999, true);

-- =============================================================================
-- SAMPLE USERS DATA
-- =============================================================================

-- Insert sample approved users (with points calculated)
INSERT INTO public_users (id, full_name, whatsapp_number, aadhar_number, dob, is_approved, custom_id, total_points, paid_referrals, free_referrals, current_level, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Ahmed Khan', '+919876543210', '123456789012', '1990-05-15', true, 'CNWN1001', 150, 12, 15, 'Advocate', NOW() - INTERVAL '30 days'),
('22222222-2222-2222-2222-222222222222', 'Fatima Begum', '+919876543211', '234567890123', '1988-08-22', true, 'CNWN1002', 280, 25, 15, 'Guardian', NOW() - INTERVAL '25 days'),
('33333333-3333-3333-3333-333333333333', 'Mohammed Ali', '+919876543212', '345678901234', '1995-12-01', true, 'CNWN1003', 60, 4, 10, 'Initiator', NOW() - INTERVAL '20 days'),
('44444444-4444-4444-4444-444444444444', 'Ayesha Siddiqui', '+919876543213', '456789012345', '1992-03-10', true, 'CNWN1004', 350, 30, 25, 'Mentor', NOW() - INTERVAL '15 days'),
('55555555-5555-5555-5555-555555555555', 'Yusuf Rahman', '+919876543214', '567890123456', '1985-07-28', true, 'CNWN1005', 520, 45, 35, 'Luminary', NOW() - INTERVAL '10 days');

-- Update the sequence to continue from where we left off
SELECT setval('user_id_seq', 1005);

-- Insert sample pending users (waiting for approval)
INSERT INTO public_users (id, full_name, whatsapp_number, aadhar_number, dob, is_approved, created_at) VALUES
('66666666-6666-6666-6666-666666666666', 'Zainab Patel', '+919876543215', '678901234567', '1998-11-05', false, NOW() - INTERVAL '2 days'),
('77777777-7777-7777-7777-777777777777', 'Ibrahim Sheikh', '+919876543216', '789012345678', '2000-01-20', false, NOW() - INTERVAL '1 day'),
('88888888-8888-8888-8888-888888888888', 'Mariam Qureshi', '+919876543217', '890123456789', '1997-06-14', false, NOW() - INTERVAL '12 hours');

-- =============================================================================
-- SAMPLE REFERRALS DATA (With different dates for analytics)
-- =============================================================================

-- Ahmed Khan's referrals (mix of paid and free, different months)
INSERT INTO referrals (referrer_id, course_id, student_name, student_contact, student_aadhar, points_earned, status, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'Student A1', '+919988770001', '111100001111', 10, 'approved', NOW() - INTERVAL '28 days'),
('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Student A2', '+919988770002', '111100002222', 2, 'approved', NOW() - INTERVAL '25 days'),
('11111111-1111-1111-1111-111111111111', 'c4444444-4444-4444-4444-444444444444', 'Student A3', '+919988770003', '111100003333', 10, 'approved', NOW() - INTERVAL '20 days'),
('11111111-1111-1111-1111-111111111111', 'c5555555-5555-5555-5555-555555555555', 'Student A4', '+919988770004', '111100004444', 10, 'approved', NOW() - INTERVAL '15 days'),
('11111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'Student A5', '+919988770005', '111100005555', 2, 'approved', NOW() - INTERVAL '10 days');

-- Fatima Begum's referrals
INSERT INTO referrals (referrer_id, course_id, student_name, student_contact, student_aadhar, points_earned, status, created_at) VALUES
('22222222-2222-2222-2222-222222222222', 'c7777777-7777-7777-7777-777777777777', 'Student B1', '+919988770011', '222200001111', 10, 'approved', NOW() - INTERVAL '22 days'),
('22222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333', 'Student B2', '+919988770012', '222200002222', 10, 'approved', NOW() - INTERVAL '18 days'),
('22222222-2222-2222-2222-222222222222', 'c6666666-6666-6666-6666-666666666666', 'Student B3', '+919988770013', '222200003333', 2, 'approved', NOW() - INTERVAL '14 days');

-- Pending referrals for testing
INSERT INTO referrals (referrer_id, course_id, student_name, student_contact, student_aadhar, status, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'New Student Alpha', '+919988776610', '333344445555', 'pending', NOW() - INTERVAL '3 days'),
('22222222-2222-2222-2222-222222222222', 'c5555555-5555-5555-5555-555555555555', 'New Student Beta', '+919988776611', '333344446666', 'pending', NOW() - INTERVAL '2 days'),
('33333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'New Student Gamma', '+919988776612', '333344447777', 'pending', NOW() - INTERVAL '1 day'),
('44444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 'New Student Delta', '+919988776613', '333344448888', 'pending', NOW() - INTERVAL '6 hours'),
('55555555-5555-5555-5555-555555555555', 'c7777777-7777-7777-7777-777777777777', 'New Student Epsilon', '+919988776614', '333344449999', 'pending', NOW() - INTERVAL '2 hours');

-- =============================================================================
-- STORAGE BUCKET FOR AVATARS
-- =============================================================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called "avatars"
-- 3. Make it public
-- 4. Add policy for anonymous uploads

-- =============================================================================
-- ADMIN USER SETUP
-- =============================================================================
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create New User"
-- 3. Email: admin@canwin.com
-- 4. Password: Admin@123
-- 5. Check "Auto Confirm User"
-- 6. Click "Create User"
--
-- =============================================================================
-- TEST ACCOUNTS
-- =============================================================================
-- Approved Users (WhatsApp login):
--   +919876543210 (Ahmed Khan - 150 pts, Advocate)
--   +919876543211 (Fatima Begum - 280 pts, Guardian)
--   +919876543212 (Mohammed Ali - 60 pts, Initiator)
--   +919876543213 (Ayesha Siddiqui - 350 pts, Mentor)
--   +919876543214 (Yusuf Rahman - 520 pts, Luminary)
--
-- Pending Users:
--   +919876543215 (Zainab Patel)
--   +919876543216 (Ibrahim Sheikh)
--   +919876543217 (Mariam Qureshi)
--
-- =============================================================================
-- LEVEL SYSTEM (Points Required)
-- =============================================================================
-- Initiator: 0-99 points
-- Advocate: 100-199 points (need 100 pts from Initiator)
-- Guardian: 200-299 points (need 100 pts from Advocate)
-- Mentor: 300-399 points (need 100 pts from Guardian)
-- Luminary: 400+ points (need 100 pts from Mentor)
--
-- Points per referral:
-- Paid Course: 10 points
-- Free Course: 2 points
