-- Run this in Neon SQL Editor if you get: function public.get_user_connections(uuid) does not exist
CREATE OR REPLACE FUNCTION public.get_user_connections(_user_id uuid)
RETURNS TABLE(
  id uuid,
  partner_id uuid,
  ride_id uuid,
  ride_request_id uuid,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  status text,
  is_expired boolean,
  time_remaining interval
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    CASE WHEN c.user1_id = _user_id THEN c.user2_id ELSE c.user1_id END as partner_id,
    c.ride_id,
    c.ride_request_id,
    c.created_at,
    c.expires_at,
    CASE WHEN c.expires_at <= now() THEN 'expired' ELSE c.status END as status,
    c.expires_at <= now() as is_expired,
    c.expires_at - now() as time_remaining
  FROM public.connections c
  WHERE (c.user1_id = _user_id OR c.user2_id = _user_id)
    AND current_setting('app.current_user_id', true)::uuid = _user_id
  ORDER BY c.created_at DESC
$$;
