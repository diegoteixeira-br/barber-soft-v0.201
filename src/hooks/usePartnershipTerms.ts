import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PartnershipTerm {
  id: string;
  company_id: string;
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export interface TermAcceptance {
  id: string;
  barber_id: string;
  term_id: string;
  user_id: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  commission_rate_snapshot: number;
  content_snapshot: string;
}

export function usePartnershipTerms(companyId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ["partnership-terms", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("partnership_terms")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PartnershipTerm[];
    },
    enabled: !!companyId,
  });

  const activeTerm = terms.find((t) => t.is_active) || null;

  const createTerm = useMutation({
    mutationFn: async (term: Omit<PartnershipTerm, "id" | "created_at" | "created_by">) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("partnership_terms")
        .insert({
          ...term,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnership-terms"] });
      toast({ title: "Termo criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar termo", description: error.message, variant: "destructive" });
    },
  });

  const updateTerm = useMutation({
    mutationFn: async ({ id, ...term }: Partial<PartnershipTerm> & { id: string }) => {
      const { data, error } = await supabase
        .from("partnership_terms")
        .update(term)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnership-terms"] });
      toast({ title: "Termo atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar termo", description: error.message, variant: "destructive" });
    },
  });

  const activateTerm = useMutation({
    mutationFn: async (termId: string) => {
      if (!companyId) throw new Error("Company ID required");

      // Deactivate all terms first
      await supabase
        .from("partnership_terms")
        .update({ is_active: false })
        .eq("company_id", companyId);

      // Activate the selected term
      const { data, error } = await supabase
        .from("partnership_terms")
        .update({ is_active: true })
        .eq("id", termId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnership-terms"] });
      toast({ title: "Termo ativado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao ativar termo", description: error.message, variant: "destructive" });
    },
  });

  const deleteTerm = useMutation({
    mutationFn: async (termId: string) => {
      const { error } = await supabase
        .from("partnership_terms")
        .delete()
        .eq("id", termId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnership-terms"] });
      toast({ title: "Termo removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover termo", description: error.message, variant: "destructive" });
    },
  });

  return {
    terms,
    activeTerm,
    isLoading,
    createTerm,
    updateTerm,
    activateTerm,
    deleteTerm,
  };
}

export function useTermAcceptances(companyId: string | null) {
  const { data: acceptances = [], isLoading } = useQuery({
    queryKey: ["term-acceptances", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("term_acceptances")
        .select(`
          *,
          barbers!inner(name, company_id),
          partnership_terms!inner(version, title)
        `)
        .eq("barbers.company_id", companyId)
        .order("accepted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  return { acceptances, isLoading };
}