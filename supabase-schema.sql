-- Supabase schema for Duelacred frontend
-- Run these statements in Supabase SQL editor or with `supabase db query`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS Users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_fields_email ON Users (((fields->>'Email')));
CREATE INDEX IF NOT EXISTS idx_users_fields_role ON Users (((fields->>'Role')));

CREATE TABLE IF NOT EXISTS SME_Applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sme_applications_fields_email ON SME_Applications (((fields->>'Submitted By Email')));
CREATE INDEX IF NOT EXISTS idx_sme_applications_fields_status ON SME_Applications (((fields->>'Status')));

CREATE TABLE IF NOT EXISTS Listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_fields_status ON Listings (((fields->>'Status')));
CREATE INDEX IF NOT EXISTS idx_listings_fields_sme_app_id ON Listings (((fields->>'SME Application ID')));

CREATE TABLE IF NOT EXISTS Investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investments_fields_investor_email ON Investments (((fields->>'Investor Email')));
CREATE INDEX IF NOT EXISTS idx_investments_fields_listing_id ON Investments (((fields->>'Listing ID')));

CREATE TABLE IF NOT EXISTS Repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repayments_fields_listing_id ON Repayments (((fields->>'Listing ID')));
CREATE INDEX IF NOT EXISTS idx_repayments_fields_month_number ON Repayments (((fields->>'Month Number')));

CREATE TABLE IF NOT EXISTS Repayment_Proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repayment_proofs_fields_listing_id ON Repayment_Proofs (((fields->>'Listing ID')));
CREATE INDEX IF NOT EXISTS idx_repayment_proofs_fields_status ON Repayment_Proofs (((fields->>'Status')));

CREATE TABLE IF NOT EXISTS Investor_Onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_onboarding_fields_email ON Investor_Onboarding (((fields->>'Email')));
CREATE INDEX IF NOT EXISTS idx_investor_onboarding_fields_status ON Investor_Onboarding (((fields->>'Status')));
