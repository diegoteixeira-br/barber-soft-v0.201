-- 1. Adicionar política DELETE na tabela companies
CREATE POLICY "Users can delete their own companies"
ON public.companies
FOR DELETE
USING (auth.uid() = owner_user_id);

-- 2. Reforçar função user_owns_unit com verificação explícita de autenticação
CREATE OR REPLACE FUNCTION public.user_owns_unit(unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.units
    WHERE id = unit_id 
    AND user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  )
$$;