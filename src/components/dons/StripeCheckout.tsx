"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { SITE_BASE } from "@/lib/url";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const BTN: React.CSSProperties = {
  width: "100%",
  marginTop: 20,
  padding: "16px 0",
  border: "none",
  borderRadius: 13,
  background: "#C9A227",
  color: "#141738",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 14px 30px rgba(201,162,39,.34)",
};

function CheckoutForm({
  amount,
  onSuccess,
  onBack,
}: {
  amount: number;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${SITE_BASE}/#dons` },
      redirect: "if_required",
    });

    if (stripeErr) {
      setError(stripeErr.message ?? "Une erreur est survenue.");
      setLoading(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { email: "never" } },
        }}
      />
      {error && (
        <p style={{ color: "#d32f2f", fontSize: 13, marginTop: 10 }}>{error}</p>
      )}
      <button type="submit" disabled={!stripe || loading} style={BTN}>
        {loading ? "Traitement en cours…" : `💛 Confirmer CHF ${amount}`}
      </button>
      <button
        type="button"
        onClick={onBack}
        style={{ marginTop: 12, background: "none", border: "none", color: "#6b6f86", fontSize: 13, cursor: "pointer", width: "100%" }}
      >
        ← Modifier le montant
      </button>
    </form>
  );
}

export default function StripeCheckout({
  amount,
  email,
  onSuccess,
  onBack,
}: {
  amount: number;
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError,   setFetchError]   = useState<string | null>(null);

  useEffect(() => {
    setClientSecret(null);
    setFetchError(null);
    if (amount < 1) return;

    fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, ...(email ? { email } : {}) }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) setClientSecret(d.clientSecret);
        else setFetchError(d.error ?? "Impossible d'initialiser le paiement.");
      })
      .catch(() => setFetchError("Erreur de connexion. Veuillez réessayer."));
  }, [amount, email]);

  if (fetchError) {
    return (
      <div>
        <p style={{ color: "#d32f2f", fontSize: 13 }}>{fetchError}</p>
        <button onClick={onBack} style={{ marginTop: 10, background: "none", border: "none", color: "#C9A227", fontWeight: 700, cursor: "pointer" }}>
          ← Retour
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "#6b6f86", fontSize: 14 }}>
        Chargement du formulaire de paiement…
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, locale: "fr", appearance: { theme: "stripe" } }}
    >
      <CheckoutForm amount={amount} onSuccess={onSuccess} onBack={onBack} />
    </Elements>
  );
}
