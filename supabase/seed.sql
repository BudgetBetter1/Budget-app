-- ============================================================
-- BudgetApp Seed Data
-- NOTE: Replace 'YOUR_USER_ID' with your actual auth.users UUID
-- after signing up. Find it in Supabase > Authentication > Users.
-- ============================================================

DO $$
DECLARE
  v_user_id      UUID := 'YOUR_USER_ID'; -- REPLACE THIS
  v_budget1_id   UUID := gen_random_uuid();
  v_budget2_id   UUID := gen_random_uuid();
  v_b1_food      UUID := gen_random_uuid();
  v_b1_rent      UUID := gen_random_uuid();
  v_b1_transport UUID := gen_random_uuid();
  v_b1_utilities UUID := gen_random_uuid();
  v_b1_fun       UUID := gen_random_uuid();
  v_b2_design    UUID := gen_random_uuid();
  v_b2_dev       UUID := gen_random_uuid();
  v_b2_marketing UUID := gen_random_uuid();
BEGIN

  -- ---- Monthly budget: April 2026 ----
  INSERT INTO budgets (id, user_id, name, type, month, year, total_amount)
  VALUES (v_budget1_id, v_user_id, 'April 2026', 'monthly', 4, 2026, 4500.00);

  -- Buckets
  INSERT INTO buckets (id, budget_id, name, allocated_amount) VALUES
    (v_b1_rent,      v_budget1_id, 'Rent & Housing',  1500.00),
    (v_b1_food,      v_budget1_id, 'Food & Groceries',  600.00),
    (v_b1_transport, v_budget1_id, 'Transport',          300.00),
    (v_b1_utilities, v_budget1_id, 'Utilities',          200.00),
    (v_b1_fun,       v_budget1_id, 'Entertainment',      400.00);

  -- Transactions
  INSERT INTO transactions (user_id, budget_id, bucket_id, date, vendor, amount, notes) VALUES
    (v_user_id, v_budget1_id, v_b1_rent,      '2026-04-01', 'Landlord',             1500.00, 'April rent'),
    (v_user_id, v_budget1_id, v_b1_utilities, '2026-04-02', 'Electric Co.',           85.40, 'Electricity bill'),
    (v_user_id, v_budget1_id, v_b1_utilities, '2026-04-03', 'City Water',             32.10, 'Water bill'),
    (v_user_id, v_budget1_id, v_b1_food,      '2026-04-03', 'Whole Foods',            92.75, 'Weekly groceries'),
    (v_user_id, v_budget1_id, v_b1_transport, '2026-04-04', 'Metro Transit',          55.00, 'Monthly pass'),
    (v_user_id, v_budget1_id, v_b1_fun,       '2026-04-05', 'Netflix',                15.99, 'Streaming subscription'),
    (v_user_id, v_budget1_id, v_b1_food,      '2026-04-06', 'Chipotle',               14.50, 'Lunch'),
    (v_user_id, v_budget1_id, v_b1_transport, '2026-04-06', 'Uber',                   22.30, 'Ride to airport'),
    (v_user_id, v_budget1_id, v_b1_food,      '2026-04-07', 'Trader Joe''s',          68.20, 'Groceries'),
    (v_user_id, v_budget1_id, v_b1_fun,       '2026-04-08', 'AMC Theatres',           32.00, 'Movie night x2'),
    (v_user_id, v_budget1_id, v_b1_food,      '2026-04-10', 'Starbucks',              24.80, 'Coffee runs'),
    (v_user_id, v_budget1_id, v_b1_fun,       '2026-04-11', 'Spotify',                10.99, 'Music subscription');

  -- ---- Project budget: Website Redesign ----
  INSERT INTO budgets (id, user_id, name, type, start_date, end_date, total_amount)
  VALUES (v_budget2_id, v_user_id, 'Website Redesign', 'project', '2026-03-01', '2026-06-30', 12000.00);

  -- Buckets
  INSERT INTO buckets (id, budget_id, name, allocated_amount) VALUES
    (v_b2_design,    v_budget2_id, 'Design & UX',    4000.00),
    (v_b2_dev,       v_budget2_id, 'Development',    6000.00),
    (v_b2_marketing, v_budget2_id, 'Marketing',      2000.00);

  -- Transactions
  INSERT INTO transactions (user_id, budget_id, bucket_id, date, vendor, amount, notes) VALUES
    (v_user_id, v_budget2_id, v_b2_design,    '2026-03-05', 'Figma',               180.00, 'Annual plan'),
    (v_user_id, v_budget2_id, v_b2_design,    '2026-03-10', 'Freelance Designer',  2400.00, 'Logo & brand kit'),
    (v_user_id, v_budget2_id, v_b2_dev,       '2026-03-15', 'Vercel',               240.00, '6-month hosting'),
    (v_user_id, v_budget2_id, v_b2_dev,       '2026-03-20', 'Contractor — Jane',  3200.00, 'Frontend dev sprint 1'),
    (v_user_id, v_budget2_id, v_b2_marketing, '2026-04-01', 'Google Ads',           500.00, 'Launch campaign'),
    (v_user_id, v_budget2_id, v_b2_marketing, '2026-04-03', 'Mailchimp',             99.00, 'Email marketing'),
    (v_user_id, v_budget2_id, v_b2_dev,       '2026-04-05', 'AWS',                  145.60, 'Cloud infra');

END $$;
