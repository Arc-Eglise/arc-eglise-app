"use client";

import { useState } from "react";

const AMOUNTS = ["10", "25", "50", "100"];
const CUSTOM = "Autre";

const IMPACTS = [
  { icon: "📖", title: "Bibliothèque spirituelle", desc: "Vos dons financent l'achat de Bibles et de matériel d'étude pour les nouveaux membres.", pct: 78 },
  { icon: "🌍", title: "Missions & Évangélisation", desc: "Soutenir nos équipes qui partent en mission dans les nations pour partager l'Évangile.", pct: 62 },
  { icon: "🏠", title: "Lieu de culte", desc: "Maintenance et amélioration de notre espace d'accueil pour toute la communauté.", pct: 45 },
];

export default function DonSection() {
  const [selected, setSelected] = useState("25");
  const [custom, setCustom]     = useState("");
  const [freq, setFreq]         = useState<"unique" | "mensuel">("unique");

  return (
    <section id="dons" className="py-24" style={{ background: "linear-gradient(135deg,#0a0d2e 0%,#1e2464 60%,#0f123a 100%)" }}>
      <div className="max-w-8xl mx-auto px-5 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-[72px] items-center">

          {/* Impact (left on large) */}
          <div className="order-2 lg:order-1 flex flex-col gap-7">
            <div>
              <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[3px] uppercase text-arc-gold mb-4">
                <span className="w-5 h-px bg-arc-gold" />
                Votre impact
              </div>
              <h2 className="font-serif text-[38px] md:text-[44px] font-bold text-white leading-[1.15] mb-4">
                Chaque don construit<br />le Royaume
              </h2>
              <p className="text-base text-white/70 leading-relaxed">
                Vos contributions soutiennent directement la mission de l'ARC : l'évangélisation, la formation et l'aide aux familles dans le besoin.
              </p>
            </div>

            {IMPACTS.map((item) => (
              <div key={item.title} className="flex gap-[18px] items-start">
                <div className="w-14 h-14 rounded-[14px] bg-white/8 border border-white/10 flex items-center justify-center text-[22px] flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold text-white mb-1">{item.title}</div>
                  <div className="text-[13px] text-white/60 leading-[1.7]">{item.desc}</div>
                  <div className="h-1 bg-white/10 rounded-sm mt-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${item.pct}%`,
                        background: "linear-gradient(90deg,#8899cc,#d4a843)",
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-white/40 mt-1">{item.pct}% de l'objectif atteint</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form (right on large) */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-[22px] p-8 md:p-[38px] border border-arc-border shadow-arc">

              <h3 className="font-serif text-2xl font-bold text-arc-navy mb-6">Faire un don</h3>

              {/* Frequency */}
              <div className="flex rounded-xl overflow-hidden border border-arc-border mb-5">
                {(["unique", "mensuel"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFreq(f)}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${
                      freq === f
                        ? "bg-arc-navy text-white"
                        : "bg-arc-bg text-arc-text2 hover:bg-arc-blueBg"
                    }`}
                  >
                    {f === "unique" ? "Don unique" : "Don mensuel 🔄"}
                  </button>
                ))}
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-4 gap-2.5 mb-3.5">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setSelected(a); setCustom(""); }}
                    className={`py-3.5 rounded-[10px] border-[1.5px] text-base font-black transition-all duration-200 ${
                      selected === a
                        ? "border-arc-navy bg-arc-blueBg text-arc-navy"
                        : "border-arc-border bg-arc-bg text-arc-navy hover:border-arc-navy hover:bg-arc-blueBg"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <input
                type="number"
                min="1"
                placeholder="Montant personnalisé (CHF)"
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setSelected(""); }}
                className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-arc-border bg-arc-bg text-sm font-sans text-arc-text outline-none focus:border-arc-navy focus:bg-white transition-colors mb-5"
              />

              {/* Payment methods */}
              <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-2">
                Mode de paiement
              </label>
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                {[
                  { icon: "📱", label: "TWINT" },
                  { icon: "💳", label: "Carte" },
                  { icon: "🏦", label: "PostFinance" },
                ].map((p, i) => (
                  <button
                    key={p.label}
                    className={`py-3.5 px-2 rounded-[10px] border-[1.5px] text-center transition-all duration-200 ${
                      i === 0
                        ? "border-arc-navy bg-arc-blueBg"
                        : "border-arc-border bg-arc-bg hover:border-arc-navy hover:bg-arc-blueBg"
                    }`}
                  >
                    <div className="text-[22px] mb-0.5">{p.icon}</div>
                    <div className="text-[10px] font-bold text-arc-navy">{p.label}</div>
                  </button>
                ))}
              </div>

              {/* Email */}
              <label className="block text-[10px] font-bold uppercase tracking-[0.8px] text-arc-blue mb-1.5">
                Email (reçu fiscal)
              </label>
              <input
                type="email"
                placeholder="votre@email.ch"
                className="w-full px-4 py-3 rounded-[10px] border-[1.5px] border-arc-border bg-arc-bg text-sm font-sans text-arc-text outline-none focus:border-arc-navy focus:bg-white transition-colors mb-5"
              />

              <button className="w-full py-4 rounded-[11px] bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 hover:-translate-y-0.5 hover:shadow-arc transition-all duration-300">
                💛 Donner {custom || selected ? `CHF ${custom || selected}` : ""} maintenant
              </button>

              <p className="text-center text-[11px] text-arc-text3 mt-3">
                🔒 Paiement sécurisé · Reçu fiscal envoyé par email
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
