import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Target {
  phone: string;
  name: string;
}

interface RequestBody {
  message_template: string;
  targets: Target[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nMarketingUrl = Deno.env.get("N8N_MARKETING_URL");

    if (!n8nMarketingUrl) {
      console.error("N8N_MARKETING_URL not configured");
      return new Response(
        JSON.stringify({ error: "Webhook de marketing não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} sending marketing campaign`);

    // Get the user's company to retrieve evolution_instance_name
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("evolution_instance_name")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (companyError) {
      console.error("Error fetching company:", companyError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar empresa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!company?.evolution_instance_name) {
      console.error("Company has no evolution_instance_name configured");
      return new Response(
        JSON.stringify({ error: "Instância do WhatsApp não configurada. Vá em Configurações > Integrações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { message_template, targets } = body;

    if (!message_template || !targets || targets.length === 0) {
      console.error("Invalid request body:", body);
      return new Response(
        JSON.stringify({ error: "Dados inválidos. Forneça message_template e targets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending campaign to ${targets.length} targets via n8n webhook`);

    // Build payload for n8n
    const n8nPayload = {
      instance_name: company.evolution_instance_name,
      message_template,
      targets,
    };

    // Send to n8n webhook
    const n8nResponse = await fetch(n8nMarketingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("n8n webhook error:", n8nResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar para o webhook de marketing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Campaign sent successfully to n8n");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Campanha enviada para ${targets.length} contato(s)` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
