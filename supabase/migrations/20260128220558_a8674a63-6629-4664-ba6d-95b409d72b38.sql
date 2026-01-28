CREATE OR REPLACE FUNCTION public.sync_client_on_appointment_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
  updated_client_record RECORD;
  fidelity_enabled boolean;
  cuts_threshold integer;
  min_value numeric;
  owner_id uuid;
  should_count_loyalty boolean;
  is_new_status_completed boolean;
BEGIN
  -- Determine if this is a new completion using TG_OP
  IF TG_OP = 'INSERT' THEN
    is_new_status_completed := (NEW.status = 'completed');
  ELSE
    is_new_status_completed := (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed');
  END IF;

  IF is_new_status_completed THEN
    
    -- Only sync if phone is provided
    IF NEW.client_phone IS NOT NULL AND NEW.client_phone != '' THEN
      
      -- Check if client already exists
      SELECT * INTO client_record 
      FROM public.clients 
      WHERE unit_id = NEW.unit_id AND phone = NEW.client_phone;
      
      IF client_record IS NULL THEN
        -- Client doesn't exist: only create if NOT a dependent appointment
        IF NEW.is_dependent IS NOT TRUE THEN
          -- Create new client with appointment data
          INSERT INTO public.clients (company_id, unit_id, name, phone, birth_date, last_visit_at, total_visits, loyalty_cuts)
          VALUES (
            NEW.company_id,
            NEW.unit_id,
            NEW.client_name,
            NEW.client_phone,
            NEW.client_birth_date,
            NOW(),
            1,
            0
          )
          RETURNING * INTO client_record;
        END IF;
      ELSE
        -- Client exists: update visit stats (never overwrite name or birth_date)
        UPDATE public.clients
        SET 
          last_visit_at = NOW(),
          total_visits = COALESCE(total_visits, 0) + 1,
          updated_at = NOW()
        WHERE id = client_record.id;
      END IF;
      
      -- Handle fidelity program if client exists
      IF client_record IS NOT NULL THEN
        -- Get the owner_user_id from company
        SELECT owner_user_id INTO owner_id
        FROM public.companies
        WHERE id = NEW.company_id;
        
        -- Get fidelity settings including min_value
        SELECT 
          COALESCE(bs.fidelity_program_enabled, false),
          COALESCE(bs.fidelity_cuts_threshold, 10),
          COALESCE(bs.fidelity_min_value, 30.00)
        INTO fidelity_enabled, cuts_threshold, min_value
        FROM public.business_settings bs
        WHERE bs.user_id = owner_id;
        
        -- Determine if this appointment should count for loyalty
        -- Conditions: program enabled, value >= min_value, NOT a courtesy payment
        should_count_loyalty := (
          fidelity_enabled = true 
          AND cuts_threshold > 0
          AND NEW.total_price >= min_value
          AND (NEW.payment_method IS NULL OR NEW.payment_method NOT IN ('courtesy', 'fidelity_courtesy'))
        );
        
        -- If fidelity program conditions are met
        IF should_count_loyalty THEN
          -- Re-fetch client record to get the CURRENT loyalty_cuts value
          -- This is critical because we may have just created the client above
          SELECT * INTO updated_client_record
          FROM public.clients 
          WHERE id = client_record.id;
          
          -- Check if incrementing will reach threshold
          IF (COALESCE(updated_client_record.loyalty_cuts, 0) + 1) >= cuts_threshold THEN
            -- Credit courtesy and reset counter
            UPDATE public.clients
            SET 
              loyalty_cuts = 0,
              available_courtesies = COALESCE(available_courtesies, 0) + 1,
              total_courtesies_earned = COALESCE(total_courtesies_earned, 0) + 1,
              updated_at = NOW()
            WHERE id = client_record.id;
          ELSE
            -- Just increment loyalty cuts
            UPDATE public.clients
            SET 
              loyalty_cuts = COALESCE(loyalty_cuts, 0) + 1,
              updated_at = NOW()
            WHERE id = client_record.id;
          END IF;
        END IF;
      END IF;
      
    END IF;
      
  END IF;
  
  RETURN NEW;
END;
$function$;