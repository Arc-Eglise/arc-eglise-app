import { createClient } from "@/lib/supabase/server";
import type { Sermon }   from "@/lib/supabase/types";
import SermonsClient     from "./SermonsClient";

export default async function SermonsSection() {
  const supabase = createClient();

  const { data: sermons } = await supabase
    .from("sermons")
    .select("*")
    .eq("is_published", true)
    .order("date", { ascending: false })
    .limit(10);

  return (
    <section id="sermons" style={{ background: "#141738", color: "#fff", padding: "96px 0" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 32px" }}>

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", color: "#E6C763", fontWeight: 700, marginBottom: 14 }}>
              Médiathèque
            </div>
            <h2 className="font-serif" style={{ fontWeight: 600, fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.05 }}>
              Sermons & Replays
            </h2>
          </div>
          <a
            href="https://www.youtube.com/@ARCEglise"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 9,
              background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)",
              color: "#fff", padding: "13px 22px", borderRadius: 999,
              fontWeight: 600, fontSize: 14,
            }}
          >
            ▶ Voir sur YouTube
          </a>
        </div>

        <SermonsClient sermons={(sermons ?? []) as Sermon[]} dark />
      </div>
    </section>
  );
}
