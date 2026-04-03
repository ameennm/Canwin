-- Fix admin record with correct hash and active status
UPDATE users 
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8faa822809f74c720a9',
    status = 'active'
WHERE phone = 'admin';

-- If it doesn't exist, insert it
INSERT OR IGNORE INTO users (name, phone, email, password_hash, rank, referral_code, upline_chain, status)
VALUES ('Super Admin', 'admin', 'admin@canwin.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8faa822809f74c720a9', 'Super Admin', 'ADMIN', '[]', 'active');
