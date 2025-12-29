-- Add evolution_api_key column to units table for storing instance token
ALTER TABLE public.units 
ADD COLUMN evolution_api_key text;