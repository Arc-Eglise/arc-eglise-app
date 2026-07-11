"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Smartphone, CreditCard, Landmark, Lock } from "lucide-react";
import Icon, { type IconName } from "@/components/ui/Icon";

const StripeCheckout = dynamic(() => import("@/components/dons/StripeCheckout"), { ssr: false });

const AMOUNTS = ["10", "25", "50", "100"];

const PROJECTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "la-parole",        title: "Bibliothèque spirituelle", text: "Vos dons financent l'achat de Bibles et de matériel d'étude pour les nouveaux membres." },
  { icon: "rejoindre-famille", title: "Missions & Évangélisation", text: "Soutenir nos équipes qui partent en mission dans les nations pour partager l'Évangile." },
  { icon: "lieu-de-culte",    title: "Lieu de culte",            text: "Maintenance et amélioration de notre espace d'accueil pour toute la communauté." },
];

const PAYMENTS = [
  { icon: <Smartphone size={20} strokeWidth={2} color="#1e2464" />, label: "TWINT" },
  { icon: <CreditCard  size={20} strokeWidth={2} color="#1e2464" />, label: "Carte" },
  { icon: <Landmark    size={20} strokeWidth={2} color="#1e2464" />, label: "Virement" },
];

type Step = "form" | "stripe" | "success";

export default function DonSection({
  intro,
  twintNumero,
  donIban,
}: {
  intro?: string;
  twintNumero?: string | null;
  donIban?: string | null;
}) {
  const [selected, setSelected] = useState("25");
  const [custom,   setCustom]   = useState("");
  const [payment,  setPayment]  = useState("TWINT");
  const [email,    setEmail]    = useState("");
  const [step,     setStep]     = useState<Step>("form");

  const amount    = Number(custom || selected) || 0;
  const amountFmt = amount > 0 ? `CHF ${amount}` : "CHF 0";

  const handleDon = () => {
    if (amount < 1) return;
    if (payment === "Carte") {
      setStep("stripe");
    } else {
      setStep("success");
    }
  };

  return (
    <section id="dons" style={{ maxWidth: 1240, margin: "0 auto", padding: "96px 32px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 52px" }}>
        <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 14 }}>
          Votre impact
        </div>
        <h2 className="font-serif" style={{ fontWeight: 600, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.07, color: "#1e2464", marginBottom: 16 }}>
          Chaque don construit{" "}
          <span style={{ fontStyle: "italic", color: "#C9A227" }}>le Royaume</span>
        </h2>
        <p style={{ fontSize: 16, color: "#6b6f86", lineHeight: 1.7 }}>
          {intro ?? "Vos contributions soutiennent directement la mission de l'ARC : l'évangélisation, la formation et l'aide aux familles dans le besoin."}
        </p>
      </div>

      {/* Two-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr .92fr", gap: 40, alignItems: "start" }} className="arc-two">

        {/* Projects left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {PROJECTS.map((p) => (
            <div
              key={p.title}
              style={{ background: "#fff", border: "1px solid rgba(30,36,100,.12)", borderRadius: 18, padding: 24, display: "flex", gap: 18, alignItems: "center" }}
            >
              <Icon name={p.icon} variant="tile" size={56} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="font-serif" style={{ fontSize: 21, fontWeight: 600, color: "#1e2464" }}>{p.title}</div>
                <div style={{ fontSize: 13, color: "#6b6f86", lineHeight: 1.5, margin: "4px 0 0" }}>{p.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right card */}
        <div style={{ background: "#fff", border: "1px solid rgba(30,36,100,.12)", borderRadius: 24, padding: 32, boxShadow: "0 24px 56px rgba(20,23,56,.1)" }}>

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <div>
              <Icon name="dons-paiements" variant="tile" size={52} style={{ display: "block", margin: "0 auto 16px" }} />
              <h3 className="font-serif" style={{ fontSize: 24, fontWeight: 600, color: "#1e2464", textAlign: "center", marginBottom: 6 }}>
                Merci pour votre don !
              </h3>
              <p style={{ color: "#6b6f86", fontSize: 14, textAlign: "center", marginBottom: 22 }}>
                {amountFmt} · {payment}
              </p>
              {payment === "TWINT" && (
                <div style={{ background: "rgba(201,162,39,.08)", border: "1.5px solid #C9A227", borderRadius: 13, padding: 18, fontSize: 13.5, color: "#1e2464", lineHeight: 1.8 }}>
                  <strong>TWINT :</strong>{" "}
                  {twintNumero
                    ? <>{twintNumero}</>
                    : <>Coordonnées disponibles à l'église ou via <a href="#contact" style={{ color: "#C9A227", fontWeight: 700 }}>notre formulaire</a>.</>
                  }<br />
                  <span style={{ color: "#6b6f86" }}>Référence : ARC-DON{email ? ` · ${email}` : ""}</span>
                </div>
              )}
              {payment === "Virement" && (
                <div style={{ background: "rgba(201,162,39,.08)", border: "1.5px solid #C9A227", borderRadius: 13, padding: 18, fontSize: 13.5, color: "#1e2464", lineHeight: 1.8 }}>
                  <strong>Virement bancaire :</strong><br />
                  {donIban
                    ? <>{donIban}</>
                    : <>Coordonnées disponibles via <a href="#contact" style={{ color: "#C9A227", fontWeight: 700 }}>notre formulaire de contact</a>.</>
                  }<br />
                  <span style={{ color: "#6b6f86" }}>Référence : ARC-DON{email ? ` · ${email}` : ""}</span>
                </div>
              )}
              <button
                onClick={() => setStep("form")}
                style={{ marginTop: 18, background: "none", border: "none", color: "#C9A227", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "block", margin: "18px auto 0" }}
              >
                ← Faire un autre don
              </button>
            </div>
          )}

          {/* ── STRIPE CHECKOUT ── */}
          {step === "stripe" && (
            <div>
              <h3 className="font-serif" style={{ fontSize: 22, fontWeight: 600, color: "#1e2464", marginBottom: 4 }}>
                Paiement sécurisé
              </h3>
              <p style={{ color: "#6b6f86", fontSize: 13.5, marginBottom: 20 }}>
                Don de <strong style={{ color: "#1e2464" }}>{amountFmt}</strong> — paiement par carte bancaire
              </p>
              <StripeCheckout
                amount={amount}
                email={email}
                onSuccess={() => setStep("success")}
                onBack={() => setStep("form")}
              />
            </div>
          )}

          {/* ── FORM ── */}
          {step === "form" && (
            <>
              <h3 className="font-serif" style={{ fontSize: 27, fontWeight: 600, color: "#1e2464", marginBottom: 22 }}>Faire un don</h3>

              {/* Amounts */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setSelected(a); setCustom(""); }}
                    style={{
                      padding: "16px 0", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer",
                      background: selected === a && !custom ? "rgba(30,36,100,.08)" : "#fff",
                      color: "#1e2464",
                      border: `1.5px solid ${selected === a && !custom ? "#C9A227" : "rgba(30,36,100,.15)"}`,
                      transition: "all .15s",
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <input
                type="number" min="1" placeholder="Autre montant (CHF)"
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setSelected(""); }}
                style={{ width: "100%", padding: "14px 16px", border: "1.5px solid rgba(30,36,100,.12)", borderRadius: 12, fontSize: 15, marginBottom: 22, color: "#1a1c2e", boxSizing: "border-box", outline: "none" }}
              />

              {/* Payment method */}
              <div style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "#6b6f86", fontWeight: 700, marginBottom: 10 }}>
                Mode de paiement
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 22 }}>
                {PAYMENTS.map((pm) => (
                  <button
                    key={pm.label}
                    onClick={() => setPayment(pm.label)}
                    style={{
                      padding: "14px 6px", borderRadius: 12, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      fontSize: 12.5, fontWeight: 600,
                      background: payment === pm.label ? "rgba(30,36,100,.08)" : "#fff",
                      color: "#1e2464",
                      border: `1.5px solid ${payment === pm.label ? "#C9A227" : "rgba(30,36,100,.15)"}`,
                      transition: "all .15s",
                    }}
                  >
                    {pm.icon}
                    {pm.label}
                  </button>
                ))}
              </div>

              <input
                type="email" placeholder="Email (reçu fiscal, optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "14px 16px", border: "1.5px solid rgba(30,36,100,.12)", borderRadius: 12, fontSize: 15, marginBottom: 18, color: "#1a1c2e", boxSizing: "border-box" }}
              />

              <button
                onClick={handleDon}
                disabled={amount < 1}
                style={{
                  width: "100%", padding: 17, border: "none", borderRadius: 13,
                  background: amount < 1 ? "#ccc" : "#C9A227",
                  color: "#141738", fontWeight: 800, fontSize: 16, cursor: amount < 1 ? "default" : "pointer",
                  boxShadow: amount < 1 ? "none" : "0 14px 30px rgba(201,162,39,.34)",
                  transition: "opacity .15s",
                }}
                className="arc-don-btn"
              >
                Donner {amountFmt}{payment === "Carte" ? " par carte" : ""}
              </button>

              <div style={{ textAlign: "center", fontSize: 12, color: "#6b6f86", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <Lock size={12} color="#6b6f86" />
                {payment === "Carte"
                  ? "Paiement sécurisé par Stripe · SSL 256-bit"
                  : "Transaction sécurisée · Reçu fiscal sur demande"}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) { .arc-two { grid-template-columns: 1fr !important; } }
        .arc-don-btn:hover { opacity: .88; }
      `}</style>
    </section>
  );
}
