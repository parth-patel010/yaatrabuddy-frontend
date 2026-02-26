-- Run this in Neon SQL Editor if you get: relation "public.locations" does not exist
-- Requires: public.update_updated_at_column(), public.has_role(uuid, app_role), app_role enum (from main neon schema)

-- 1) Function for updated_at trigger (if not already in DB)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2) Locations table
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Vadodara',
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_city_active ON public.locations(city, active);
CREATE INDEX IF NOT EXISTS idx_locations_category ON public.locations(category);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active locations" ON public.locations;
CREATE POLICY "Anyone can view active locations"
ON public.locations FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins can view all locations" ON public.locations;
CREATE POLICY "Admins can view all locations"
ON public.locations FOR SELECT
USING (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert locations" ON public.locations;
CREATE POLICY "Admins can insert locations"
ON public.locations FOR INSERT
WITH CHECK (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update locations" ON public.locations;
CREATE POLICY "Admins can update locations"
ON public.locations FOR UPDATE
USING (has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::app_role));

DROP TRIGGER IF EXISTS update_locations_updated_at ON public.locations;
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seed data (only when table is empty)
INSERT INTO public.locations (name, category, city, display_order)
SELECT v.name, v.category, v.city, v.display_order
FROM (VALUES
  ('Parul University', 'Universities & Colleges', 'Vadodara', 1),
  ('Maharaja Sayajirao University (Main Campus)', 'Universities & Colleges', 'Vadodara', 2),
  ('MSU Fatehgunj Campus', 'Universities & Colleges', 'Vadodara', 3),
  ('Navrachana University', 'Universities & Colleges', 'Vadodara', 4),
  ('ITM Universe', 'Universities & Colleges', 'Vadodara', 5),
  ('Sigma University', 'Universities & Colleges', 'Vadodara', 6),
  ('Sumandeep Vidyapeeth', 'Universities & Colleges', 'Vadodara', 7),
  ('GSFC University', 'Universities & Colleges', 'Vadodara', 8),
  ('Parul Hostel Area', 'Student Hostel & PG Zones', 'Vadodara', 10),
  ('Waghodia Gaam', 'Student Hostel & PG Zones', 'Vadodara', 11),
  ('Limda Chowkdi', 'Student Hostel & PG Zones', 'Vadodara', 12),
  ('Vadodara Railway Station', 'Transport Hubs', 'Vadodara', 60),
  ('Vadodara Airport', 'Transport Hubs', 'Vadodara', 62),
  ('Inorbit Mall', 'Malls & Commercial Areas', 'Vadodara', 70),
  ('Alkapuri', 'Residential & Society Zones', 'Vadodara', 30),
  ('Akota', 'Residential & Society Zones', 'Vadodara', 31),
  ('Gotri', 'Residential & Society Zones', 'Vadodara', 37)
) AS v(name, category, city, display_order)
WHERE (SELECT count(*) FROM public.locations) = 0;
