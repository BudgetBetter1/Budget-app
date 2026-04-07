-- ============================================================
-- BudgetApp Schema
-- Run this in your Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('monthly', 'project')),
  -- monthly fields
  month         SMALLINT CHECK (month BETWEEN 1 AND 12),
  year          SMALLINT,
  -- project fields
  start_date    DATE,
  end_date      DATE,
  -- total planned budget
  total_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUCKETS (categories per budget)
-- ============================================================
CREATE TABLE IF NOT EXISTS buckets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id        UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  allocated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  bucket_id   UUID REFERENCES buckets(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  vendor      TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  notes            TEXT,
  receipt_url      TEXT,
  receipt_base64   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_budgets_user     ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_buckets_budget   ON buckets(budget_id);
CREATE INDEX IF NOT EXISTS idx_txn_budget       ON transactions(budget_id);
CREATE INDEX IF NOT EXISTS idx_txn_bucket       ON transactions(bucket_id);
CREATE INDEX IF NOT EXISTS idx_txn_date         ON transactions(date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Budgets: users own their own budgets
CREATE POLICY "users_own_budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Buckets: accessible if you own the parent budget
CREATE POLICY "users_own_buckets" ON buckets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM budgets WHERE budgets.id = buckets.budget_id AND budgets.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM budgets WHERE budgets.id = buckets.budget_id AND budgets.user_id = auth.uid())
  );

-- Transactions: users own their own transactions
CREATE POLICY "users_own_transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET for receipts
-- Run this block separately in the SQL Editor AFTER creating
-- the 'receipts' bucket via Supabase Dashboard > Storage.
-- ============================================================

-- Allow authenticated users to upload into their own folder
CREATE POLICY "users_insert_receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read of all receipts (bucket is public)
CREATE POLICY "public_read_receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

-- Allow users to update/replace their own receipts
CREATE POLICY "users_update_receipts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own receipts
CREATE POLICY "users_delete_receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
