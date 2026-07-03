import { ImageResponse } from "next/og";

export const runtime     = "edge";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #0a0d2e 0%, #1e2464 55%, #0f123a 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "serif",
        position: "relative",
      }}
    >
      {/* Dot grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(136,153,204,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Gold top accent */}
      <div style={{ display: "flex", gap: 8, marginBottom: 48, alignItems: "center" }}>
        <div style={{ width: 60, height: 2, background: "#C9A227", borderRadius: 2 }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A227" }} />
        <div style={{ width: 60, height: 2, background: "#C9A227", borderRadius: 2 }} />
      </div>

      {/* ARC monogram */}
      <div
        style={{
          fontSize: 120,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "0.18em",
          lineHeight: 1,
          marginBottom: 24,
          textShadow: "0 4px 24px rgba(201,162,39,0.2)",
        }}
      >
        ARC
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 300,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: "0.04em",
          marginBottom: 14,
          fontFamily: "serif",
        }}
      >
        Ambassade du Royaume de Christ
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 18,
          color: "rgba(255,255,255,0.42)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "sans-serif",
          marginBottom: 48,
        }}
      >
        Église Évangélique · La Chaux-de-Fonds, Suisse
      </div>

      {/* Gold bottom accent */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(201,162,39,0.4)" }} />
        <div style={{ width: 36, height: 8, borderRadius: 4, background: "#C9A227" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(201,162,39,0.4)" }} />
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
