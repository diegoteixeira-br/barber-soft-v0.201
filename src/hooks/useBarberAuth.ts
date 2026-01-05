import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export interface BarberProfile {
  id: string;
  name: string;
  email: string | null;
  photo_url: string | null;
  commission_rate: number;
  unit_id: string;
  company_id: string | null;
  is_active: boolean;
}

export interface PendingTerm {
  id: string;
  version: string;
  title: string;
  content: string;
}

export function useBarberAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [pendingTerm, setPendingTerm] = useState<PendingTerm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBarber, setIsBarber] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer fetching to avoid deadlock
          setTimeout(() => {
            checkBarberRole(session.user.id);
          }, 0);
        } else {
          setBarberProfile(null);
          setPendingTerm(null);
          setIsBarber(false);
          setIsLoading(false);
        }
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        checkBarberRole(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkBarberRole = async (userId: string) => {
    try {
      // Check if user has barber role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "barber")
        .single();

      if (!roleData) {
        setIsBarber(false);
        setIsLoading(false);
        return;
      }

      setIsBarber(true);

      // Fetch barber profile
      const { data: barber } = await supabase
        .from("barbers")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (barber) {
        setBarberProfile(barber as BarberProfile);
        
        // Check for pending term
        await checkPendingTerm(barber.id, barber.company_id);
      }
    } catch (error) {
      console.error("Error checking barber role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPendingTerm = async (barberId: string, companyId: string | null) => {
    if (!companyId) return;

    try {
      // Get active term for company
      const { data: activeTerm } = await supabase
        .from("partnership_terms")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .single();

      if (!activeTerm) {
        setPendingTerm(null);
        return;
      }

      // Check if barber already accepted this term
      const { data: acceptance } = await supabase
        .from("term_acceptances")
        .select("id")
        .eq("barber_id", barberId)
        .eq("term_id", activeTerm.id)
        .single();

      if (acceptance) {
        setPendingTerm(null);
      } else {
        setPendingTerm(activeTerm as PendingTerm);
      }
    } catch (error) {
      // No active term or error
      setPendingTerm(null);
    }
  };

  const acceptTerm = async (termId: string, contentSnapshot: string) => {
    if (!user || !barberProfile) {
      throw new Error("Usuário não autenticado");
    }

    const { error } = await supabase.from("term_acceptances").insert({
      barber_id: barberProfile.id,
      term_id: termId,
      user_id: user.id,
      ip_address: null, // Will be captured by edge function if needed
      user_agent: navigator.userAgent,
      commission_rate_snapshot: barberProfile.commission_rate,
      content_snapshot: contentSnapshot,
    });

    if (error) throw error;

    setPendingTerm(null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    barberProfile,
    pendingTerm,
    isLoading,
    isBarber,
    acceptTerm,
    signOut,
    refreshPendingTerm: () => {
      if (barberProfile) {
        checkPendingTerm(barberProfile.id, barberProfile.company_id);
      }
    },
  };
}