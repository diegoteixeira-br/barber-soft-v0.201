import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { barberId, email, name, redirectUrl } = await req.json();

    if (!barberId || !email || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: barberId, email, name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Inviting barber: ${name} (${email})`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // User exists, just link them
      userId = existingUser.id;
      console.log(`User already exists: ${userId}`);
    } else {
      // Create new user with invite
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: redirectUrl || `${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/auth/barber`,
          data: {
            name,
            role: 'barber',
          },
        }
      );

      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log(`Created new user: ${userId}`);
    }

    // Add barber role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "barber" },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      console.error("Error adding role:", roleError);
      // Don't throw, continue to link barber
    }

    // Link user_id to barber
    const { error: updateError } = await supabaseAdmin
      .from("barbers")
      .update({ user_id: userId, email })
      .eq("id", barberId);

    if (updateError) {
      console.error("Error updating barber:", updateError);
      throw updateError;
    }

    console.log(`Successfully linked user ${userId} to barber ${barberId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: existingUser 
          ? "Usuário já existia, vinculado ao profissional" 
          : "Convite enviado por email"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in invite-barber:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});