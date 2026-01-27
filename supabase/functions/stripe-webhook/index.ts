import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // If webhook secret is configured, verify signature
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("Webhook signature verification failed", { error: String(err) });
        return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
          status: 400,
        });
      }
    } else {
      // For development, parse event without verification
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification (dev mode)");
    }

    logStep("Processing event", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan;
        const subscriptionId = session.subscription as string;

        logStep("Checkout completed", { companyId, plan, subscriptionId });

        if (companyId) {
          const { error } = await supabaseClient
            .from("companies")
            .update({
              plan_status: "active",
              plan_type: plan || "profissional",
              stripe_subscription_id: subscriptionId,
              updated_at: new Date().toISOString()
            })
            .eq("id", companyId);

          if (error) {
            logStep("Error updating company", { error: error.message });
          } else {
            logStep("Company updated to active");
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        logStep("Invoice paid", { subscriptionId });

        if (subscriptionId) {
          const { error } = await supabaseClient
            .from("companies")
            .update({
              plan_status: "active",
              updated_at: new Date().toISOString()
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            logStep("Error updating company", { error: error.message });
          } else {
            logStep("Company status confirmed active");
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        logStep("Invoice payment failed", { subscriptionId });

        if (subscriptionId) {
          const { error } = await supabaseClient
            .from("companies")
            .update({
              plan_status: "overdue",
              updated_at: new Date().toISOString()
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) {
            logStep("Error updating company", { error: error.message });
          } else {
            logStep("Company marked as overdue");
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        logStep("Subscription deleted", { subscriptionId });

        const { error } = await supabaseClient
          .from("companies")
          .update({
            plan_status: "cancelled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          logStep("Error updating company", { error: error.message });
        } else {
          logStep("Company marked as cancelled");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const status = subscription.status;

        logStep("Subscription updated", { subscriptionId, status });

        let planStatus = "active";
        if (status === "past_due") planStatus = "overdue";
        if (status === "canceled" || status === "unpaid") planStatus = "cancelled";

        const { error } = await supabaseClient
          .from("companies")
          .update({
            plan_status: planStatus,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          logStep("Error updating company", { error: error.message });
        } else {
          logStep("Company status updated", { planStatus });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
