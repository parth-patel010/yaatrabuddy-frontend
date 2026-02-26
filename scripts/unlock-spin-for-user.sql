-- Run this in Neon SQL Editor to give a user 25 rides and unlock the Spin & Win.
-- Replace the user_id with the target user's id.

-- Required: total_connections >= 25, spin_used = false, AND rewards_enabled = true.
-- If rewards_enabled is false (e.g. admin disabled it), the spin stays locked.

UPDATE public.profiles
SET total_connections = 25,
    spin_used = false,
    rewards_enabled = true
WHERE user_id = '197965be-bb40-45d8-b63c-91a9deef6b5b';
