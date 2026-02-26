-- Neon PostgreSQL schema (consolidated from Supabase migrations)
-- Run this in Neon SQL Editor. Backend must set: SET LOCAL app.current_user_id = '<user_uuid>';

-- 1. Auth users table (replaces Supabase auth.users for app auth)
CREATE TABLE IF NOT EXISTS public.auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- === 20251223044450_b2e67aeb-2fae-4427-a8c5-bfccad00d020.sql ===
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO public
USING (current_setting('app.current_user_id', true)::uuid = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (current_setting('app.current_user_id', true)::uuid = user_id);

-- Create rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  ride_date DATE NOT NULL,
  ride_time TIME NOT NULL,
  seats_available INTEGER NOT NULL CHECK (seats_available > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rides
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view rides
CREATE POLICY "Anyone can view rides"
ON public.rides
FOR SELECT
TO public
USING (true);

-- Users can create their own rides
CREATE POLICY "Users can create own rides"
ON public.rides
FOR INSERT
TO public
WITH CHECK (current_setting('app.current_user_id', true)::uuid = user_id);

-- Users can update their own rides
CREATE POLICY "Users can update own rides"
ON public.rides
FOR UPDATE
TO public
USING (current_setting('app.current_user_id', true)::uuid = user_id);

-- Users can delete their own rides
CREATE POLICY "Users can delete own rides"
ON public.rides
FOR DELETE
TO public
USING (current_setting('app.current_user_id', true)::uuid = user_id);

-- Create function to handle new user registration
-- handle_new_user removed (backend creates profile on signup)


-- Trigger to create profile on user signup
-- Trigger on_auth_user_created removed (profile creation done in backend)
-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profile timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- === 20251223051245_4a09b7a2-af13-4795-bca2-17623b1255f6.sql ===
-- Add phone_number and avatar_url to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add transport_mode to rides table
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS transport_mode TEXT NOT NULL DEFAULT 'car';

-- Create ride_requests table for tracking join requests
CREATE TABLE public.ride_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ride_id, requester_id)
);

-- Enable RLS on ride_requests
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for ride_requests
CREATE POLICY "Users can view their own requests"
ON public.ride_requests
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = requester_id);

CREATE POLICY "Ride owners can view requests for their rides"
ON public.ride_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rides 
    WHERE rides.id = ride_requests.ride_id 
    AND rides.user_id = current_setting('app.current_user_id', true)::uuid
  )
);

CREATE POLICY "Users can create requests"
ON public.ride_requests
FOR INSERT
WITH CHECK (current_setting('app.current_user_id', true)::uuid = requester_id);

CREATE POLICY "Ride owners can update request status"
ON public.ride_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.rides 
    WHERE rides.id = ride_requests.ride_id 
    AND rides.user_id = current_setting('app.current_user_id', true)::uuid
  )
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
ON public.notifications
FOR UPDATE
USING (current_setting('app.current_user_id', true)::uuid = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create storage bucket for avatars
-- [storage.buckets removed for Neon]

-- Storage policies for avatars
-- [storage policy removed]


-- [storage policy removed]


-- [storage policy removed]


-- [storage policy removed]


-- Create trigger for ride_requests updated_at
CREATE TRIGGER update_ride_requests_updated_at
BEFORE UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- === 20251223053300_37765565-8d6d-4261-8063-fdefb33e7147.sql ===
-- Add consent fields to ride_requests table
ALTER TABLE public.ride_requests
ADD COLUMN show_profile_photo BOOLEAN DEFAULT false,
ADD COLUMN show_mobile_number BOOLEAN DEFAULT false;

-- Update existing approved requests to show both (for backwards compatibility)
UPDATE public.ride_requests 
SET show_profile_photo = true, show_mobile_number = true 
WHERE status = 'approved';

-- === 20251224062138_ac4f129a-f4cd-4129-894f-aff754b97066.sql ===
-- Add valid notification type constraint (including 'success' for existing data)
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_valid CHECK (type IN ('info', 'request', 'approved', 'declined', 'success'));

-- Create trigger function to validate ride date (must be today or future)
CREATE OR REPLACE FUNCTION public.validate_ride_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ride_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Ride date must be today or in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for ride date validation on insert and update
CREATE TRIGGER validate_ride_date_trigger
BEFORE INSERT OR UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.validate_ride_date();

-- === 20251224062918_08ebb7b2-4d59-475d-8159-45fc325442d0.sql ===
-- Add verification fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_id_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;

-- Create enum for user roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.auth_users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'));

-- Create storage bucket for university IDs
-- [storage.buckets removed for Neon]

-- Storage policies for university IDs
-- [storage policy removed]


-- [storage policy removed]


-- [storage policy removed]


-- [storage policy removed]


-- Update profiles RLS to allow admins to update verification status
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'));

-- Function to check if user is verified (for use in RLS)
CREATE OR REPLACE FUNCTION public.is_user_verified(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_verified FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- Update ride_requests policy - only verified users can create requests
DROP POLICY IF EXISTS "Users can create requests" ON public.ride_requests;
CREATE POLICY "Verified users can create requests"
ON public.ride_requests
FOR INSERT
WITH CHECK (
  current_setting('app.current_user_id', true)::uuid = requester_id 
  AND public.is_user_verified(current_setting('app.current_user_id', true)::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = current_setting('app.current_user_id', true)::uuid AND is_blocked = true
  )
);

-- Update rides policy - only verified users can create rides
DROP POLICY IF EXISTS "Users can create own rides" ON public.rides;
CREATE POLICY "Verified users can create own rides"
ON public.rides
FOR INSERT
WITH CHECK (
  current_setting('app.current_user_id', true)::uuid = user_id 
  AND public.is_user_verified(current_setting('app.current_user_id', true)::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = current_setting('app.current_user_id', true)::uuid AND is_blocked = true
  )
);

-- Allow admins to delete any ride
CREATE POLICY "Admins can delete any ride"
ON public.rides
FOR DELETE
USING (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'));

-- === 20260101063546_74dbaba7-9e46-47ef-b3d6-d11bdb7597a3.sql ===
-- 1) Replace overly-permissive SELECT policy so only owner or admin can read full profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

-- 2) Security-definer function that returns only safe public fields for any user
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE (user_id uuid, full_name text, avatar_url text, is_verified boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url, p.is_verified
  FROM public.profiles p
  WHERE p.user_id = _user_id
$$;

-- Cleanup orphan view if it exists
DROP VIEW IF EXISTS public.public_profiles;


-- === 20260104060347_5f699608-63fd-4294-a946-b1bc1b860057.sql ===
-- Add RLS policies for university-ids storage bucket (user upload/view policies only)

-- Policy: Users can upload their own university ID
-- [storage policy removed]


-- Policy: Users can update their own university ID
-- [storage policy removed]


-- Policy: Users can view their own university ID
-- [storage policy removed]


-- === 20260106035802_93f3644b-6b8f-46e4-b434-c20358980fcf.sql ===
-- Add requester consent fields to ride_requests table for mutual visibility
ALTER TABLE public.ride_requests
ADD COLUMN IF NOT EXISTS requester_show_profile_photo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requester_show_mobile_number BOOLEAN DEFAULT true;

-- Update existing approved requests to have requester consent (for backwards compatibility)
UPDATE public.ride_requests 
SET requester_show_profile_photo = true, requester_show_mobile_number = true 
WHERE status = 'approved';

-- === 20260106041547_601a1ccf-90d2-428a-b0f3-346e7da246c1.sql ===
-- Create a function to get contact details for approved ride requests
-- This function returns phone number and avatar only when there's an approved request between users
CREATE OR REPLACE FUNCTION public.get_approved_contact_details(
  _target_user_id uuid,
  _requesting_user_id uuid
)
RETURNS TABLE(
  user_id uuid, 
  full_name text, 
  avatar_url text, 
  phone_number text,
  is_verified boolean,
  show_profile_photo boolean,
  show_mobile_number boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get contact details if there's an approved ride request where:
  -- 1. _requesting_user_id is the ride owner and _target_user_id is the requester
  -- 2. _requesting_user_id is the requester and _target_user_id is the ride owner
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.phone_number,
    p.is_verified,
    CASE 
      -- When _requesting_user_id is ride owner, return requester's consent
      WHEN EXISTS (
        SELECT 1 FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND r.user_id = _requesting_user_id
          AND rr.requester_id = _target_user_id
      ) THEN (
        SELECT rr.requester_show_profile_photo FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND r.user_id = _requesting_user_id
          AND rr.requester_id = _target_user_id
        LIMIT 1
      )
      -- When _requesting_user_id is requester, return ride owner's consent
      WHEN EXISTS (
        SELECT 1 FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND rr.requester_id = _requesting_user_id
          AND r.user_id = _target_user_id
      ) THEN (
        SELECT rr.show_profile_photo FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND rr.requester_id = _requesting_user_id
          AND r.user_id = _target_user_id
        LIMIT 1
      )
      ELSE false
    END as show_profile_photo,
    CASE 
      -- When _requesting_user_id is ride owner, return requester's consent
      WHEN EXISTS (
        SELECT 1 FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND r.user_id = _requesting_user_id
          AND rr.requester_id = _target_user_id
      ) THEN (
        SELECT rr.requester_show_mobile_number FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND r.user_id = _requesting_user_id
          AND rr.requester_id = _target_user_id
        LIMIT 1
      )
      -- When _requesting_user_id is requester, return ride owner's consent
      WHEN EXISTS (
        SELECT 1 FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND rr.requester_id = _requesting_user_id
          AND r.user_id = _target_user_id
      ) THEN (
        SELECT rr.show_mobile_number FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND rr.requester_id = _requesting_user_id
          AND r.user_id = _target_user_id
        LIMIT 1
      )
      ELSE false
    END as show_mobile_number
  FROM profiles p
  WHERE p.user_id = _target_user_id
    -- Only return if there's an approved request between these users
    AND (
      EXISTS (
        SELECT 1 FROM ride_requests rr
        JOIN rides r ON r.id = rr.ride_id
        WHERE rr.status = 'approved'
          AND (
            (r.user_id = _requesting_user_id AND rr.requester_id = _target_user_id)
            OR (rr.requester_id = _requesting_user_id AND r.user_id = _target_user_id)
          )
      )
    )
$$;

-- === 20260108052814_b384f3c1-3523-4d8d-ac29-ffc93d0b347c.sql ===
-- Create user_reports table
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  ride_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (only for rides they're involved in)
CREATE POLICY "Users can create reports for their rides"
ON public.user_reports
FOR INSERT
WITH CHECK (
  current_setting('app.current_user_id', true)::uuid = reporter_id
  AND (
    -- Reporter is the ride owner
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = ride_id AND r.user_id = current_setting('app.current_user_id', true)::uuid
    )
    OR
    -- Reporter is an approved requester
    EXISTS (
      SELECT 1 FROM ride_requests rr
      WHERE rr.ride_id = user_reports.ride_id
        AND rr.requester_id = current_setting('app.current_user_id', true)::uuid
        AND rr.status = 'approved'
    )
  )
);

-- Users can view their own submitted reports
CREATE POLICY "Users can view their own reports"
ON public.user_reports
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.user_reports
FOR SELECT
USING (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.user_reports
FOR UPDATE
USING (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_user_reports_updated_at
BEFORE UPDATE ON public.user_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- === 20260110163836_bcc2285a-0d98-4da2-9317-91da4c8c2c3a.sql ===
-- Create connections table for temporary friend connections
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  ride_request_id UUID NOT NULL,
  ride_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  status TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT unique_connection UNIQUE (ride_request_id)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes for performance
CREATE INDEX idx_connections_user1 ON public.connections(user1_id);
CREATE INDEX idx_connections_user2 ON public.connections(user2_id);
CREATE INDEX idx_connections_expires_at ON public.connections(expires_at);
CREATE INDEX idx_connections_status ON public.connections(status);
CREATE INDEX idx_chat_messages_connection ON public.chat_messages(connection_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for connections
CREATE POLICY "Users can view their own connections"
ON public.connections
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = user1_id OR current_setting('app.current_user_id', true)::uuid = user2_id);

CREATE POLICY "System can insert connections"
ON public.connections
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update connections"
ON public.connections
FOR UPDATE
USING (true);

-- RLS policies for chat_messages
CREATE POLICY "Users can view messages in their connections"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.id = chat_messages.connection_id
    AND (c.user1_id = current_setting('app.current_user_id', true)::uuid OR c.user2_id = current_setting('app.current_user_id', true)::uuid)
    AND c.status = 'active'
    AND c.expires_at > now()
  )
);

CREATE POLICY "Users can send messages in their connections"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  current_setting('app.current_user_id', true)::uuid = sender_id
  AND EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.id = chat_messages.connection_id
    AND (c.user1_id = current_setting('app.current_user_id', true)::uuid OR c.user2_id = current_setting('app.current_user_id', true)::uuid)
    AND c.status = 'active'
    AND c.expires_at > now()
  )
);

CREATE POLICY "Users can mark their messages as read"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.id = chat_messages.connection_id
    AND (c.user1_id = current_setting('app.current_user_id', true)::uuid OR c.user2_id = current_setting('app.current_user_id', true)::uuid)
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create function to get connection for a ride request
CREATE OR REPLACE FUNCTION public.get_connection_for_request(_ride_request_id uuid)
RETURNS TABLE(
  id uuid,
  user1_id uuid,
  user2_id uuid,
  ride_id uuid,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  status text,
  is_expired boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.user1_id,
    c.user2_id,
    c.ride_id,
    c.created_at,
    c.expires_at,
    CASE WHEN c.expires_at <= now() THEN 'expired' ELSE c.status END as status,
    c.expires_at <= now() as is_expired
  FROM connections c
  WHERE c.ride_request_id = _ride_request_id
    AND (c.user1_id = current_setting('app.current_user_id', true)::uuid OR c.user2_id = current_setting('app.current_user_id', true)::uuid)
$$;

-- Create function to get active connections for a user
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
  FROM connections c
  WHERE (c.user1_id = _user_id OR c.user2_id = _user_id)
    AND current_setting('app.current_user_id', true)::uuid = _user_id
  ORDER BY c.created_at DESC
$$;

-- === 20260110163925_7eb56ae9-995f-4dab-9524-959c21125155.sql ===
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert connections" ON public.connections;
DROP POLICY IF EXISTS "System can update connections" ON public.connections;

-- Create proper policies for connections
-- Users can insert connections when they are participants (triggered by approval)
CREATE POLICY "Participants can create connections"
ON public.connections
FOR INSERT
WITH CHECK (
  current_setting('app.current_user_id', true)::uuid = user1_id OR current_setting('app.current_user_id', true)::uuid = user2_id
);

-- Users can update their own connections (e.g., to mark as expired)
CREATE POLICY "Participants can update connections"
ON public.connections
FOR UPDATE
USING (current_setting('app.current_user_id', true)::uuid = user1_id OR current_setting('app.current_user_id', true)::uuid = user2_id);

-- === 20260112161140_20a32087-65ac-4039-af36-2d3e34d3d8de.sql ===
-- Enable realtime for connections table
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;

-- === 20260112161645_85b84ffa-b036-4f1f-857f-9d98fd77eeee.sql ===
-- Auto-create a connection (chat thread) when a ride request becomes approved

CREATE OR REPLACE FUNCTION public.create_connection_on_ride_request_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride_owner_id uuid;
BEGIN
  -- Only act when status transitions to approved
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
      SELECT r.user_id INTO v_ride_owner_id
      FROM public.rides r
      WHERE r.id = NEW.ride_id;

      IF v_ride_owner_id IS NULL THEN
        RETURN NEW;
      END IF;

      -- Insert connection; ride_request_id is UNIQUE so no duplicates.
      INSERT INTO public.connections (user1_id, user2_id, ride_id, ride_request_id)
      VALUES (v_ride_owner_id, NEW.requester_id, NEW.ride_id, NEW.id)
      ON CONFLICT (ride_request_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_connection_on_approval ON public.ride_requests;

CREATE TRIGGER trg_create_connection_on_approval
AFTER UPDATE OF status ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_connection_on_ride_request_approved();

-- Helpful indexes for inbox lookups
CREATE INDEX IF NOT EXISTS idx_connections_user1 ON public.connections (user1_id);
CREATE INDEX IF NOT EXISTS idx_connections_user2 ON public.connections (user2_id);
CREATE INDEX IF NOT EXISTS idx_connections_expires_at ON public.connections (expires_at);


-- === 20260114114948_5c916840-4717-44a1-b8b3-7398aa5c46c9.sql ===
-- Create ratings table for star-based rating system
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL,
  rated_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure each user can only rate another user once per ride
  UNIQUE (ride_id, rater_user_id, rated_user_id),
  
  -- Prevent self-rating
  CONSTRAINT no_self_rating CHECK (rater_user_id != rated_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own ratings (given or received)
CREATE POLICY "Users can view their own ratings" 
ON public.ratings 
FOR SELECT 
USING (current_setting('app.current_user_id', true)::uuid = rater_user_id OR current_setting('app.current_user_id', true)::uuid = rated_user_id);

-- Policy: Anyone can view ratings for public profile display
CREATE POLICY "Anyone can view ratings for profiles" 
ON public.ratings 
FOR SELECT 
USING (true);

-- Policy: Users can create ratings only for completed rides they participated in
CREATE POLICY "Users can rate after completed rides" 
ON public.ratings 
FOR INSERT 
WITH CHECK (
  current_setting('app.current_user_id', true)::uuid = rater_user_id
  AND current_setting('app.current_user_id', true)::uuid != rated_user_id
  AND EXISTS (
    -- Must have an expired connection for this ride
    SELECT 1 FROM connections c
    WHERE c.ride_id = ratings.ride_id
      AND (c.user1_id = current_setting('app.current_user_id', true)::uuid OR c.user2_id = current_setting('app.current_user_id', true)::uuid)
      AND c.expires_at <= now()
  )
);

-- Create function to get user's average rating
CREATE OR REPLACE FUNCTION public.get_user_rating(_user_id uuid)
RETURNS TABLE(average_rating numeric, total_ratings bigint, completed_rides bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) as average_rating,
    COUNT(r.id) as total_ratings,
    COUNT(DISTINCT r.ride_id) as completed_rides
  FROM ratings r
  WHERE r.rated_user_id = _user_id
$$;

-- Create function to check if user has already rated another user for a specific ride
CREATE OR REPLACE FUNCTION public.has_rated_user(_rater_id uuid, _rated_id uuid, _ride_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ratings
    WHERE rater_user_id = _rater_id
      AND rated_user_id = _rated_id
      AND ride_id = _ride_id
  )
$$;

-- Create indexes for better query performance
CREATE INDEX idx_ratings_rated_user ON public.ratings(rated_user_id);
CREATE INDEX idx_ratings_ride ON public.ratings(ride_id);
CREATE INDEX idx_ratings_rater ON public.ratings(rater_user_id);

-- === 20260115090545_004d0b0a-1202-4e89-b771-d12c491f4a62.sql ===
-- Create scheduled_notifications table to track and prevent duplicate notifications
CREATE TABLE public.scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'approval', '8h_reminder', '16h_reminder', '60min_before_ride'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_scheduled_notification UNIQUE (connection_id, user_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled notifications
CREATE POLICY "Users can view their own scheduled notifications"
ON public.scheduled_notifications
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = user_id);

-- System can insert scheduled notifications
CREATE POLICY "System can insert scheduled notifications"
ON public.scheduled_notifications
FOR INSERT
WITH CHECK (true);

-- System can update scheduled notifications
CREATE POLICY "System can update scheduled notifications"
ON public.scheduled_notifications
FOR UPDATE
USING (true);

-- Create index for efficient querying
CREATE INDEX idx_scheduled_notifications_pending 
ON public.scheduled_notifications (scheduled_for) 
WHERE sent_at IS NULL AND cancelled_at IS NULL;

CREATE INDEX idx_scheduled_notifications_connection 
ON public.scheduled_notifications (connection_id);

-- Function to schedule ride notifications when a connection is created
CREATE OR REPLACE FUNCTION public.schedule_ride_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ride_date DATE;
  v_ride_time TIME;
  v_ride_datetime TIMESTAMP WITH TIME ZONE;
  v_reminder_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only act on new connections
  IF TG_OP = 'INSERT' THEN
    -- Get ride date and time
    SELECT r.ride_date, r.ride_time 
    INTO v_ride_date, v_ride_time
    FROM public.rides r
    WHERE r.id = NEW.ride_id;

    -- Calculate ride datetime (assuming UTC for simplicity)
    v_ride_datetime := (v_ride_date || ' ' || v_ride_time)::TIMESTAMP WITH TIME ZONE;
    
    -- Calculate 60 minutes before ride
    v_reminder_time := v_ride_datetime - INTERVAL '60 minutes';

    -- Schedule immediate approval notification for both users
    INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
    VALUES 
      (NEW.ride_id, NEW.id, NEW.user1_id, 'approval', now()),
      (NEW.ride_id, NEW.id, NEW.user2_id, 'approval', now())
    ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;

    -- Schedule 8-hour reminder (if within 24h window)
    IF (now() + INTERVAL '8 hours') < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES 
        (NEW.ride_id, NEW.id, NEW.user1_id, '8h_reminder', now() + INTERVAL '8 hours'),
        (NEW.ride_id, NEW.id, NEW.user2_id, '8h_reminder', now() + INTERVAL '8 hours')
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;

    -- Schedule 16-hour reminder (if within 24h window)
    IF (now() + INTERVAL '16 hours') < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES 
        (NEW.ride_id, NEW.id, NEW.user1_id, '16h_reminder', now() + INTERVAL '16 hours'),
        (NEW.ride_id, NEW.id, NEW.user2_id, '16h_reminder', now() + INTERVAL '16 hours')
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;

    -- Schedule 60-minute before ride reminder
    -- Only if: reminder time is in the future AND before chat expires
    IF v_reminder_time > now() AND v_reminder_time < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES 
        (NEW.ride_id, NEW.id, NEW.user1_id, '60min_before_ride', v_reminder_time),
        (NEW.ride_id, NEW.id, NEW.user2_id, '60min_before_ride', v_reminder_time)
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for scheduling notifications
CREATE TRIGGER schedule_notifications_on_connection
AFTER INSERT ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.schedule_ride_notifications();

-- Function to cancel scheduled notifications when ride/connection status changes
CREATE OR REPLACE FUNCTION public.cancel_scheduled_notifications(_connection_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.scheduled_notifications
  SET cancelled_at = now()
  WHERE connection_id = _connection_id
    AND sent_at IS NULL
    AND cancelled_at IS NULL;
END;
$$;

-- === 20260116134934_197a8863-715c-49c1-b140-cf8e5b9d56b3.sql ===
-- Update the trigger function to set expires_at based on ride date + time
CREATE OR REPLACE FUNCTION public.create_connection_on_ride_request_approved()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ride_owner_id uuid;
  v_ride_datetime timestamp with time zone;
BEGIN
  -- Only act when status transitions to approved
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
      SELECT r.user_id, (r.ride_date || ' ' || r.ride_time)::timestamp with time zone
      INTO v_ride_owner_id, v_ride_datetime
      FROM public.rides r
      WHERE r.id = NEW.ride_id;

      IF v_ride_owner_id IS NULL THEN
        RETURN NEW;
      END IF;

      -- Insert connection with expires_at set to ride datetime
      INSERT INTO public.connections (user1_id, user2_id, ride_id, ride_request_id, expires_at)
      VALUES (v_ride_owner_id, NEW.requester_id, NEW.ride_id, NEW.id, v_ride_datetime)
      ON CONFLICT (ride_request_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create a function to update connection expiry when ride is updated
CREATE OR REPLACE FUNCTION public.update_connection_expiry_on_ride_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ride_datetime timestamp with time zone;
BEGIN
  -- Only act when ride_date or ride_time changes
  IF (OLD.ride_date IS DISTINCT FROM NEW.ride_date OR OLD.ride_time IS DISTINCT FROM NEW.ride_time) THEN
    v_ride_datetime := (NEW.ride_date || ' ' || NEW.ride_time)::timestamp with time zone;
    
    -- Update all connections for this ride
    UPDATE public.connections
    SET expires_at = v_ride_datetime
    WHERE ride_id = NEW.id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for ride updates
DROP TRIGGER IF EXISTS update_connection_expiry_trigger ON public.rides;
CREATE TRIGGER update_connection_expiry_trigger
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_connection_expiry_on_ride_update();

-- Create a function to expire connections when ride is cancelled (deleted)
CREATE OR REPLACE FUNCTION public.expire_connections_on_ride_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Immediately expire all connections for this ride
  UPDATE public.connections
  SET expires_at = now(),
      status = 'expired'
  WHERE ride_id = OLD.id;

  RETURN OLD;
END;
$function$;

-- Create trigger for ride deletion
DROP TRIGGER IF EXISTS expire_connections_on_ride_delete_trigger ON public.rides;
CREATE TRIGGER expire_connections_on_ride_delete_trigger
  BEFORE DELETE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.expire_connections_on_ride_delete();

-- === 20260117154705_4b8134d9-751d-4c4d-a3ec-3f5d0009f06e.sql ===
-- Create locations table for city-based location management
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Vadodara',
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast filtering
CREATE INDEX idx_locations_city_active ON public.locations(city, active);
CREATE INDEX idx_locations_category ON public.locations(category);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Anyone can view active locations (public read for dropdowns)
CREATE POLICY "Anyone can view active locations"
ON public.locations
FOR SELECT
USING (active = true);

-- Admins can view all locations (including inactive)
CREATE POLICY "Admins can view all locations"
ON public.locations
FOR SELECT
USING (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

-- Admins can insert locations
CREATE POLICY "Admins can insert locations"
ON public.locations
FOR INSERT
WITH CHECK (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

-- Admins can update locations
CREATE POLICY "Admins can update locations"
ON public.locations
FOR UPDATE
USING (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert all Vadodara locations

-- 1. Universities & Colleges
INSERT INTO public.locations (name, category, city, display_order) VALUES
('Parul University', 'Universities & Colleges', 'Vadodara', 1),
('Maharaja Sayajirao University (Main Campus)', 'Universities & Colleges', 'Vadodara', 2),
('MSU Fatehgunj Campus', 'Universities & Colleges', 'Vadodara', 3),
('Navrachana University', 'Universities & Colleges', 'Vadodara', 4),
('ITM Universe', 'Universities & Colleges', 'Vadodara', 5),
('Sigma University', 'Universities & Colleges', 'Vadodara', 6),
('Sumandeep Vidyapeeth', 'Universities & Colleges', 'Vadodara', 7),
('GSFC University', 'Universities & Colleges', 'Vadodara', 8);

-- 2. Student Hostel & PG Zones
INSERT INTO public.locations (name, category, city, display_order) VALUES
('Parul Hostel Area', 'Student Hostel & PG Zones', 'Vadodara', 10),
('Waghodia Gaam', 'Student Hostel & PG Zones', 'Vadodara', 11),
('Limda Chowkdi', 'Student Hostel & PG Zones', 'Vadodara', 12),
('Ajwa Road Hostel Belt', 'Student Hostel & PG Zones', 'Vadodara', 13),
('Fatehgunj Hostel Area', 'Student Hostel & PG Zones', 'Vadodara', 14),
('Seven Seas PG Zone', 'Student Hostel & PG Zones', 'Vadodara', 15),
('Chakli Circle PG Area', 'Student Hostel & PG Zones', 'Vadodara', 16),
('Gotri Hostel Area', 'Student Hostel & PG Zones', 'Vadodara', 17),
('Sevasi PG Zone', 'Student Hostel & PG Zones', 'Vadodara', 18),
('Vasna-Bhayli Student Area', 'Student Hostel & PG Zones', 'Vadodara', 19),
('Manjalpur PG Area', 'Student Hostel & PG Zones', 'Vadodara', 20);

-- 3. Residential & Society Zones
INSERT INTO public.locations (name, category, city, display_order) VALUES
('Alkapuri', 'Residential & Society Zones', 'Vadodara', 30),
('Akota', 'Residential & Society Zones', 'Vadodara', 31),
('Old Padra Road', 'Residential & Society Zones', 'Vadodara', 32),
('New Sama Road', 'Residential & Society Zones', 'Vadodara', 33),
('Sama-Savli Road', 'Residential & Society Zones', 'Vadodara', 34),
('Karelibaug', 'Residential & Society Zones', 'Vadodara', 35),
('Nizampura', 'Residential & Society Zones', 'Vadodara', 36),
('Gotri', 'Residential & Society Zones', 'Vadodara', 37),
('Sevasi', 'Residential & Society Zones', 'Vadodara', 38),
('Vasna Road', 'Residential & Society Zones', 'Vadodara', 39),
('Bhayli', 'Residential & Society Zones', 'Vadodara', 40),
('Manjalpur', 'Residential & Society Zones', 'Vadodara', 41),
('Tarsali', 'Residential & Society Zones', 'Vadodara', 42),
('Makarpura', 'Residential & Society Zones', 'Vadodara', 43),
('Atladara', 'Residential & Society Zones', 'Vadodara', 44),
('Subhanpura', 'Residential & Society Zones', 'Vadodara', 45),
('Ellora Park', 'Residential & Society Zones', 'Vadodara', 46),
('Race Course Circle Area', 'Residential & Society Zones', 'Vadodara', 47),
('Sayajigunj', 'Residential & Society Zones', 'Vadodara', 48),
('Fatehgunj', 'Residential & Society Zones', 'Vadodara', 49),
('Waghodia Road', 'Residential & Society Zones', 'Vadodara', 50),
('Ajwa Road', 'Residential & Society Zones', 'Vadodara', 51),
('Harni Road', 'Residential & Society Zones', 'Vadodara', 52),
('Kalali', 'Residential & Society Zones', 'Vadodara', 53),
('Sun City Circle', 'Residential & Society Zones', 'Vadodara', 54);

-- 4. Transport Hubs
INSERT INTO public.locations (name, category, city, display_order) VALUES
('Vadodara Railway Station', 'Transport Hubs', 'Vadodara', 60),
('Chhayapuri Railway Station', 'Transport Hubs', 'Vadodara', 61),
('Vadodara Airport', 'Transport Hubs', 'Vadodara', 62),
('GSRTC Bus Stand', 'Transport Hubs', 'Vadodara', 63),
('Sayajigunj City Bus Stand', 'Transport Hubs', 'Vadodara', 64);

-- 5. Malls & Commercial Areas
INSERT INTO public.locations (name, category, city, display_order) VALUES
('Inorbit Mall', 'Malls & Commercial Areas', 'Vadodara', 70),
('Eva Mall', 'Malls & Commercial Areas', 'Vadodara', 71),
('Seven Seas Mall', 'Malls & Commercial Areas', 'Vadodara', 72),
('Vadodara Central', 'Malls & Commercial Areas', 'Vadodara', 73),
('Reliance Mall (Manjalpur)', 'Malls & Commercial Areas', 'Vadodara', 74),
('Iscon Janmahal', 'Malls & Commercial Areas', 'Vadodara', 75),
('Race Course Commercial Area', 'Malls & Commercial Areas', 'Vadodara', 76),
('Alkapuri Commercial Street', 'Malls & Commercial Areas', 'Vadodara', 77);

-- 6. Major Landmarks & Offices
INSERT INTO public.locations (name, category, city, display_order) VALUES
('Laxmi Vilas Palace', 'Major Landmarks & Offices', 'Vadodara', 80),
('Sayaji Garden (Kamati Baug)', 'Major Landmarks & Offices', 'Vadodara', 81),
('Kala Ghoda Circle', 'Major Landmarks & Offices', 'Vadodara', 82),
('Chakli Circle', 'Major Landmarks & Offices', 'Vadodara', 83),
('Amit Nagar Circle', 'Major Landmarks & Offices', 'Vadodara', 84),
('Gorwa IT Park', 'Major Landmarks & Offices', 'Vadodara', 85),
('Makarpura GIDC', 'Major Landmarks & Offices', 'Vadodara', 86),
('ONGC Colony', 'Major Landmarks & Offices', 'Vadodara', 87),
('IOCL Township', 'Major Landmarks & Offices', 'Vadodara', 88);

-- === 20260118160743_45591219-3062-4d41-a284-68c20c5e9eff.sql ===
-- Create group_chats table for multi-seat rides
CREATE TABLE public.group_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL UNIQUE,
  chat_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

-- Create group_chat_members table
CREATE TABLE public.group_chat_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_group_member UNIQUE (group_chat_id, user_id)
);

-- Create group_chat_messages table
CREATE TABLE public.group_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_group_chats_ride_id ON public.group_chats(ride_id);
CREATE INDEX idx_group_chats_expires_at ON public.group_chats(expires_at);
CREATE INDEX idx_group_chat_members_group ON public.group_chat_members(group_chat_id);
CREATE INDEX idx_group_chat_members_user ON public.group_chat_members(user_id);
CREATE INDEX idx_group_chat_messages_group ON public.group_chat_messages(group_chat_id);
CREATE INDEX idx_group_chat_messages_created ON public.group_chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS for group_chats: Members can view their groups
CREATE POLICY "Members can view their group chats"
  ON public.group_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members
      WHERE group_chat_id = group_chats.id
        AND user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- System can create group chats
CREATE POLICY "System can create group chats"
  ON public.group_chats FOR INSERT
  WITH CHECK (true);

-- System can update group chats
CREATE POLICY "System can update group chats"
  ON public.group_chats FOR UPDATE
  USING (true);

-- RLS for group_chat_members
CREATE POLICY "Members can view group members"
  ON public.group_chat_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members gcm
      WHERE gcm.group_chat_id = group_chat_members.group_chat_id
        AND gcm.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY "System can add members"
  ON public.group_chat_members FOR INSERT
  WITH CHECK (true);

-- RLS for group_chat_messages
CREATE POLICY "Members can view group messages"
  ON public.group_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members
      WHERE group_chat_id = group_chat_messages.group_chat_id
        AND user_id = current_setting('app.current_user_id', true)::uuid
    )
    AND EXISTS (
      SELECT 1 FROM public.group_chats gc
      WHERE gc.id = group_chat_messages.group_chat_id
        AND gc.expires_at > now()
    )
  );

CREATE POLICY "Members can send messages in active groups"
  ON public.group_chat_messages FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_id', true)::uuid = sender_id
    AND EXISTS (
      SELECT 1 FROM public.group_chat_members
      WHERE group_chat_id = group_chat_messages.group_chat_id
        AND user_id = current_setting('app.current_user_id', true)::uuid
    )
    AND EXISTS (
      SELECT 1 FROM public.group_chats gc
      WHERE gc.id = group_chat_messages.group_chat_id
        AND gc.expires_at > now()
    )
  );

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;

-- Update the trigger function to handle group chats vs 1-to-1 based on seats
CREATE OR REPLACE FUNCTION public.create_connection_on_ride_request_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride_owner_id uuid;
  v_ride_datetime timestamp with time zone;
  v_seats_available integer;
  v_group_chat_id uuid;
  v_from_location text;
  v_to_location text;
  v_chat_name text;
BEGIN
  -- Only act when status transitions to approved
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
      -- Get ride details
      SELECT r.user_id, r.seats_available, r.from_location, r.to_location,
             (r.ride_date || ' ' || r.ride_time)::timestamp with time zone
      INTO v_ride_owner_id, v_seats_available, v_from_location, v_to_location, v_ride_datetime
      FROM public.rides r
      WHERE r.id = NEW.ride_id;

      IF v_ride_owner_id IS NULL THEN
        RETURN NEW;
      END IF;

      -- If single seat, create 1-to-1 connection (existing behavior)
      IF v_seats_available = 1 THEN
        INSERT INTO public.connections (user1_id, user2_id, ride_id, ride_request_id, expires_at)
        VALUES (v_ride_owner_id, NEW.requester_id, NEW.ride_id, NEW.id, v_ride_datetime)
        ON CONFLICT (ride_request_id) DO NOTHING;
      ELSE
        -- Multi-seat ride: use group chat
        v_chat_name := 'From ' || v_from_location || ' → To ' || v_to_location;
        
        -- Check if group chat exists for this ride
        SELECT id INTO v_group_chat_id
        FROM public.group_chats
        WHERE ride_id = NEW.ride_id;
        
        -- Create group chat if it doesn't exist
        IF v_group_chat_id IS NULL THEN
          INSERT INTO public.group_chats (ride_id, chat_name, expires_at)
          VALUES (NEW.ride_id, v_chat_name, v_ride_datetime)
          RETURNING id INTO v_group_chat_id;
          
          -- Add ride creator as first member
          INSERT INTO public.group_chat_members (group_chat_id, user_id)
          VALUES (v_group_chat_id, v_ride_owner_id)
          ON CONFLICT (group_chat_id, user_id) DO NOTHING;
        END IF;
        
        -- Add the approved user to the group
        INSERT INTO public.group_chat_members (group_chat_id, user_id)
        VALUES (v_group_chat_id, NEW.requester_id)
        ON CONFLICT (group_chat_id, user_id) DO NOTHING;
        
        -- Also create a connection record for tracking (needed for notifications)
        INSERT INTO public.connections (user1_id, user2_id, ride_id, ride_request_id, expires_at)
        VALUES (v_ride_owner_id, NEW.requester_id, NEW.ride_id, NEW.id, v_ride_datetime)
        ON CONFLICT (ride_request_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to get user's group chats
CREATE OR REPLACE FUNCTION public.get_user_group_chats(_user_id uuid)
RETURNS TABLE(
  id uuid,
  ride_id uuid,
  chat_name text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  is_expired boolean,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    gc.id,
    gc.ride_id,
    gc.chat_name,
    gc.created_at,
    gc.expires_at,
    gc.expires_at <= now() as is_expired,
    (SELECT COUNT(*) FROM public.group_chat_members WHERE group_chat_id = gc.id) as member_count
  FROM public.group_chats gc
  WHERE EXISTS (
    SELECT 1 FROM public.group_chat_members gcm
    WHERE gcm.group_chat_id = gc.id AND gcm.user_id = _user_id
  )
  AND current_setting('app.current_user_id', true)::uuid = _user_id
  ORDER BY gc.created_at DESC
$$;

-- Function to get group chat members with profiles
CREATE OR REPLACE FUNCTION public.get_group_chat_members(_group_chat_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  is_verified boolean,
  joined_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    gcm.user_id,
    p.full_name,
    p.avatar_url,
    p.is_verified,
    gcm.joined_at
  FROM public.group_chat_members gcm
  JOIN public.profiles p ON p.user_id = gcm.user_id
  WHERE gcm.group_chat_id = _group_chat_id
    AND EXISTS (
      SELECT 1 FROM public.group_chat_members
      WHERE group_chat_id = _group_chat_id AND user_id = current_setting('app.current_user_id', true)::uuid
    )
  ORDER BY gcm.joined_at ASC
$$;

-- === 20260119024111_af640a8f-75ff-45f6-8b17-f3bfda8538a6.sql ===
-- Update schedule_ride_notifications to handle group chat notifications
CREATE OR REPLACE FUNCTION public.schedule_ride_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride_date DATE;
  v_ride_time TIME;
  v_ride_datetime TIMESTAMP WITH TIME ZONE;
  v_reminder_time TIMESTAMP WITH TIME ZONE;
  v_seats_available INTEGER;
  v_from_location TEXT;
  v_to_location TEXT;
  v_notification_message TEXT;
BEGIN
  -- Only act on new connections
  IF TG_OP = 'INSERT' THEN
    -- Get ride date, time, and seats
    SELECT r.ride_date, r.ride_time, r.seats_available, r.from_location, r.to_location
    INTO v_ride_date, v_ride_time, v_seats_available, v_from_location, v_to_location
    FROM public.rides r
    WHERE r.id = NEW.ride_id;

    -- Calculate ride datetime (assuming UTC for simplicity)
    v_ride_datetime := (v_ride_date || ' ' || v_ride_time)::TIMESTAMP WITH TIME ZONE;
    
    -- Calculate 60 minutes before ride
    v_reminder_time := v_ride_datetime - INTERVAL '60 minutes';

    -- Schedule immediate approval notification for both users
    INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
    VALUES 
      (NEW.ride_id, NEW.id, NEW.user1_id, 'approval', now()),
      (NEW.ride_id, NEW.id, NEW.user2_id, 'approval', now())
    ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;

    -- Schedule 8-hour reminder (if within 24h window)
    IF (now() + INTERVAL '8 hours') < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES 
        (NEW.ride_id, NEW.id, NEW.user1_id, '8h_reminder', now() + INTERVAL '8 hours'),
        (NEW.ride_id, NEW.id, NEW.user2_id, '8h_reminder', now() + INTERVAL '8 hours')
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;

    -- Schedule 16-hour reminder (if within 24h window)
    IF (now() + INTERVAL '16 hours') < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES 
        (NEW.ride_id, NEW.id, NEW.user1_id, '16h_reminder', now() + INTERVAL '16 hours'),
        (NEW.ride_id, NEW.id, NEW.user2_id, '16h_reminder', now() + INTERVAL '16 hours')
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;

    -- Schedule 60-minute before ride reminder
    -- Only if: reminder time is in the future AND before chat expires
    IF v_reminder_time > now() AND v_reminder_time < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES 
        (NEW.ride_id, NEW.id, NEW.user1_id, '60min_before_ride', v_reminder_time),
        (NEW.ride_id, NEW.id, NEW.user2_id, '60min_before_ride', v_reminder_time)
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;
    
    -- For group chats (seats >= 2), send immediate notification about being added to group
    IF v_seats_available >= 2 THEN
      v_notification_message := 'You''ve been added to a ride group: From ' || v_from_location || ' → To ' || v_to_location;
      
      -- Insert immediate notification for the new member (user2 is the requester)
      INSERT INTO public.notifications (user_id, title, message, type, ride_id)
      VALUES (
        NEW.user2_id,
        'Added to Group Ride 🚗',
        v_notification_message,
        'success',
        NEW.ride_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- === 20260119025949_15995d99-55bf-4e9c-8c12-57cec398899a.sql ===
-- Prevent pending users from joining group chats by tightening group_chat_members INSERT policy

-- Helper function: only allow inserting membership if user is ride creator OR has an approved ride_request for that ride.
CREATE OR REPLACE FUNCTION public.can_join_group_chat(_group_chat_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_chats gc
    JOIN public.rides r ON r.id = gc.ride_id
    WHERE gc.id = _group_chat_id
      AND (
        -- ride creator can always be a member
        r.user_id = _user_id
        OR
        -- approved requester can be a member
        EXISTS (
          SELECT 1
          FROM public.ride_requests rr
          WHERE rr.ride_id = gc.ride_id
            AND rr.requester_id = _user_id
            AND rr.status = 'approved'
        )
      )
  );
$$;

-- Replace the overly-permissive policy that allowed any authenticated user to add members
DROP POLICY IF EXISTS "System can add members" ON public.group_chat_members;

CREATE POLICY "Approved users can be added to groups"
  ON public.group_chat_members
  FOR INSERT
  WITH CHECK (public.can_join_group_chat(group_chat_id, current_setting('app.current_user_id', true)::uuid));


-- === 20260202191702_6d566d8b-5cd0-4f1a-823d-9605e32aef32.sql ===
-- Drop the overly permissive policy that exposes all rating relationships
DROP POLICY IF EXISTS "Anyone can view ratings for profiles" ON public.ratings;

-- The existing "Users can view their own ratings" policy remains:
-- USING (current_setting('app.current_user_id', true)::uuid = rater_user_id OR current_setting('app.current_user_id', true)::uuid = rated_user_id)
-- This allows users to see ratings they gave or received.
-- 
-- For public profile display, the get_user_rating() RPC function is used,
-- which only returns aggregate statistics (average_rating, total_ratings, completed_rides)
-- without exposing individual rating records.

-- === 20260202202955_c9e94dcf-012c-4b49-b21d-f6b05835e8fc.sql ===
-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_tokens_email ON public.password_reset_tokens(email);
CREATE INDEX idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only system (edge functions with service role) can manage tokens
-- No direct user access needed
CREATE POLICY "System can manage password reset tokens"
ON public.password_reset_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Cleanup function to remove expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() OR used = true;
END;
$$;

-- === 20260204044334_684da432-a52e-4cf2-a9e3-5ca3c7b4a399.sql ===
-- Add gamification columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_connections integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS spin_used boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS last_spin_at timestamp with time zone DEFAULT null,
ADD COLUMN IF NOT EXISTS reward_status text DEFAULT null,
ADD COLUMN IF NOT EXISTS rewards_enabled boolean NOT NULL DEFAULT true;

-- Create reward history table
CREATE TABLE public.reward_history (
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

-- Enable RLS on reward_history
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own reward history
CREATE POLICY "Users can view their own rewards"
ON public.reward_history
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = user_id);

-- System can insert rewards
CREATE POLICY "System can insert rewards"
ON public.reward_history
FOR INSERT
WITH CHECK (true);

-- Admins can view all rewards
CREATE POLICY "Admins can view all rewards"
ON public.reward_history
FOR SELECT
USING (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

-- Admins can update rewards
CREATE POLICY "Admins can update rewards"
ON public.reward_history
FOR UPDATE
USING (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

-- Create function to increment connection count when connection is created
CREATE OR REPLACE FUNCTION public.increment_connection_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Increment for both users in the connection
  UPDATE public.profiles
  SET total_connections = total_connections + 1
  WHERE user_id IN (NEW.user1_id, NEW.user2_id);
  
  RETURN NEW;
END;
$function$;

-- Create trigger to increment connection count on new connection
DROP TRIGGER IF EXISTS on_connection_created ON public.connections;
CREATE TRIGGER on_connection_created
AFTER INSERT ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.increment_connection_count();

-- Create function to check if spin is unlocked
CREATE OR REPLACE FUNCTION public.check_spin_unlocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    CASE 
      WHEN p.total_connections >= 25 
           AND p.total_connections % 25 = 0 
           AND (p.spin_used IS NULL OR p.spin_used = false)
           AND p.rewards_enabled = true
      THEN true
      -- Also check if they hit a milestone and haven't spun yet
      WHEN p.total_connections >= 25 
           AND p.spin_used = false
           AND p.rewards_enabled = true
      THEN true
      ELSE false
    END
  FROM public.profiles p
  WHERE p.user_id = _user_id
$function$;

-- Create function to get spin progress
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
    p.total_connections,
    p.total_connections % 25 as current_progress,
    ((p.total_connections / 25) + 1) * 25 as next_milestone,
    public.check_spin_unlocked(_user_id) as spin_unlocked,
    COALESCE(p.spin_used, false) as spin_used,
    p.reward_status,
    p.rewards_enabled
  FROM public.profiles p
  WHERE p.user_id = _user_id
$function$;

-- Create function to perform spin and get reward
CREATE OR REPLACE FUNCTION public.perform_spin(_user_id uuid)
RETURNS TABLE(
  success boolean,
  reward_type text,
  reward_name text,
  reward_description text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile RECORD;
  v_reward_index integer;
  v_reward_type text;
  v_reward_name text;
  v_reward_description text;
  v_rewards text[][] := ARRAY[
    ARRAY['mobile_recharge', 'Mobile Recharge', '1.5GB data per day for 28 days'],
    ARRAY['ott_subscription', 'OTT Subscription', '1 month Netflix/Hotstar/SonyLIV/Zee5'],
    ARRAY['myntra_coupon', 'Myntra Coupon', '₹300 shopping coupon'],
    ARRAY['upi_cash', 'UPI Cash', '₹300 direct to your UPI'],
    ARRAY['surprise_gift', 'Surprise Gift', 'Special physical gift delivered to you']
  ];
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = _user_id;
  
  -- Check if user exists
  IF v_profile IS NULL THEN
    RETURN QUERY SELECT false, null::text, null::text, null::text, 'User not found'::text;
    RETURN;
  END IF;
  
  -- Check if rewards are enabled
  IF NOT v_profile.rewards_enabled THEN
    RETURN QUERY SELECT false, null::text, null::text, null::text, 'Rewards are disabled for your account'::text;
    RETURN;
  END IF;
  
  -- Check if spin is unlocked
  IF NOT public.check_spin_unlocked(_user_id) THEN
    RETURN QUERY SELECT false, null::text, null::text, null::text, 'Spin is not unlocked yet'::text;
    RETURN;
  END IF;
  
  -- Random reward selection: 1-5 (one of mobile, OTT, Myntra, UPI, surprise gift)
  v_reward_index := floor(random() * 5) + 1;
  v_reward_type := v_rewards[v_reward_index][1];
  v_reward_name := v_rewards[v_reward_index][2];
  v_reward_description := v_rewards[v_reward_index][3];
  
  -- Record reward in history (must succeed for spin to succeed)
  INSERT INTO public.reward_history (user_id, reward_type, reward_name, reward_description, connection_milestone)
  VALUES (_user_id, v_reward_type, v_reward_name, v_reward_description, v_profile.total_connections);
  
  -- Update profile so spin is marked used and reward status is set
  UPDATE public.profiles
  SET 
    spin_used = true,
    last_spin_at = now(),
    reward_status = 'pending_delivery'
  WHERE user_id = _user_id;
  
  RETURN QUERY SELECT true, v_reward_type, v_reward_name, v_reward_description, null::text;
END;
$function$;

-- Create function to get user reward history
CREATE OR REPLACE FUNCTION public.get_user_reward_history(_user_id uuid)
RETURNS TABLE(
  id uuid,
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
    rh.reward_type,
    rh.reward_name,
    rh.reward_description,
    rh.connection_milestone,
    rh.status,
    rh.delivered_at,
    rh.created_at
  FROM public.reward_history rh
  WHERE rh.user_id = _user_id
  ORDER BY rh.created_at DESC
$function$;

-- Create function for admin to get all rewards
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

-- Create function for admin to mark reward as delivered
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
  -- Check if admin
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN false;
  END IF;
  
  -- Get user_id from reward
  SELECT user_id INTO v_user_id FROM public.reward_history WHERE id = _reward_id;
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update reward status
  UPDATE public.reward_history
  SET 
    status = 'delivered',
    delivered_at = now(),
    delivered_by = current_setting('app.current_user_id', true)::uuid
  WHERE id = _reward_id;
  
  -- Check if user has any other pending rewards
  SELECT COUNT(*) INTO v_pending_count
  FROM public.reward_history
  WHERE user_id = v_user_id AND status = 'pending_delivery';
  
  -- If no pending rewards, clear the profile reward_status
  IF v_pending_count = 0 THEN
    UPDATE public.profiles
    SET reward_status = null
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN true;
END;
$function$;

-- Create function for admin to toggle rewards for a user
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
  
  UPDATE public.profiles
  SET rewards_enabled = _enabled
  WHERE user_id = _target_user_id;
  
  RETURN true;
END;
$function$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reward_history_user_id ON public.reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_status ON public.reward_history(status);
CREATE INDEX IF NOT EXISTS idx_profiles_total_connections ON public.profiles(total_connections);

-- === 20260204052109_4d6d708b-99b9-4f2d-a800-c754ad595fb6.sql ===
-- Add location ID columns to rides table (nullable for custom locations)
ALTER TABLE public.rides 
ADD COLUMN from_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
ADD COLUMN to_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_rides_from_location_id ON public.rides(from_location_id);
CREATE INDEX idx_rides_to_location_id ON public.rides(to_location_id);

-- === 20260204204209_21d755f5-d6b6-4c15-9f9b-049b75cac761.sql ===
-- =============================================
-- PAYMENT SYSTEM: Wallet + Razorpay Integration
-- =============================================

-- 1. Add wallet_balance to profiles table
ALTER TABLE public.profiles
ADD COLUMN wallet_balance INTEGER NOT NULL DEFAULT 0;

-- 2. Create wallet transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'join_request', 'accept_request', 'refund')),
  payment_source TEXT CHECK (payment_source IN ('wallet', 'razorpay')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  related_ride_request_id UUID REFERENCES public.ride_requests(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add payment status columns to ride_requests
ALTER TABLE public.ride_requests
ADD COLUMN request_payment_status TEXT DEFAULT NULL CHECK (request_payment_status IN ('paid', 'refunded', 'expired')),
ADD COLUMN request_payment_id UUID,
ADD COLUMN accept_payment_status TEXT DEFAULT NULL CHECK (accept_payment_status IN ('paid')),
ADD COLUMN accept_payment_id UUID;

-- 4. Enable RLS on wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for wallet_transactions
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions
FOR SELECT
USING (current_setting('app.current_user_id', true)::uuid = user_id);

CREATE POLICY "System can insert transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update transactions"
ON public.wallet_transactions
FOR UPDATE
USING (true);

-- 6. Function to add money to wallet (after successful Razorpay payment)
CREATE OR REPLACE FUNCTION public.add_wallet_balance(_user_id UUID, _amount INTEGER, _razorpay_payment_id TEXT, _razorpay_order_id TEXT)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Validate amount
  IF _amount < 9 THEN
    RETURN QUERY SELECT false, 0, 'Minimum top-up amount is ₹9'::TEXT;
    RETURN;
  END IF;

  -- Insert transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, razorpay_order_id, status, description)
  VALUES (_user_id, _amount, 'topup', 'razorpay', _razorpay_payment_id, _razorpay_order_id, 'completed', 'Wallet top-up via Razorpay');

  -- Update wallet balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + _amount
  WHERE user_id = _user_id
  RETURNING wallet_balance INTO v_new_balance;

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

-- 7. Function to pay for join request
CREATE OR REPLACE FUNCTION public.pay_join_request(_user_id UUID, _ride_request_id UUID, _payment_source TEXT, _razorpay_payment_id TEXT DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Check if request exists and belongs to user
  IF NOT EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND requester_id = _user_id) THEN
    RETURN QUERY SELECT false, 'Invalid ride request'::TEXT;
    RETURN;
  END IF;

  -- Check if already paid
  IF EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND request_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Request already paid'::TEXT;
    RETURN;
  END IF;

  IF _payment_source = 'wallet' THEN
    -- Check wallet balance
    SELECT wallet_balance INTO v_wallet_balance FROM public.profiles WHERE user_id = _user_id;
    
    IF v_wallet_balance < 9 THEN
      RETURN QUERY SELECT false, 'Insufficient wallet balance. Please add ₹9 to your wallet.'::TEXT;
      RETURN;
    END IF;

    -- Deduct from wallet
    UPDATE public.profiles SET wallet_balance = wallet_balance - 9 WHERE user_id = _user_id;
  END IF;

  -- Create transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, related_ride_request_id, status, description)
  VALUES (_user_id, -9, 'join_request', _payment_source, _razorpay_payment_id, _ride_request_id, 'completed', 'Payment for join request')
  RETURNING id INTO v_transaction_id;

  -- Update ride request payment status
  UPDATE public.ride_requests
  SET request_payment_status = 'paid', request_payment_id = v_transaction_id
  WHERE id = _ride_request_id;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- 8. Function to pay for accepting request
CREATE OR REPLACE FUNCTION public.pay_accept_request(_user_id UUID, _ride_request_id UUID, _payment_source TEXT, _razorpay_payment_id TEXT DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_balance INTEGER;
  v_transaction_id UUID;
  v_ride_owner_id UUID;
BEGIN
  -- Check if request exists and user is ride owner
  SELECT r.user_id INTO v_ride_owner_id
  FROM public.ride_requests rr
  JOIN public.rides r ON r.id = rr.ride_id
  WHERE rr.id = _ride_request_id;

  IF v_ride_owner_id IS NULL OR v_ride_owner_id != _user_id THEN
    RETURN QUERY SELECT false, 'You are not the ride owner'::TEXT;
    RETURN;
  END IF;

  -- Check if request is paid by requester
  IF NOT EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND request_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Requester has not paid yet'::TEXT;
    RETURN;
  END IF;

  -- Check if already accepted/paid
  IF EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND accept_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Already accepted and paid'::TEXT;
    RETURN;
  END IF;

  IF _payment_source = 'wallet' THEN
    -- Check wallet balance
    SELECT wallet_balance INTO v_wallet_balance FROM public.profiles WHERE user_id = _user_id;
    
    IF v_wallet_balance < 9 THEN
      RETURN QUERY SELECT false, 'Insufficient wallet balance. Please add ₹9 to your wallet.'::TEXT;
      RETURN;
    END IF;

    -- Deduct from wallet
    UPDATE public.profiles SET wallet_balance = wallet_balance - 9 WHERE user_id = _user_id;
  END IF;

  -- Create transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, related_ride_request_id, status, description)
  VALUES (_user_id, -9, 'accept_request', _payment_source, _razorpay_payment_id, _ride_request_id, 'completed', 'Payment for accepting request')
  RETURNING id INTO v_transaction_id;

  -- Update ride request payment and status
  UPDATE public.ride_requests
  SET accept_payment_status = 'paid', accept_payment_id = v_transaction_id, status = 'approved'
  WHERE id = _ride_request_id;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- 9. Function to refund join request (called when declined or expired)
CREATE OR REPLACE FUNCTION public.refund_join_request(_ride_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id UUID;
  v_request_payment_status TEXT;
  v_accept_payment_status TEXT;
BEGIN
  -- Get request details
  SELECT requester_id, request_payment_status, accept_payment_status 
  INTO v_requester_id, v_request_payment_status, v_accept_payment_status
  FROM public.ride_requests WHERE id = _ride_request_id;

  -- Only refund if paid but not accepted
  IF v_request_payment_status != 'paid' OR v_accept_payment_status = 'paid' THEN
    RETURN false;
  END IF;

  -- Add refund to wallet
  UPDATE public.profiles SET wallet_balance = wallet_balance + 9 WHERE user_id = v_requester_id;

  -- Create refund transaction
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, payment_source, related_ride_request_id, status, description)
  VALUES (v_requester_id, 9, 'refund', 'wallet', _ride_request_id, 'completed', 'Refund for declined/expired request');

  -- Update request status
  UPDATE public.ride_requests SET request_payment_status = 'refunded' WHERE id = _ride_request_id;

  RETURN true;
END;
$$;

-- 10. Function to get wallet details
CREATE OR REPLACE FUNCTION public.get_wallet_details(_user_id UUID)
RETURNS TABLE(balance INTEGER, total_topups INTEGER, total_spent INTEGER, total_refunds INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(p.wallet_balance, 0) as balance,
    COALESCE((SELECT SUM(amount) FROM public.wallet_transactions WHERE user_id = _user_id AND transaction_type = 'topup' AND status = 'completed'), 0)::INTEGER as total_topups,
    COALESCE((SELECT ABS(SUM(amount)) FROM public.wallet_transactions WHERE user_id = _user_id AND transaction_type IN ('join_request', 'accept_request') AND status = 'completed'), 0)::INTEGER as total_spent,
    COALESCE((SELECT SUM(amount) FROM public.wallet_transactions WHERE user_id = _user_id AND transaction_type = 'refund' AND status = 'completed'), 0)::INTEGER as total_refunds
  FROM public.profiles p
  WHERE p.user_id = _user_id
$$;

-- 11. Trigger to auto-refund when request is declined
CREATE OR REPLACE FUNCTION public.auto_refund_on_decline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
    PERFORM public.refund_join_request(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_refund_on_decline
AFTER UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_refund_on_decline();

-- 12. Enable realtime for wallet_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;

-- === 20260204205559_7ca8c54f-4bef-48a5-92a8-dbb03a9d2609.sql ===
-- New function to create request AND process payment atomically
CREATE OR REPLACE FUNCTION public.create_and_pay_join_request(
  _requester_id uuid,
  _ride_id uuid,
  _payment_source text,
  _requester_show_profile_photo boolean DEFAULT true,
  _requester_show_mobile_number boolean DEFAULT false,
  _razorpay_payment_id text DEFAULT NULL
)
RETURNS TABLE(success boolean, error_message text, request_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet_balance INTEGER;
  v_new_request_id UUID;
  v_transaction_id UUID;
  v_ride_owner_id UUID;
BEGIN
  -- Check if user is verified
  IF NOT is_user_verified(_requester_id) THEN
    RETURN QUERY SELECT false, 'Account not verified'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = _requester_id AND is_blocked = true) THEN
    RETURN QUERY SELECT false, 'Account is blocked'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Get ride owner
  SELECT user_id INTO v_ride_owner_id FROM rides WHERE id = _ride_id;
  IF v_ride_owner_id IS NULL THEN
    RETURN QUERY SELECT false, 'Ride not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Cannot request own ride
  IF v_ride_owner_id = _requester_id THEN
    RETURN QUERY SELECT false, 'Cannot request your own ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if already has a paid pending/approved request for this ride
  IF EXISTS (
    SELECT 1 FROM ride_requests 
    WHERE ride_id = _ride_id 
      AND requester_id = _requester_id 
      AND request_payment_status = 'paid'
      AND status IN ('pending', 'approved')
  ) THEN
    RETURN QUERY SELECT false, 'You already have a pending request for this ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Delete any unpaid requests for this ride from this user (cleanup)
  DELETE FROM ride_requests 
  WHERE ride_id = _ride_id 
    AND requester_id = _requester_id 
    AND (request_payment_status IS NULL OR request_payment_status != 'paid');

  -- Process wallet payment if needed
  IF _payment_source = 'wallet' THEN
    SELECT wallet_balance INTO v_wallet_balance FROM profiles WHERE user_id = _requester_id;
    
    IF v_wallet_balance < 9 THEN
      RETURN QUERY SELECT false, 'Insufficient wallet balance'::TEXT, NULL::UUID;
      RETURN;
    END IF;

    -- Deduct from wallet
    UPDATE profiles SET wallet_balance = wallet_balance - 9 WHERE user_id = _requester_id;
  END IF;

  -- Create the request with payment already done
  INSERT INTO ride_requests (
    ride_id, 
    requester_id, 
    status, 
    requester_show_profile_photo, 
    requester_show_mobile_number,
    request_payment_status
  )
  VALUES (
    _ride_id, 
    _requester_id, 
    'pending', 
    _requester_show_profile_photo, 
    _requester_show_mobile_number,
    'paid'
  )
  RETURNING id INTO v_new_request_id;

  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id, 
    amount, 
    transaction_type, 
    payment_source, 
    razorpay_payment_id, 
    related_ride_request_id, 
    status, 
    description
  )
  VALUES (
    _requester_id, 
    -9, 
    'join_request', 
    _payment_source, 
    _razorpay_payment_id, 
    v_new_request_id, 
    'completed', 
    'Payment for join request'
  )
  RETURNING id INTO v_transaction_id;

  -- Update request with payment ID
  UPDATE ride_requests 
  SET request_payment_id = v_transaction_id 
  WHERE id = v_new_request_id;

  RETURN QUERY SELECT true, NULL::TEXT, v_new_request_id;
END;
$$;

-- === 20260214062641_5d1e475b-abee-4e68-b0b7-0fe8bfabff98.sql ===

-- Add premium subscription fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_expiry timestamp with time zone;

-- Update all DB functions that use amount 9 to use 21

-- Update create_and_pay_join_request to use 21
CREATE OR REPLACE FUNCTION public.create_and_pay_join_request(_requester_id uuid, _ride_id uuid, _payment_source text, _requester_show_profile_photo boolean DEFAULT true, _requester_show_mobile_number boolean DEFAULT false, _razorpay_payment_id text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, error_message text, request_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet_balance INTEGER;
  v_new_request_id UUID;
  v_transaction_id UUID;
  v_ride_owner_id UUID;
  v_is_premium BOOLEAN;
BEGIN
  -- Check if user is verified
  IF NOT is_user_verified(_requester_id) THEN
    RETURN QUERY SELECT false, 'Account not verified'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if user is blocked
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = _requester_id AND is_blocked = true) THEN
    RETURN QUERY SELECT false, 'Account is blocked'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Get ride owner
  SELECT user_id INTO v_ride_owner_id FROM rides WHERE id = _ride_id;
  IF v_ride_owner_id IS NULL THEN
    RETURN QUERY SELECT false, 'Ride not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Cannot request own ride
  IF v_ride_owner_id = _requester_id THEN
    RETURN QUERY SELECT false, 'Cannot request your own ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if already has a paid pending/approved request for this ride
  IF EXISTS (
    SELECT 1 FROM ride_requests 
    WHERE ride_id = _ride_id 
      AND requester_id = _requester_id 
      AND request_payment_status = 'paid'
      AND status IN ('pending', 'approved')
  ) THEN
    RETURN QUERY SELECT false, 'You already have a pending request for this ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Delete any unpaid requests for this ride from this user (cleanup)
  DELETE FROM ride_requests 
  WHERE ride_id = _ride_id 
    AND requester_id = _requester_id 
    AND (request_payment_status IS NULL OR request_payment_status != 'paid');

  -- Check if user has active premium subscription
  SELECT (is_premium = true AND subscription_expiry > now()) INTO v_is_premium
  FROM profiles WHERE user_id = _requester_id;

  -- If premium, skip payment deduction
  IF NOT COALESCE(v_is_premium, false) THEN
    -- Non-premium: payment is required (razorpay only, no wallet)
    IF _payment_source != 'razorpay' OR _razorpay_payment_id IS NULL THEN
      RETURN QUERY SELECT false, 'Payment required'::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  -- Create the request with payment already done
  INSERT INTO ride_requests (
    ride_id, 
    requester_id, 
    status, 
    requester_show_profile_photo, 
    requester_show_mobile_number,
    request_payment_status
  )
  VALUES (
    _ride_id, 
    _requester_id, 
    'pending', 
    _requester_show_profile_photo, 
    _requester_show_mobile_number,
    'paid'
  )
  RETURNING id INTO v_new_request_id;

  -- Create transaction record (only for non-premium)
  IF NOT COALESCE(v_is_premium, false) THEN
    INSERT INTO wallet_transactions (
      user_id, 
      amount, 
      transaction_type, 
      payment_source, 
      razorpay_payment_id, 
      related_ride_request_id, 
      status, 
      description
    )
    VALUES (
      _requester_id, 
      -21, 
      'join_request', 
      _payment_source, 
      _razorpay_payment_id, 
      v_new_request_id, 
      'completed', 
      'Payment for join request'
    )
    RETURNING id INTO v_transaction_id;

    -- Update request with payment ID
    UPDATE ride_requests 
    SET request_payment_id = v_transaction_id 
    WHERE id = v_new_request_id;
  ELSE
    -- Premium user: mark as paid but no transaction
    UPDATE ride_requests 
    SET request_payment_id = NULL 
    WHERE id = v_new_request_id;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT, v_new_request_id;
END;
$function$;

-- Update pay_accept_request to use 21
CREATE OR REPLACE FUNCTION public.pay_accept_request(_user_id uuid, _ride_request_id uuid, _payment_source text, _razorpay_payment_id text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction_id UUID;
  v_ride_owner_id UUID;
  v_is_premium BOOLEAN;
BEGIN
  -- Check if request exists and user is ride owner
  SELECT r.user_id INTO v_ride_owner_id
  FROM public.ride_requests rr
  JOIN public.rides r ON r.id = rr.ride_id
  WHERE rr.id = _ride_request_id;

  IF v_ride_owner_id IS NULL OR v_ride_owner_id != _user_id THEN
    RETURN QUERY SELECT false, 'You are not the ride owner'::TEXT;
    RETURN;
  END IF;

  -- Check if request is paid by requester
  IF NOT EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND request_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Requester has not paid yet'::TEXT;
    RETURN;
  END IF;

  -- Check if already accepted/paid
  IF EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND accept_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Already accepted and paid'::TEXT;
    RETURN;
  END IF;

  -- Check if user has active premium subscription
  SELECT (is_premium = true AND subscription_expiry > now()) INTO v_is_premium
  FROM profiles WHERE user_id = _user_id;

  -- If not premium, payment is required
  IF NOT COALESCE(v_is_premium, false) THEN
    IF _payment_source != 'razorpay' OR _razorpay_payment_id IS NULL THEN
      RETURN QUERY SELECT false, 'Payment required'::TEXT;
      RETURN;
    END IF;

    -- Create transaction record
    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, related_ride_request_id, status, description)
    VALUES (_user_id, -21, 'accept_request', _payment_source, _razorpay_payment_id, _ride_request_id, 'completed', 'Payment for accepting request')
    RETURNING id INTO v_transaction_id;

    -- Update ride request payment and status
    UPDATE public.ride_requests
    SET accept_payment_status = 'paid', accept_payment_id = v_transaction_id, status = 'approved'
    WHERE id = _ride_request_id;
  ELSE
    -- Premium: auto-approve, no payment needed
    UPDATE public.ride_requests
    SET accept_payment_status = 'paid', status = 'approved'
    WHERE id = _ride_request_id;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$function$;

-- Update refund function to refund 21 instead of 9
CREATE OR REPLACE FUNCTION public.refund_join_request(_ride_request_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_requester_id UUID;
  v_request_payment_status TEXT;
  v_accept_payment_status TEXT;
  v_has_transaction BOOLEAN;
BEGIN
  -- Get request details
  SELECT requester_id, request_payment_status, accept_payment_status 
  INTO v_requester_id, v_request_payment_status, v_accept_payment_status
  FROM public.ride_requests WHERE id = _ride_request_id;

  -- Only refund if paid but not accepted
  IF v_request_payment_status != 'paid' OR v_accept_payment_status = 'paid' THEN
    RETURN false;
  END IF;

  -- Check if there was an actual payment transaction (premium users won't have one)
  SELECT EXISTS (
    SELECT 1 FROM wallet_transactions 
    WHERE related_ride_request_id = _ride_request_id 
    AND transaction_type = 'join_request' 
    AND status = 'completed'
  ) INTO v_has_transaction;

  IF NOT v_has_transaction THEN
    -- Premium user, no refund needed, just update status
    UPDATE public.ride_requests SET request_payment_status = 'refunded' WHERE id = _ride_request_id;
    RETURN true;
  END IF;

  -- Non-premium: no wallet refund since payment was via Razorpay directly
  -- Just mark as refunded (manual refund via Razorpay dashboard)
  UPDATE public.ride_requests SET request_payment_status = 'refunded' WHERE id = _ride_request_id;

  -- Create refund transaction record
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, payment_source, related_ride_request_id, status, description)
  VALUES (v_requester_id, 21, 'refund', 'razorpay', _ride_request_id, 'completed', 'Refund for declined/expired request');

  RETURN true;
END;
$function$;

-- Create function to activate premium subscription
CREATE OR REPLACE FUNCTION public.activate_premium_subscription(_user_id uuid, _razorpay_payment_id text, _razorpay_order_id text)
 RETURNS TABLE(success boolean, error_message text, expiry_date timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiry (30 days from now, or extend from current expiry if still active)
  SELECT CASE 
    WHEN subscription_expiry > now() THEN subscription_expiry + INTERVAL '30 days'
    ELSE now() + INTERVAL '30 days'
  END INTO v_expiry
  FROM profiles WHERE user_id = _user_id;

  IF v_expiry IS NULL THEN
    v_expiry := now() + INTERVAL '30 days';
  END IF;

  -- Update profile
  UPDATE profiles 
  SET is_premium = true, subscription_expiry = v_expiry
  WHERE user_id = _user_id;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, razorpay_order_id, status, description)
  VALUES (_user_id, -99, 'subscription', 'razorpay', _razorpay_payment_id, _razorpay_order_id, 'completed', 'Premium subscription - 30 days');

  RETURN QUERY SELECT true, NULL::TEXT, v_expiry;
END;
$function$;


-- === 20260214063650_ea832ac8-f7d6-4dc0-8d29-0ec2733d1b7c.sql ===

-- Update create_and_pay_join_request to also bypass payment for admins
CREATE OR REPLACE FUNCTION public.create_and_pay_join_request(_requester_id uuid, _ride_id uuid, _payment_source text, _requester_show_profile_photo boolean DEFAULT true, _requester_show_mobile_number boolean DEFAULT false, _razorpay_payment_id text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, error_message text, request_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet_balance INTEGER;
  v_new_request_id UUID;
  v_transaction_id UUID;
  v_ride_owner_id UUID;
  v_is_premium BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  IF NOT is_user_verified(_requester_id) THEN
    RETURN QUERY SELECT false, 'Account not verified'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = _requester_id AND is_blocked = true) THEN
    RETURN QUERY SELECT false, 'Account is blocked'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT user_id INTO v_ride_owner_id FROM rides WHERE id = _ride_id;
  IF v_ride_owner_id IS NULL THEN
    RETURN QUERY SELECT false, 'Ride not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_ride_owner_id = _requester_id THEN
    RETURN QUERY SELECT false, 'Cannot request your own ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ride_requests 
    WHERE ride_id = _ride_id AND requester_id = _requester_id 
      AND request_payment_status = 'paid' AND status IN ('pending', 'approved')
  ) THEN
    RETURN QUERY SELECT false, 'You already have a pending request for this ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  DELETE FROM ride_requests 
  WHERE ride_id = _ride_id AND requester_id = _requester_id 
    AND (request_payment_status IS NULL OR request_payment_status != 'paid');

  -- Check admin role first
  SELECT has_role(_requester_id, 'admin'::app_role) INTO v_is_admin;

  -- Check premium subscription
  SELECT (is_premium = true AND subscription_expiry > now()) INTO v_is_premium
  FROM profiles WHERE user_id = _requester_id;

  -- Admin or premium bypasses payment
  IF NOT COALESCE(v_is_admin, false) AND NOT COALESCE(v_is_premium, false) THEN
    IF _payment_source != 'razorpay' OR _razorpay_payment_id IS NULL THEN
      RETURN QUERY SELECT false, 'Payment required'::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  INSERT INTO ride_requests (ride_id, requester_id, status, requester_show_profile_photo, requester_show_mobile_number, request_payment_status)
  VALUES (_ride_id, _requester_id, 'pending', _requester_show_profile_photo, _requester_show_mobile_number, 'paid')
  RETURNING id INTO v_new_request_id;

  IF NOT COALESCE(v_is_admin, false) AND NOT COALESCE(v_is_premium, false) THEN
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, related_ride_request_id, status, description)
    VALUES (_requester_id, -21, 'join_request', _payment_source, _razorpay_payment_id, v_new_request_id, 'completed', 'Payment for join request')
    RETURNING id INTO v_transaction_id;

    UPDATE ride_requests SET request_payment_id = v_transaction_id WHERE id = v_new_request_id;
  ELSE
    UPDATE ride_requests SET request_payment_id = NULL WHERE id = v_new_request_id;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT, v_new_request_id;
END;
$function$;

-- Update pay_accept_request to also bypass payment for admins
CREATE OR REPLACE FUNCTION public.pay_accept_request(_user_id uuid, _ride_request_id uuid, _payment_source text, _razorpay_payment_id text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction_id UUID;
  v_ride_owner_id UUID;
  v_is_premium BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  SELECT r.user_id INTO v_ride_owner_id
  FROM public.ride_requests rr
  JOIN public.rides r ON r.id = rr.ride_id
  WHERE rr.id = _ride_request_id;

  IF v_ride_owner_id IS NULL OR v_ride_owner_id != _user_id THEN
    RETURN QUERY SELECT false, 'You are not the ride owner'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND request_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Requester has not paid yet'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND accept_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Already accepted and paid'::TEXT;
    RETURN;
  END IF;

  -- Check admin role first
  SELECT has_role(_user_id, 'admin'::app_role) INTO v_is_admin;

  SELECT (is_premium = true AND subscription_expiry > now()) INTO v_is_premium
  FROM profiles WHERE user_id = _user_id;

  IF NOT COALESCE(v_is_admin, false) AND NOT COALESCE(v_is_premium, false) THEN
    IF _payment_source != 'razorpay' OR _razorpay_payment_id IS NULL THEN
      RETURN QUERY SELECT false, 'Payment required'::TEXT;
      RETURN;
    END IF;

    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, related_ride_request_id, status, description)
    VALUES (_user_id, -21, 'accept_request', _payment_source, _razorpay_payment_id, _ride_request_id, 'completed', 'Payment for accepting request')
    RETURNING id INTO v_transaction_id;

    UPDATE public.ride_requests
    SET accept_payment_status = 'paid', accept_payment_id = v_transaction_id, status = 'approved'
    WHERE id = _ride_request_id;
  ELSE
    UPDATE public.ride_requests
    SET accept_payment_status = 'paid', status = 'approved'
    WHERE id = _ride_request_id;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$function$;


-- === 20260214070206_3f054c93-a5d3-4503-8a89-68a74ad033f3.sql ===

-- Function for admin to gift premium subscription
CREATE OR REPLACE FUNCTION public.admin_gift_premium(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN false;
  END IF;

  -- Update profile to premium with 30-day expiry
  UPDATE public.profiles
  SET 
    is_premium = true,
    subscription_expiry = now() + INTERVAL '30 days'
  WHERE user_id = _target_user_id;

  -- Send notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _target_user_id,
    '🎁 Subscription Gifted',
    'Admin gifted you a Premium subscription for this month! Enjoy unlimited connections.',
    'success'
  );

  RETURN true;
END;
$$;

-- Function for admin to remove premium
CREATE OR REPLACE FUNCTION public.admin_remove_premium(_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET 
    is_premium = false,
    subscription_expiry = null
  WHERE user_id = _target_user_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _target_user_id,
    'Premium Removed',
    'Your Premium subscription has been removed by an admin.',
    'info'
  );

  RETURN true;
END;
$$;


-- === 20260217173713_7f1e729e-6813-4e3a-af3a-43bf3466bbf4.sql ===
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- === 20260217174305_099893b2-10ca-464a-848e-0afd8354fa5c.sql ===

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_valid;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type = ANY (ARRAY['info', 'success', 'warning', 'error', 'request', 'approved', 'declined', 'new_request']));


-- === 20260217175351_bdf6ee15-3b8c-4f86-9c36-5958b3eb223f.sql ===

-- 1. Add free_connections_left column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_connections_left integer NOT NULL DEFAULT 0;

-- 2. Trigger function: grant 5 free connections on first verification
CREATE OR REPLACE FUNCTION public.grant_free_connections_on_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only when is_verified changes from false to true
  IF NEW.is_verified = true AND OLD.is_verified = false THEN
    -- Only grant if they've never had free connections (first-time verification)
    IF OLD.free_connections_left = 0 AND NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = NEW.user_id AND title = '🎁 Free Ride Connections'
    ) THEN
      NEW.free_connections_left := 5;
      
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        '🎁 Free Ride Connections',
        'You''ve received 5 FREE ride connections! Use them to send or accept ride requests. After that, ₹21 per connection or upgrade to Premium.',
        'success'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_grant_free_connections
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.grant_free_connections_on_verify();

-- 3. Helper to send "free rides finished" notification
CREATE OR REPLACE FUNCTION public.notify_free_connections_exhausted(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _user_id,
    'Free rides finished',
    'Your 5 free ride connections are used. Now pay ₹21 per connection or upgrade to Premium.',
    'info'
  );
END;
$function$;

-- 4. Update create_and_pay_join_request to use free connections
CREATE OR REPLACE FUNCTION public.create_and_pay_join_request(
  _requester_id uuid, _ride_id uuid, _payment_source text,
  _requester_show_profile_photo boolean DEFAULT true,
  _requester_show_mobile_number boolean DEFAULT false,
  _razorpay_payment_id text DEFAULT NULL
)
RETURNS TABLE(success boolean, error_message text, request_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_request_id UUID;
  v_transaction_id UUID;
  v_ride_owner_id UUID;
  v_is_premium BOOLEAN;
  v_is_admin BOOLEAN;
  v_free_left INTEGER;
BEGIN
  IF NOT is_user_verified(_requester_id) THEN
    RETURN QUERY SELECT false, 'Account not verified'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = _requester_id AND is_blocked = true) THEN
    RETURN QUERY SELECT false, 'Account is blocked'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT user_id INTO v_ride_owner_id FROM rides WHERE id = _ride_id;
  IF v_ride_owner_id IS NULL THEN
    RETURN QUERY SELECT false, 'Ride not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_ride_owner_id = _requester_id THEN
    RETURN QUERY SELECT false, 'Cannot request your own ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ride_requests 
    WHERE ride_id = _ride_id AND requester_id = _requester_id 
      AND request_payment_status = 'paid' AND status IN ('pending', 'approved')
  ) THEN
    RETURN QUERY SELECT false, 'You already have a pending request for this ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  DELETE FROM ride_requests 
  WHERE ride_id = _ride_id AND requester_id = _requester_id 
    AND (request_payment_status IS NULL OR request_payment_status != 'paid');

  SELECT has_role(_requester_id, 'admin'::app_role) INTO v_is_admin;
  SELECT (is_premium = true AND subscription_expiry > now()) INTO v_is_premium
  FROM profiles WHERE user_id = _requester_id;

  -- Check free connections
  SELECT free_connections_left INTO v_free_left FROM profiles WHERE user_id = _requester_id;

  -- Determine if payment is needed
  IF NOT COALESCE(v_is_admin, false) AND NOT COALESCE(v_is_premium, false) AND COALESCE(v_free_left, 0) <= 0 THEN
    IF _payment_source != 'razorpay' OR _razorpay_payment_id IS NULL THEN
      RETURN QUERY SELECT false, 'Payment required'::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  INSERT INTO ride_requests (ride_id, requester_id, status, requester_show_profile_photo, requester_show_mobile_number, request_payment_status)
  VALUES (_ride_id, _requester_id, 'pending', _requester_show_profile_photo, _requester_show_mobile_number, 'paid')
  RETURNING id INTO v_new_request_id;

  IF NOT COALESCE(v_is_admin, false) AND NOT COALESCE(v_is_premium, false) THEN
    IF COALESCE(v_free_left, 0) > 0 THEN
      -- Use a free connection
      UPDATE profiles SET free_connections_left = free_connections_left - 1 WHERE user_id = _requester_id;
      UPDATE ride_requests SET request_payment_id = NULL WHERE id = v_new_request_id;
      -- Check if now exhausted
      IF v_free_left - 1 = 0 THEN
        PERFORM notify_free_connections_exhausted(_requester_id);
      END IF;
    ELSE
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, related_ride_request_id, status, description)
      VALUES (_requester_id, -21, 'join_request', _payment_source, _razorpay_payment_id, v_new_request_id, 'completed', 'Payment for join request')
      RETURNING id INTO v_transaction_id;
      UPDATE ride_requests SET request_payment_id = v_transaction_id WHERE id = v_new_request_id;
    END IF;
  ELSE
    UPDATE ride_requests SET request_payment_id = NULL WHERE id = v_new_request_id;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT, v_new_request_id;
END;
$function$;

-- 5. Update pay_accept_request to use free connections
CREATE OR REPLACE FUNCTION public.pay_accept_request(
  _user_id uuid, _ride_request_id uuid, _payment_source text,
  _razorpay_payment_id text DEFAULT NULL
)
RETURNS TABLE(success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction_id UUID;
  v_ride_owner_id UUID;
  v_is_premium BOOLEAN;
  v_is_admin BOOLEAN;
  v_free_left INTEGER;
BEGIN
  SELECT r.user_id INTO v_ride_owner_id
  FROM public.ride_requests rr
  JOIN public.rides r ON r.id = rr.ride_id
  WHERE rr.id = _ride_request_id;

  IF v_ride_owner_id IS NULL OR v_ride_owner_id != _user_id THEN
    RETURN QUERY SELECT false, 'You are not the ride owner'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND request_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Requester has not paid yet'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.ride_requests WHERE id = _ride_request_id AND accept_payment_status = 'paid') THEN
    RETURN QUERY SELECT false, 'Already accepted and paid'::TEXT;
    RETURN;
  END IF;

  SELECT has_role(_user_id, 'admin'::app_role) INTO v_is_admin;
  SELECT (is_premium = true AND subscription_expiry > now()) INTO v_is_premium
  FROM profiles WHERE user_id = _user_id;
  SELECT free_connections_left INTO v_free_left FROM profiles WHERE user_id = _user_id;

  IF COALESCE(v_is_admin, false) OR COALESCE(v_is_premium, false) THEN
    -- Admin/Premium: free
    UPDATE public.ride_requests
    SET accept_payment_status = 'paid', status = 'approved'
    WHERE id = _ride_request_id;
  ELSIF COALESCE(v_free_left, 0) > 0 THEN
    -- Use free connection
    UPDATE profiles SET free_connections_left = free_connections_left - 1 WHERE user_id = _user_id;
    UPDATE public.ride_requests
    SET accept_payment_status = 'paid', status = 'approved'
    WHERE id = _ride_request_id;
    IF v_free_left - 1 = 0 THEN
      PERFORM notify_free_connections_exhausted(_user_id);
    END IF;
  ELSE
    -- Require payment
    IF _payment_source != 'razorpay' OR _razorpay_payment_id IS NULL THEN
      RETURN QUERY SELECT false, 'Payment required'::TEXT;
      RETURN;
    END IF;

    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, related_ride_request_id, status, description)
    VALUES (_user_id, -21, 'accept_request', _payment_source, _razorpay_payment_id, _ride_request_id, 'completed', 'Payment for accepting request')
    RETURNING id INTO v_transaction_id;

    UPDATE public.ride_requests
    SET accept_payment_status = 'paid', accept_payment_id = v_transaction_id, status = 'approved'
    WHERE id = _ride_request_id;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$function$;


-- === 20260217182419_bc9ac01b-83ee-4626-8787-291295479d78.sql ===

-- Add index for fast notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Update create_and_pay_join_request to INSERT notification for ride owner
CREATE OR REPLACE FUNCTION public.create_and_pay_join_request(
  _requester_id uuid, _ride_id uuid, _payment_source text,
  _requester_show_profile_photo boolean DEFAULT true,
  _requester_show_mobile_number boolean DEFAULT false,
  _razorpay_payment_id text DEFAULT NULL
)
RETURNS TABLE(success boolean, error_message text, request_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_new_request_id UUID;
  v_transaction_id UUID;
  v_ride_owner_id UUID;
  v_is_premium BOOLEAN;
  v_is_admin BOOLEAN;
  v_free_left INTEGER;
  v_requester_name TEXT;
  v_from_location TEXT;
  v_to_location TEXT;
BEGIN
  IF NOT is_user_verified(_requester_id) THEN
    RETURN QUERY SELECT false, 'Account not verified'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = _requester_id AND is_blocked = true) THEN
    RETURN QUERY SELECT false, 'Account is blocked'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT user_id, from_location, to_location INTO v_ride_owner_id, v_from_location, v_to_location FROM rides WHERE id = _ride_id;
  IF v_ride_owner_id IS NULL THEN
    RETURN QUERY SELECT false, 'Ride not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_ride_owner_id = _requester_id THEN
    RETURN QUERY SELECT false, 'Cannot request your own ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ride_requests 
    WHERE ride_id = _ride_id AND requester_id = _requester_id 
      AND request_payment_status = 'paid' AND status IN ('pending', 'approved')
  ) THEN
    RETURN QUERY SELECT false, 'You already have a pending request for this ride'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  DELETE FROM ride_requests 
  WHERE ride_id = _ride_id AND requester_id = _requester_id 
    AND (request_payment_status IS NULL OR request_payment_status != 'paid');

  SELECT has_role(_requester_id, 'admin'::app_role) INTO v_is_admin;
  SELECT (is_premium = true AND subscription_expiry > now()) INTO v_is_premium
  FROM profiles WHERE user_id = _requester_id;
  SELECT free_connections_left INTO v_free_left FROM profiles WHERE user_id = _requester_id;

  IF NOT COALESCE(v_is_admin, false) AND NOT COALESCE(v_is_premium, false) AND COALESCE(v_free_left, 0) <= 0 THEN
    IF _payment_source != 'razorpay' OR _razorpay_payment_id IS NULL THEN
      RETURN QUERY SELECT false, 'Payment required'::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  INSERT INTO ride_requests (ride_id, requester_id, status, requester_show_profile_photo, requester_show_mobile_number, request_payment_status)
  VALUES (_ride_id, _requester_id, 'pending', _requester_show_profile_photo, _requester_show_mobile_number, 'paid')
  RETURNING id INTO v_new_request_id;

  IF NOT COALESCE(v_is_admin, false) AND NOT COALESCE(v_is_premium, false) THEN
    IF COALESCE(v_free_left, 0) > 0 THEN
      UPDATE profiles SET free_connections_left = free_connections_left - 1 WHERE user_id = _requester_id;
      UPDATE ride_requests SET request_payment_id = NULL WHERE id = v_new_request_id;
      IF v_free_left - 1 = 0 THEN
        PERFORM notify_free_connections_exhausted(_requester_id);
      END IF;
    ELSE
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, payment_source, razorpay_payment_id, related_ride_request_id, status, description)
      VALUES (_requester_id, -21, 'join_request', _payment_source, _razorpay_payment_id, v_new_request_id, 'completed', 'Payment for join request')
      RETURNING id INTO v_transaction_id;
      UPDATE ride_requests SET request_payment_id = v_transaction_id WHERE id = v_new_request_id;
    END IF;
  ELSE
    UPDATE ride_requests SET request_payment_id = NULL WHERE id = v_new_request_id;
  END IF;

  -- FORCE notification to ride owner (same transaction)
  SELECT full_name INTO v_requester_name FROM profiles WHERE user_id = _requester_id;
  
  INSERT INTO notifications (user_id, title, message, type, ride_id)
  VALUES (
    v_ride_owner_id,
    'New Ride Request 🚗',
    COALESCE(v_requester_name, 'Someone') || ' wants to join your ride from ' || v_from_location || ' → ' || v_to_location,
    'new_request',
    _ride_id
  );

  RETURN QUERY SELECT true, NULL::TEXT, v_new_request_id;
END;
$function$;


-- === 20260217182659_1cdfb1fb-ebfc-49ff-8dfe-af354446c2b1.sql ===

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON public.rides(user_id);
CREATE INDEX IF NOT EXISTS idx_rides_date ON public.rides(ride_date);
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride_id ON public.ride_requests(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_requester_id ON public.ride_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON public.ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_connections_user1 ON public.connections(user1_id);
CREATE INDEX IF NOT EXISTS idx_connections_user2 ON public.connections(user2_id);
CREATE INDEX IF NOT EXISTS idx_connections_ride ON public.connections(ride_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_connection ON public.chat_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);


-- === 20260218171307_6977690b-5d8e-488e-a03d-874262af608a.sql ===

-- Add status column to rides table
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);

-- Function: admin_force_cancel_ride
-- Cancels a ride, closes all its group chats, and notifies all connected users
CREATE OR REPLACE FUNCTION public.admin_force_cancel_ride(_ride_id uuid)
RETURNS TABLE(success boolean, error_message text, notified_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ride RECORD;
  v_user_ids uuid[];
  v_uid uuid;
  v_count integer := 0;
BEGIN
  -- Must be admin
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN QUERY SELECT false, 'Unauthorized'::text, 0;
    RETURN;
  END IF;

  -- Get ride details
  SELECT id, user_id, from_location, to_location, ride_date
  INTO v_ride
  FROM public.rides
  WHERE id = _ride_id;

  IF v_ride IS NULL THEN
    RETURN QUERY SELECT false, 'Ride not found'::text, 0;
    RETURN;
  END IF;

  -- Mark ride as cancelled
  UPDATE public.rides
  SET status = 'cancelled_by_admin'
  WHERE id = _ride_id;

  -- Close all group chats for this ride
  UPDATE public.group_chats
  SET status = 'closed'
  WHERE ride_id = _ride_id;

  -- Expire all active connections for this ride
  UPDATE public.connections
  SET status = 'expired', expires_at = now()
  WHERE ride_id = _ride_id AND status = 'active';

  -- Collect all users to notify:
  -- 1. Ride owner
  -- 2. Approved requesters
  SELECT ARRAY(
    SELECT DISTINCT unnest(ARRAY[v_ride.user_id] ||
      ARRAY(
        SELECT requester_id FROM public.ride_requests
        WHERE ride_id = _ride_id AND status = 'approved'
      ) ||
      ARRAY(
        SELECT user_id FROM public.group_chat_members
        WHERE group_chat_id IN (
          SELECT id FROM public.group_chats WHERE ride_id = _ride_id
        )
      )
    )
  ) INTO v_user_ids;

  -- Send notification to each unique user
  FOREACH v_uid IN ARRAY v_user_ids
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      v_uid,
      'Ride Cancelled by YaatraBuddy',
      'YaatraBuddy team cancelled this ride. If you have any issue, feel free to reach out to us.',
      'system',
      _ride_id
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT true, NULL::text, v_count;
END;
$$;

-- Allow admins to call this function (it's SECURITY DEFINER, so it checks internally)
-- But we still need users to be able to SELECT from rides including cancelled ones
-- The existing policy "Anyone can view rides" with USING (true) already covers this


-- === 20260219172914_c5a1a318-7bd9-4a23-98ab-ac3c1727fc6d.sql ===
CREATE OR REPLACE FUNCTION public.admin_force_cancel_ride(_ride_id uuid)
RETURNS TABLE(success boolean, error_message text, notified_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ride RECORD;
  v_user_ids uuid[];
  v_uid uuid;
  v_count integer := 0;
BEGIN
  -- Must be admin
  IF NOT has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role) THEN
    RETURN QUERY SELECT false, 'Unauthorized: You do not have admin permissions'::text, 0;
    RETURN;
  END IF;

  -- Get ride details
  SELECT id, user_id, from_location, to_location, ride_date, status
  INTO v_ride
  FROM public.rides
  WHERE id = _ride_id;

  IF v_ride IS NULL THEN
    RETURN QUERY SELECT false, 'Ride not found with the given ID'::text, 0;
    RETURN;
  END IF;

  IF v_ride.status = 'cancelled_by_admin' THEN
    RETURN QUERY SELECT false, 'Ride is already cancelled'::text, 0;
    RETURN;
  END IF;

  -- Mark ride as cancelled
  UPDATE public.rides
  SET status = 'cancelled_by_admin'
  WHERE id = _ride_id;

  -- Close all group chats for this ride (safe - no error if none exist)
  UPDATE public.group_chats
  SET status = 'closed'
  WHERE ride_id = _ride_id;

  -- Expire all active connections for this ride
  UPDATE public.connections
  SET status = 'expired', expires_at = now()
  WHERE ride_id = _ride_id AND status = 'active';

  -- Collect all users to notify
  SELECT ARRAY(
    SELECT DISTINCT unnest(ARRAY[v_ride.user_id] ||
      ARRAY(
        SELECT requester_id FROM public.ride_requests
        WHERE ride_id = _ride_id AND status IN ('approved', 'pending')
      ) ||
      ARRAY(
        SELECT user_id FROM public.group_chat_members
        WHERE group_chat_id IN (
          SELECT id FROM public.group_chats WHERE ride_id = _ride_id
        )
      )
    )
  ) INTO v_user_ids;

  -- Send notification to each unique user (catch errors per-user)
  FOREACH v_uid IN ARRAY v_user_ids
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, ride_id)
      VALUES (
        v_uid,
        'Ride Cancelled by YaatraBuddy',
        'YaatraBuddy team cancelled this ride. If you have any issue, feel free to reach out to us.',
        'system',
        _ride_id
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't block the cancellation
      RAISE WARNING 'Failed to notify user %: %', v_uid, SQLERRM;
    END;
  END LOOP;

  -- Also decline all pending requests and refund them
  UPDATE public.ride_requests
  SET status = 'declined', updated_at = now()
  WHERE ride_id = _ride_id AND status = 'pending';

  RETURN QUERY SELECT true, NULL::text, v_count;
END;
$function$;

-- === 20260221051554_496d85b4-4540-425c-bde1-0453675a8202.sql ===
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- === 20260221052659_f24a2c11-90f6-481f-89c7-85f72c50991a.sql ===

CREATE OR REPLACE FUNCTION public.owner_delete_ride(_user_id uuid, _ride_id uuid)
RETURNS TABLE(success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ride RECORD;
  v_connected_user_ids uuid[];
BEGIN
  -- Verify ownership
  SELECT id, user_id, from_location, to_location, status
  INTO v_ride
  FROM public.rides
  WHERE id = _ride_id;

  IF v_ride IS NULL THEN
    RETURN QUERY SELECT false, 'Ride not found'::text;
    RETURN;
  END IF;

  IF v_ride.user_id != _user_id THEN
    RETURN QUERY SELECT false, 'Unauthorized: You are not the ride owner'::text;
    RETURN;
  END IF;

  IF v_ride.status IN ('deleted', 'cancelled_by_admin') THEN
    RETURN QUERY SELECT false, 'Ride is already deleted/cancelled'::text;
    RETURN;
  END IF;

  -- Collect connected users (approved requesters)
  SELECT ARRAY(
    SELECT DISTINCT requester_id FROM public.ride_requests
    WHERE ride_id = _ride_id AND status IN ('approved', 'pending')
  ) INTO v_connected_user_ids;

  -- Soft delete the ride
  UPDATE public.rides SET status = 'deleted' WHERE id = _ride_id;

  -- Decline all pending requests and refund them
  UPDATE public.ride_requests
  SET status = 'declined', updated_at = now()
  WHERE ride_id = _ride_id AND status = 'pending';

  -- Expire all active connections
  UPDATE public.connections
  SET status = 'expired', expires_at = now()
  WHERE ride_id = _ride_id AND status = 'active';

  -- Close group chats
  UPDATE public.group_chats
  SET status = 'closed'
  WHERE ride_id = _ride_id;

  -- Notify connected users
  IF array_length(v_connected_user_ids, 1) > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    SELECT 
      unnest(v_connected_user_ids),
      'Ride Deleted 🗑️',
      'The ride from ' || v_ride.from_location || ' → ' || v_ride.to_location || ' has been deleted by the ride owner.',
      'system',
      _ride_id;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$function$;


-- === 20260225000000_notifications_instant_and_dedup.sql ===
-- Improve notification delivery: send approval notifications immediately from trigger
-- (no longer via cron), and only schedule reminders in scheduled_notifications.
-- This eliminates 4-5 min delay and prevents duplicate approval notifications.

CREATE OR REPLACE FUNCTION public.schedule_ride_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride_date DATE;
  v_ride_time TIME;
  v_ride_datetime TIMESTAMP WITH TIME ZONE;
  v_reminder_time TIMESTAMP WITH TIME ZONE;
  v_seats_available INTEGER;
  v_from_location TEXT;
  v_to_location TEXT;
  v_notification_message TEXT;
  v_title TEXT := 'Ride Confirmed!';
  v_message TEXT := 'Your ride has been confirmed! You can now chat with your travel partner for the next 24 hours.';
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT r.ride_date, r.ride_time, r.seats_available, r.from_location, r.to_location
    INTO v_ride_date, v_ride_time, v_seats_available, v_from_location, v_to_location
    FROM public.rides r
    WHERE r.id = NEW.ride_id;

    v_ride_datetime := (v_ride_date || ' ' || v_ride_time)::TIMESTAMP WITH TIME ZONE;
    v_reminder_time := v_ride_datetime - INTERVAL '60 minutes';

    -- Send approval notifications IMMEDIATELY (no cron delay, no duplicates)
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES
      (NEW.user1_id, v_title, v_message, 'success', NEW.ride_id),
      (NEW.user2_id, v_title, v_message, 'success', NEW.ride_id);

    -- Schedule only reminders (not approval) so cron won't send approval again
    IF (now() + INTERVAL '8 hours') < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES
        (NEW.ride_id, NEW.id, NEW.user1_id, '8h_reminder', now() + INTERVAL '8 hours'),
        (NEW.ride_id, NEW.id, NEW.user2_id, '8h_reminder', now() + INTERVAL '8 hours')
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;

    IF (now() + INTERVAL '16 hours') < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES
        (NEW.ride_id, NEW.id, NEW.user1_id, '16h_reminder', now() + INTERVAL '16 hours'),
        (NEW.ride_id, NEW.id, NEW.user2_id, '16h_reminder', now() + INTERVAL '16 hours')
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;

    IF v_reminder_time > now() AND v_reminder_time < NEW.expires_at THEN
      INSERT INTO public.scheduled_notifications (ride_id, connection_id, user_id, notification_type, scheduled_for)
      VALUES
        (NEW.ride_id, NEW.id, NEW.user1_id, '60min_before_ride', v_reminder_time),
        (NEW.ride_id, NEW.id, NEW.user2_id, '60min_before_ride', v_reminder_time)
      ON CONFLICT (connection_id, user_id, notification_type) DO NOTHING;
    END IF;

    -- Group chat: extra immediate notification for the new member
    IF v_seats_available >= 2 THEN
      v_notification_message := 'You''ve been added to a ride group: From ' || v_from_location || ' → To ' || v_to_location;
      INSERT INTO public.notifications (user_id, title, message, type, ride_id)
      VALUES (
        NEW.user2_id,
        'Added to Group Ride',
        v_notification_message,
        'success',
        NEW.ride_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Atomically claim pending scheduled notifications so only one worker processes each row
-- (prevents duplicate delivery when cron runs overlap or run twice)
CREATE OR REPLACE FUNCTION public.claim_pending_scheduled_notifications(_limit int DEFAULT 100)
RETURNS SETOF public.scheduled_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.scheduled_notifications
    WHERE scheduled_for <= now()
      AND sent_at IS NULL
      AND cancelled_at IS NULL
    ORDER BY scheduled_for ASC
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.scheduled_notifications sn
  SET sent_at = now()
  FROM candidates c
  WHERE sn.id = c.id
  RETURNING sn.*;
END;
$$;

