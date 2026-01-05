-- Add email and user_id columns to barbers table
ALTER TABLE public.barbers
ADD COLUMN email TEXT,
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create unique constraint on email per company
CREATE UNIQUE INDEX barbers_email_company_unique ON public.barbers(email, company_id) WHERE email IS NOT NULL;

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'barber');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage roles"
ON public.user_roles
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create partnership_terms table (versions of terms)
CREATE TABLE public.partnership_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (company_id, version)
);

-- Enable RLS on partnership_terms
ALTER TABLE public.partnership_terms ENABLE ROW LEVEL SECURITY;

-- RLS policies for partnership_terms
CREATE POLICY "Owners can manage their company terms"
ON public.partnership_terms
FOR ALL
USING (user_owns_company(company_id));

CREATE POLICY "Barbers can view active terms from their company"
ON public.partnership_terms
FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.user_id = auth.uid()
    AND b.company_id = partnership_terms.company_id
  )
);

-- Create term_acceptances table (acceptance records with audit data)
CREATE TABLE public.term_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  term_id UUID REFERENCES public.partnership_terms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  commission_rate_snapshot INTEGER NOT NULL,
  content_snapshot TEXT NOT NULL,
  UNIQUE (barber_id, term_id)
);

-- Enable RLS on term_acceptances
ALTER TABLE public.term_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS policies for term_acceptances
CREATE POLICY "Barbers can view their own acceptances"
ON public.term_acceptances
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Barbers can create their own acceptances"
ON public.term_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can view acceptances from their company"
ON public.term_acceptances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbers b
    JOIN public.companies c ON b.company_id = c.id
    WHERE b.id = term_acceptances.barber_id
    AND c.owner_user_id = auth.uid()
  )
);

-- Function to get barber by user_id
CREATE OR REPLACE FUNCTION public.get_barber_by_user_id(_user_id uuid)
RETURNS public.barbers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.barbers WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if barber has pending term
CREATE OR REPLACE FUNCTION public.barber_has_pending_term(_barber_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partnership_terms pt
    JOIN public.barbers b ON b.company_id = pt.company_id
    WHERE b.id = _barber_id
    AND pt.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.term_acceptances ta
      WHERE ta.barber_id = _barber_id
      AND ta.term_id = pt.id
    )
  )
$$;