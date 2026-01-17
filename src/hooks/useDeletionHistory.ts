import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUnit } from "@/contexts/UnitContext";
import { toast } from "@/hooks/use-toast";

interface DeletionHistoryFilters {
  startDate?: Date;
  endDate?: Date;
}

export interface DeletionRecord {
  id: string;
  unit_id: string;
  company_id: string | null;
  appointment_id: string;
  client_name: string;
  client_phone: string | null;
  barber_name: string;
  service_name: string;
  scheduled_time: string;
  total_price: number;
  original_status: string;
  payment_method: string | null;
  deleted_by: string;
  deleted_at: string;
  deletion_reason: string;
  created_at: string;
}

export function useDeletionHistory(filters?: DeletionHistoryFilters) {
  const { currentUnitId } = useCurrentUnit();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["deletion-history", currentUnitId, filters?.startDate?.toISOString(), filters?.endDate?.toISOString()],
    queryFn: async () => {
      if (!currentUnitId) return [];

      let queryBuilder = supabase
        .from("appointment_deletions")
        .select("*")
        .eq("unit_id", currentUnitId)
        .order("deleted_at", { ascending: false });

      if (filters?.startDate) {
        queryBuilder = queryBuilder.gte("deleted_at", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        queryBuilder = queryBuilder.lte("deleted_at", filters.endDate.toISOString());
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return data as DeletionRecord[];
    },
    enabled: !!currentUnitId,
  });

  // Calculate summary
  const summary = {
    totalCount: query.data?.length || 0,
    confirmedCount: query.data?.filter(r => r.original_status === "confirmed").length || 0,
    completedCount: query.data?.filter(r => r.original_status === "completed").length || 0,
    totalValue: query.data?.reduce((sum, r) => sum + Number(r.total_price), 0) || 0,
  };

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    summary,
  };
}
