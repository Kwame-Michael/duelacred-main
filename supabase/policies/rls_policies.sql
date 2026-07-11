-- RLS policy templates for Duelacred
-- Run these in Supabase SQL editor or via CLI: `supabase db query < rls_policies.sql`

-- Users table: map auth.uid() to auth_id and enforce ownership
ALTER TABLE IF EXISTS Users ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_self ON Users;
CREATE POLICY users_self ON Users
  FOR ALL
  USING (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS users_read_all ON Users;
CREATE POLICY users_read_all ON Users
  FOR SELECT USING (true);

-- Investor_Onboarding: owners only
ALTER TABLE IF EXISTS Investor_Onboarding ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE Investor_Onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS investor_onboarding_owner ON Investor_Onboarding;
CREATE POLICY investor_onboarding_owner ON Investor_Onboarding
  FOR ALL
  USING (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS investor_onboarding_read_all ON Investor_Onboarding;
CREATE POLICY investor_onboarding_read_all ON Investor_Onboarding
  FOR SELECT USING (true);

-- SME_Applications: owners + admin
ALTER TABLE IF EXISTS SME_Applications ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE SME_Applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sme_owner ON SME_Applications;
CREATE POLICY sme_owner ON SME_Applications
  FOR ALL
  USING (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS sme_read_all ON SME_Applications;
CREATE POLICY sme_read_all ON SME_Applications
  FOR SELECT USING (true);

-- Admin access helper (example using a custom claim 'role' = 'admin')
-- Adjust according to your auth token contents.
DROP POLICY IF EXISTS sme_admin ON SME_Applications;
CREATE POLICY sme_admin ON SME_Applications
  FOR ALL USING (
    (auth.role() = 'service_role') OR
    (auth.jwt() ->> 'role' = 'admin')
  );

-- Listings: public read, owner/admin write
ALTER TABLE IF EXISTS Listings ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE Listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS listings_public_read ON Listings;
CREATE POLICY listings_public_read ON Listings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS listings_owner_or_admin ON Listings;
CREATE POLICY listings_owner_or_admin ON Listings
  FOR ALL
  USING (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

-- Investments: owners/admins can manage their own rows
ALTER TABLE IF EXISTS Investments ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE Investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS investments_owner_or_admin ON Investments;
CREATE POLICY investments_owner_or_admin ON Investments
  FOR ALL
  USING (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

-- Repayments and Repayment_Proofs: restrict to owners
ALTER TABLE IF EXISTS Repayment_Proofs ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE IF NOT EXISTS Repayments ADD COLUMN IF NOT EXISTS auth_id uuid;
ALTER TABLE Repayment_Proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE Repayments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS repayment_proofs_owner ON Repayment_Proofs;
CREATE POLICY repayment_proofs_owner ON Repayment_Proofs
  FOR ALL
  USING (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS repayment_proofs_read_all ON Repayment_Proofs;
CREATE POLICY repayment_proofs_read_all ON Repayment_Proofs
  FOR SELECT USING (true);
DROP POLICY IF EXISTS repayments_owner ON Repayments;
CREATE POLICY repayments_owner ON Repayments
  FOR ALL
  USING (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth_id IS NULL OR auth.uid() = auth_id OR auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS repayments_read_all ON Repayments;
CREATE POLICY repayments_read_all ON Repayments
  FOR SELECT USING (true);

-- Notes:
-- These are templates. You should map `auth_id` on insert (e.g., via Edge Function or server) and
-- backfill existing rows where possible (by matching email in fields JSON to auth users).
