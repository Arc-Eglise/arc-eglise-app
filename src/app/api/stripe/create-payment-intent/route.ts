import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  let body: { amount?: number; currency?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { amount, email } = body;

  if (!amount || typeof amount !== "number" || amount < 1 || amount > 100_000) {
    return NextResponse.json({ error: "Montant invalide (min CHF 1, max CHF 100 000)" }, { status: 400 });
  }

  // Stripe travaille en centimes
  const amountCents = Math.round(amount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "chf",
    automatic_payment_methods: { enabled: true },
    metadata: {
      source: "arc-eglise-web",
      ...(email ? { donor_email: email } : {}),
    },
    ...(email
      ? {
          receipt_email: email,
          description: `Don ARC Église — CHF ${amount}`,
        }
      : {}),
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
