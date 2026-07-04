"use client";

const TICKER = [
  "PROCHAIN CULTE DIRECT : Dim 09h30 →",
  "Soirée Gospel & Dîner · Sam 27 juin",
  "18 personnes en ligne maintenant",
  "600+ personnes touchées",
  "Bienvenue à l'ARC — venez tels que vous êtes",
  "Prière & Parole · Mer 19h00",
];

export default function AnnouncementBar() {
  const items = [...TICKER, ...TICKER];
  return (
    <div
      style={{ background: "#141738", overflow: "hidden", fontSize: 13, letterSpacing: ".04em" }}
      aria-hidden="true"
    >
      <div className="animate-marquee" style={{ gap: 48, padding: "9px 0", whiteSpace: "nowrap", width: "max-content" }}>
        {items.map((t, i) => (
          <span
            key={i}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.85)", flexShrink: 0 }}
          >
            <span
              className="animate-pulse2"
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A227", display: "inline-block" }}
            />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
