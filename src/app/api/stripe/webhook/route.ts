import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET manquant");
    return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signature invalide";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const amountCHF = (pi.amount / 100).toFixed(2);
    console.log(`[stripe/webhook] Don reçu : CHF ${amountCHF} (${pi.id})`);

    const admin = createAdminClient();
    const { error } = await admin.from("donations").upsert({
      stripe_pi_id:   pi.id,
      amount_cents:   pi.amount,
      currency:       pi.currency,
      donor_email:    pi.receipt_email ?? (pi.metadata?.email ?? null),
      donor_name:     pi.metadata?.name ?? null,
      stripe_payload: event.data.object,
    }, { onConflict: "stripe_pi_id" });

    if (error) {
      console.error("[stripe/webhook] Échec enregistrement don:", error.message);
    }

    // Notif au donateur (si compte trouvé)
    const donorEmail = pi.receipt_email ?? pi.metadata?.email;
    if (donorEmail) {
      const { data: donor } = await admin
        .from("profiles").select("id").eq("email", donorEmail).maybeSingle();
      if (donor?.id) {
        await admin.from("notifications").insert({
          user_id: donor.id, type: "don",
          title:   `💝 Don reçu — merci !`,
          body:    `CHF ${amountCHF} reçu. Que Dieu bénisse ton offrande généreuse.`,
          link:    "/espace-membres",
        });
      }
    }

    // Notif aux admins/finance
    const { data: adminUsers } = await admin
      .from("profiles")
      .select("id")
      .or("role.in.(admin,pasteur),groups.cs.{finance}")
      .eq("validated", true)
      .limit(20);
    if (adminUsers?.length) {
      const donorName = pi.metadata?.name ?? donorEmail ?? "Donateur anonyme";
      await admin.from("notifications").insert(
        adminUsers.map((a: { id: string }) => ({
          user_id: a.id, type: "don",
          title:   `💝 Nouveau don : CHF ${amountCHF}`,
          body:    donorName,
          link:    "/admin",
        }))
      );
    }
  }

  return NextResponse.json({ received: true });
}
