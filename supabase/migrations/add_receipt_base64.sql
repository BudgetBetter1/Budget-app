-- Run this in Supabase SQL Editor to add the receipt_base64 column.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_base64 TEXT;
