-- Step 1: Add missing gamification columns to profiles (safe to run multiple times)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_connections integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spin_used boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS last_spin_at timestamp with time zone DEFAULT null,
  ADD COLUMN IF NOT EXISTS reward_status text DEFAULT null,
  ADD COLUMN IF NOT EXISTS rewards_enabled boolean NOT NULL DEFAULT true;

-- Step 2: Unlock spin for user (25 rides, spin not used, rewards enabled)
UPDATE public.profiles
SET total_connections = 25,
    spin_used = false,
    rewards_enabled = true
WHERE user_id = '197965be-bb40-45d8-b63c-91a9deef6b5b';
