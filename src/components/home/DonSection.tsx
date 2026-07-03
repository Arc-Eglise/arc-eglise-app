"use client";

import { useState } from "react";

const AMOUNTS = ["10", "25", "50", "100"];

const PROJECTS = [
  { icon: "📖", title: "Bibliothèque spirituelle", text: "Vos dons financent l'achat de Bibles et de matériel d'étude pour les nouveaux membres.", pct: 78 },
  { icon: "🌍", title: "Missions & Évangélisation", text: "Soutenir nos équipes qui partent en mission dans les nations pour partager l'Évangile.", pct: 62 },
  { icon: "🏠", title: "Lieu de culte", text: "Maintenance et amélioration de notre espace d'accueil pour toute la communauté.", pct: 45 },
];

const PAYMENTS = [
  { icon: "📱", label: "TWINT" },
  { icon: "💳", label: "Carte" },
  { icon: "🏦", label: "PostFinance" },
];

export default function DonSection() {
  const [selected, setSelected] = useState("25");
  const [custom, setCustom]     = useState("");
  const [freq, setFreq]         = useState<"unique" | "mensuel">("unique");
  const [payment, setPayment]   = useState("TWINT");
  const [emailDon, setEmailDon] = useState("");
  const [donSent,  setDonSent]  = useState(false);

  const effAmount = custom || selected;

  const handleDon = () => {
    if (!effAmount || Number(effAmount) <= 0) return;
    setDonSent(true);
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
          Vos contributions soutiennent directement la mission de l'ARC : l'évangélisation, la formation et l'aide aux familles dans le besoin.
        </p>
      </div>

      {/* Two-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr .92fr", gap: 40, alignItems: "start" }} className="arc-two">

        {/* Projects left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {PROJECTS.map((p) => (
            <div
              key={p.title}
              style={{
                background: "#fff",
                border: "1px solid rgba(30,36,100,.12)",
                borderRadius: 18,
                padding: 24,
                display: "flex",
                gap: 18,
                alignItems: "center",
              }}
            >
              <div style={{ width: 58, height: 58, borderRadius: 14, background: "rgba(30,36,100,.07)", display: "grid", placeItems: "center", fontSize: 26, flexShrink: 0 }}>
                {p.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-serif" style={{ fontSize: 21, fontWeight: 600, color: "#1e2464" }}>{p.title}</div>
                <div style={{ fontSize: 13, color: "#6b6f86", lineHeight: 1.5, margin: "4px 0 12px" }}>{p.text}</div>
                <div style={{ height: 8, background: "rgba(30,36,100,.08)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, background: "linear-gradient(90deg,#C9A227,#E6C763)", borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 12, color: "#C9A227", fontWeight: 700, marginTop: 7 }}>{p.pct}% de l'objectif atteint</div>
              </div>
            </div>
          ))}

          {/* Impact banner */}
          <div style={{ background: "#141738", color: "#fff", borderRadius: 18, padding: 24, display: "flex", alignItems: "center", gap: 18 }}>
            <div className="font-serif" style={{ fontSize: 42, fontWeight: 700, color: "#E6C763", lineHeight: 1 }}>600+</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>
              vies déjà touchées grâce à votre générosité depuis 2018.
            </div>
          </div>
        </div>

        {/* Form right */}
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(30,36,100,.12)",
            borderRadius: 24,
            padding: 32,
            boxShadow: "0 24px 56px rgba(20,23,56,.1)",
          }}
        >
          <h3 className="font-serif" style={{ fontSize: 27, fontWeight: 600, color: "#1e2464", marginBottom: 22 }}>Faire un don</h3>

          {/* Frequency toggle */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "rgba(30,36,100,.06)", padding: 5, borderRadius: 13, marginBottom: 22 }}>
            {(["unique", "mensuel"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFreq(f)}
                style={{
                  padding: 12, border: "none", borderRadius: 9,
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  background: freq === f ? "#fff" : "transparent",
                  color: freq === f ? "#1e2464" : "#6b6f86",
                  boxShadow: freq === f ? "0 2px 8px rgba(20,23,56,.12)" : "none",
                  transition: "all .15s",
                }}
              >
                {f === "unique" ? "Don unique" : "Don mensuel 🔄"}
              </button>
            ))}
          </div>

          {/* Amounts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => { setSelected(a); setCustom(""); }}
                style={{
                  padding: "16px 0",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
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

          {/* Custom */}
          <input
            type="number"
            min="1"
            placeholder="Autre montant (CHF)"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setSelected(""); }}
            style={{ width: "100%", padding: "14px 16px", border: "1.5px solid rgba(30,36,100,.12)", borderRadius: 12, fontSize: 15, marginBottom: 22, color: "#1a1c2e", boxSizing: "border-box", outline: "none" }}
          />

          {/* Payment */}
          <div style={{ fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: "#6b6f86", fontWeight: 700, marginBottom: 10 }}>
            Mode de paiement
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 22 }}>
            {PAYMENTS.map((pm) => (
              <button
                key={pm.label}
                onClick={() => setPayment(pm.label)}
                style={{
                  padding: "14px 6px",
                  borderRadius: 12,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  background: payment === pm.label ? "rgba(30,36,100,.08)" : "#fff",
                  color: "#1e2464",
                  border: `1.5px solid ${payment === pm.label ? "#C9A227" : "rgba(30,36,100,.15)"}`,
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 20 }}>{pm.icon}</span>
                {pm.label}
              </button>
            ))}
          </div>

          {/* Email */}
          <input
            type="email"
            placeholder="Email (reçu fiscal)"
            value={emailDon}
            onChange={(e) => setEmailDon(e.target.value)}
            style={{ width: "100%", padding: "14px 16px", border: "1.5px solid rgba(30,36,100,.12)", borderRadius: 12, fontSize: 15, marginBottom: 18, color: "#1a1c2e", boxSizing: "border-box" }}
          />

          {donSent ? (
            <div style={{ background: "rgba(201,162,39,.1)", border: "1.5px solid #C9A227", borderRadius: 13, padding: 20 }}>
              <div style={{ fontWeight: 800, color: "#1e2464", fontSize: 16, marginBottom: 10 }}>
                💛 Merci pour votre don de CHF {effAmount} !
              </div>
              <div style={{ fontSize: 13.5, color: "#6b6f86", lineHeight: 1.7 }}>
                Pour finaliser votre don, utilisez l'un de ces moyens :<br />
                <strong style={{ color: "#1e2464" }}>TWINT :</strong> scannez le QR code à l'église ou contactez-nous<br />
                <strong style={{ color: "#1e2464" }}>Virement :</strong> IBAN CH56 0076 2011 6238 5295 7<br />
                <strong style={{ color: "#1e2464" }}>Référence :</strong> ARC-DON{freq === "mensuel" ? "-MENSUEL" : ""}{emailDon ? ` · ${emailDon}` : ""}
              </div>
              <button
                onClick={() => setDonSent(false)}
                style={{ marginTop: 14, background: "none", border: "none", color: "#C9A227", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                ← Modifier le montant
              </button>
            </div>
          ) : (
            <button
              onClick={handleDon}
              style={{
                width: "100%",
                padding: 17,
                border: "none",
                borderRadius: 13,
                background: "#C9A227",
                color: "#141738",
                fontWeight: 800,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 14px 30px rgba(201,162,39,.34)",
                transition: "opacity .15s",
              }}
              className="arc-don-btn"
            >
              💛 Donner CHF {effAmount || "0"}{freq === "mensuel" ? " / mois" : " maintenant"}
            </button>
          )}

          <div style={{ textAlign: "center", fontSize: 12, color: "#6b6f86", marginTop: 14 }}>
            🔒 Paiement sécurisé · Reçu fiscal envoyé par email
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .arc-two { grid-template-columns: 1fr !important; }
        }
        .arc-don-btn:hover { opacity: .88; }
      `}</style>
    </section>
  );
}
