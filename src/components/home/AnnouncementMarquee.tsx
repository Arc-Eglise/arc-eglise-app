"use client";

export default function AnnouncementMarquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div
      style={{ background: "#141738", overflow: "hidden", fontSize: 13, letterSpacing: ".04em" }}
      aria-hidden="true"
    >
      <div className="animate-marquee" style={{ gap: 48, padding: "9px 0", whiteSpace: "nowrap", width: "max-content" }}>
        {doubled.map((t, i) => (
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
