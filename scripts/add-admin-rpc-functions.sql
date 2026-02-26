-- Run this in Neon SQL Editor if you get:
--   "function public.admin_get_all_rewards() does not exist"
--   "function public.admin_gift_premium(uuid) does not exist"
--
-- How to run: Neon Console → SQL Editor → paste this file → Run.
--
-- Requires: reward_history, profiles (with email), notifications, has_role(), app_role, user_roles.

-- Add premium columns to profiles if missing (required for admin_gift_premium / admin_remove_premium)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_expiry timestamp with time zone;

-- Admin: get all rewards (for admin panel)
CREATE OR REPLACE FUNCTION public.admin_get_all_rewards()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  reward_type text,
  reward_name text,
  reward_description text,
  connection_milestone integer,
  status text,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    rh.id,
    rh.user_id,
    p.email as user_email,
    p.full_name as user_name,
    rh.reward_type,
    rh.reward_name,
    rh.reward_description,
    rh.connection_milestone,
    rh.status,
    rh.delivered_at,
    rh.created_at
  FROM public.reward_history rh
  JOIN public.profiles p ON p.user_id = rh.user_id
  WHERE has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role)
  ORDER BY rh.created_at DESC
$function$;

-- Admin: mark reward as delivered
CREATE OR REPLACE FUNCTION public.admin_mark_reward_delivered(_reward_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_pending_count integer;
BEGIN
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN false;
  END IF;
  SELECT user_id INTO v_user_id FROM public.reward_history WHERE id = _reward_id;
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.reward_history
  SET status = 'delivered', delivered_at = now(), delivered_by = current_setting('app.current_user_id', true)::uuid
  WHERE id = _reward_id;
  SELECT COUNT(*) INTO v_pending_count
  FROM public.reward_history
  WHERE user_id = v_user_id AND status = 'pending_delivery';
  IF v_pending_count = 0 THEN
    UPDATE public.profiles SET reward_status = null WHERE user_id = v_user_id;
  END IF;
  RETURN true;
END;
$function$;

-- Admin: toggle rewards enabled for a user
CREATE OR REPLACE FUNCTION public.admin_toggle_user_rewards(_target_user_id uuid, _enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET rewards_enabled = _enabled WHERE user_id = _target_user_id;
  RETURN true;
END;
$function$;

-- Admin: gift premium (30 days)
CREATE OR REPLACE FUNCTION public.admin_gift_premium(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN false;
  END IF;
  UPDATE public.profiles
  SET is_premium = true, subscription_expiry = now() + INTERVAL '30 days'
  WHERE user_id = _target_user_id;
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_target_user_id, '🎁 Subscription Gifted', 'Admin gifted you a Premium subscription for this month! Enjoy unlimited connections.', 'success');
  RETURN true;
END;
$function$;

-- Admin: remove premium
CREATE OR REPLACE FUNCTION public.admin_remove_premium(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET is_premium = false, subscription_expiry = null WHERE user_id = _target_user_id;
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_target_user_id, 'Premium Removed', 'Your Premium subscription has been removed by an admin.', 'info');
  RETURN true;
END;
$function$;
