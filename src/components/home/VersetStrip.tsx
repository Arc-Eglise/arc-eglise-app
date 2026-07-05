import { createClient } from "@/lib/supabase/server";

const DEFAULT_VERSET = "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.";
const DEFAULT_REF    = "Jean 3:16";

export default async function VersetStrip() {
  const supabase = createClient();

  let verset = DEFAULT_VERSET;
  let ref    = DEFAULT_REF;

  try {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["verset_du_jour", "verset_reference"]);
    for (const row of data ?? []) {
      if (row.key === "verset_du_jour")   verset = row.value;
      if (row.key === "verset_reference") ref    = row.value;
    }
  } catch {
    // fallback
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg,#141738 0%,#1e2464 100%)",
        padding: "64px 32px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative grid */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(45deg,rgba(255,255,255,.03) 0 1px,transparent 1px 28px)," +
            "repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0 1px,transparent 1px 28px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
        <div style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "#C9A227", fontWeight: 700, marginBottom: 22 }}>
          Verset du jour
        </div>
        <blockquote
          className="font-serif"
          style={{
            fontSize: "clamp(18px,2.6vw,26px)",
            lineHeight: 1.6,
            color: "rgba(255,255,255,.92)",
            fontStyle: "italic",
            margin: 0,
            marginBottom: 20,
          }}
        >
          &laquo;&nbsp;{verset}&nbsp;&raquo;
        </blockquote>
        <cite style={{ fontSize: 14, color: "#C9A227", fontWeight: 700, fontStyle: "normal", letterSpacing: ".06em" }}>
          — {ref}
        </cite>
      </div>
    </div>
  );
}
