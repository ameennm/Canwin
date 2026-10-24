-- Migration 0007 (additive only)
-- Money is paid outside the website; these columns record what the admin
-- actually paid, when, and any note (UPI reference, date, etc.).
-- source = 'request' (promoter asked) or 'admin' (admin recorded a payment directly).

ALTER TABLE withdraw_requests ADD COLUMN paid_amount REAL;
ALTER TABLE withdraw_requests ADD COLUMN paid_at DATETIME;
ALTER TABLE withdraw_requests ADD COLUMN note TEXT;
ALTER TABLE withdraw_requests ADD COLUMN source TEXT NOT NULL DEFAULT 'request';

UPDATE withdraw_requests SET paid_amount = amount, paid_at = updated_at WHERE status = 'paid';
