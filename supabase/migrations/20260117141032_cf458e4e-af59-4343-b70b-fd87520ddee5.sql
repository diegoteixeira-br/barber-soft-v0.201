-- Create table to audit manual deletions of confirmed/completed appointments
CREATE TABLE public.appointment_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Appointment data snapshot
  appointment_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  barber_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  total_price NUMERIC NOT NULL DEFAULT 0,
  original_status TEXT NOT NULL,
  payment_method TEXT,
  
  -- Deletion audit data
  deleted_by TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deletion_reason TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_deletions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view deletions from their units"
  ON public.appointment_deletions
  FOR SELECT
  USING (user_owns_unit(unit_id));

CREATE POLICY "Users can create deletions in their units"
  ON public.appointment_deletions
  FOR INSERT
  WITH CHECK (user_owns_unit(unit_id));