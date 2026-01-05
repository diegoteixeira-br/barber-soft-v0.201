-- Add send time configuration to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS automation_send_hour integer DEFAULT 11,
ADD COLUMN IF NOT EXISTS automation_send_minute integer DEFAULT 30;

-- Add check constraints for valid time values
ALTER TABLE public.business_settings
ADD CONSTRAINT valid_send_hour CHECK (automation_send_hour >= 0 AND automation_send_hour <= 23),
ADD CONSTRAINT valid_send_minute CHECK (automation_send_minute >= 0 AND automation_send_minute <= 59);

-- Create automation_logs table to track sent automations and avoid duplicates
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  automation_type TEXT NOT NULL CHECK (automation_type IN ('birthday', 'rescue')),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient duplicate checking (same client, same type, same day)
CREATE INDEX idx_automation_logs_lookup ON public.automation_logs (company_id, automation_type, client_id, sent_at);

-- Create index for daily queries
CREATE INDEX idx_automation_logs_sent_at ON public.automation_logs (sent_at);

-- Enable RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_logs
CREATE POLICY "Users can view their company automation logs"
ON public.automation_logs
FOR SELECT
USING (public.user_owns_company(company_id));

CREATE POLICY "Users can insert automation logs for their company"
ON public.automation_logs
FOR INSERT
WITH CHECK (public.user_owns_company(company_id));

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;