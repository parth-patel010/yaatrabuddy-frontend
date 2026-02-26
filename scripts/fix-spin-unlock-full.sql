-- ============================================================
-- Run this ENTIRE script in Neon SQL Editor to fix spin unlock.
-- You must be logged in as user 197965be-bb40-45d8-b63c-91a9deef6b5b
-- (that user must have a row in profiles from signup).
-- ============================================================

-- 1) Add columns to profiles if missing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_connections integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spin_used boolean DEFAULT null,
  ADD COLUMN IF NOT EXISTS last_spin_at timestamp with time zone DEFAULT null,
  ADD COLUMN IF NOT EXISTS reward_status text DEFAULT null,
  ADD COLUMN IF NOT EXISTS rewards_enabled boolean NOT NULL DEFAULT true;

-- 2) Create reward_history table if missing
CREATE TABLE IF NOT EXISTS public.reward_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reward_type text NOT NULL,
  reward_name text NOT NULL,
  reward_description text NOT NULL,
  connection_milestone integer NOT NULL,
  status text NOT NULL DEFAULT 'pending_delivery',
  delivered_at timestamp with time zone DEFAULT null,
  delivered_by uuid DEFAULT null,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own rewards" ON public.reward_history;
CREATE POLICY "Users can view their own rewards" ON public.reward_history FOR SELECT
  USING (current_setting('app.current_user_id', true)::uuid = user_id);
DROP POLICY IF EXISTS "System can insert rewards" ON public.reward_history;
CREATE POLICY "System can insert rewards" ON public.reward_history FOR INSERT WITH CHECK (true);

-- 3) Unlock logic: spin unlocks when total_connections >= 25, not yet used, rewards enabled
CREATE OR REPLACE FUNCTION public.check_spin_unlocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(
    (SELECT (p.total_connections >= 25)
       AND (p.spin_used IS NULL OR p.spin_used = false)
       AND (p.rewards_enabled = true)
     FROM public.profiles p
     WHERE p.user_id = _user_id),
    false
  );
$function$;

-- 4) Get spin progress (must return one row so frontend gets progress)
CREATE OR REPLACE FUNCTION public.get_spin_progress(_user_id uuid)
RETURNS TABLE(
  total_connections integer,
  current_progress integer,
  next_milestone integer,
  spin_unlocked boolean,
  spin_used boolean,
  reward_status text,
  rewards_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    COALESCE(p.total_connections, 0),
    COALESCE(p.total_connections, 0) % 25,
    CASE WHEN COALESCE(p.total_connections, 0) >= 25 
         THEN ((p.total_connections / 25) + 1) * 25 
         ELSE 25 END,
    public.check_spin_unlocked(_user_id),
    COALESCE(p.spin_used, false),
    p.reward_status,
    COALESCE(p.rewards_enabled, true)
  FROM public.profiles p
  WHERE p.user_id = _user_id
$function$;

-- 5) Update your user: 25 rides, spin not used, rewards enabled
UPDATE public.profiles
SET total_connections = 25,
    spin_used = false,
    rewards_enabled = true
WHERE user_id = '197965be-bb40-45d8-b63c-91a9deef6b5b';

-- 6) perform_spin and get_user_reward_history (needed to spin and show history)
CREATE OR REPLACE FUNCTION public.perform_spin(_user_id uuid)
RETURNS TABLE(success boolean, reward_type text, reward_name text, reward_description text, error_message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_profile RECORD;
  v_reward_index integer;
  v_rewards text[][] := ARRAY[
    ARRAY['mobile_recharge', 'Mobile Recharge', '1.5GB data per day for 28 days'],
    ARRAY['ott_subscription', 'OTT Subscription', '1 month Netflix/Hotstar/SonyLIV/Zee5'],
    ARRAY['myntra_coupon', 'Myntra Coupon', '₹300 shopping coupon'],
    ARRAY['upi_cash', 'UPI Cash', '₹300 direct to your UPI'],
    ARRAY['surprise_gift', 'Surprise Gift', 'Special physical gift delivered to you']
  ];
  v_reward_type text; v_reward_name text; v_reward_description text;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = _user_id;
  IF v_profile IS NULL THEN
    RETURN QUERY SELECT false, null::text, null::text, null::text, 'User not found'::text; RETURN;
  END IF;
  IF NOT COALESCE(v_profile.rewards_enabled, true) THEN
    RETURN QUERY SELECT false, null::text, null::text, null::text, 'Rewards are disabled'::text; RETURN;
  END IF;
  IF NOT public.check_spin_unlocked(_user_id) THEN
    RETURN QUERY SELECT false, null::text, null::text, null::text, 'Spin is not unlocked yet'::text; RETURN;
  END IF;
  v_reward_index := floor(random() * 5) + 1;
  v_reward_type := v_rewards[v_reward_index][1];
  v_reward_name := v_rewards[v_reward_index][2];
  v_reward_description := v_rewards[v_reward_index][3];
  INSERT INTO public.reward_history (user_id, reward_type, reward_name, reward_description, connection_milestone)
  VALUES (_user_id, v_reward_type, v_reward_name, v_reward_description, v_profile.total_connections);
  UPDATE public.profiles SET spin_used = true, last_spin_at = now(), reward_status = 'pending_delivery' WHERE user_id = _user_id;
  RETURN QUERY SELECT true, v_reward_type, v_reward_name, v_reward_description, null::text;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_reward_history(_user_id uuid)
RETURNS TABLE(id uuid, reward_type text, reward_name text, reward_description text, connection_milestone integer, status text, delivered_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT rh.id, rh.reward_type, rh.reward_name, rh.reward_description, rh.connection_milestone, rh.status, rh.delivered_at, rh.created_at
  FROM public.reward_history rh WHERE rh.user_id = _user_id ORDER BY rh.created_at DESC
$function$;

-- 7) Verify (spin_unlocked should be true)
SELECT user_id, total_connections, spin_used, rewards_enabled,
       public.check_spin_unlocked('197965be-bb40-45d8-b63c-91a9deef6b5b'::uuid) AS spin_unlocked
FROM public.profiles
WHERE user_id = '197965be-bb40-45d8-b63c-91a9deef6b5b';
