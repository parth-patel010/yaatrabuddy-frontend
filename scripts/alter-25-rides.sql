-- ============================================================
-- Give a user 25 rides (unlock Spin & Win) via SQL.
-- Run in Neon SQL Editor. Replace the user_id below with the target user.
-- ============================================================

-- 1) Ensure profile columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_connections integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spin_used boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS last_spin_at timestamp with time zone DEFAULT null,
  ADD COLUMN IF NOT EXISTS reward_status text DEFAULT null,
  ADD COLUMN IF NOT EXISTS rewards_enabled boolean NOT NULL DEFAULT true;

-- 2) Set 25 rides and unlock spin for one user (change user_id)
UPDATE public.profiles
SET total_connections = 25,
    spin_used = false,
    rewards_enabled = true
WHERE user_id = 'REPLACE_WITH_USER_UUID';

-- Optional: verify
-- SELECT user_id, total_connections, spin_used, rewards_enabled FROM public.profiles WHERE user_id = 'REPLACE_WITH_USER_UUID';
