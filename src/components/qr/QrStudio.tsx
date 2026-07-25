"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";

type Ecc = "L" | "M" | "Q" | "H";

const PRESETS: { id: string; label: string; value: string; hint?: string }[] = [
  { id: "site",    label: "🌐 Site ARC",            value: "https://arc-eglise.ch" },
  { id: "espace",  label: "🔐 Espace membre",       value: "https://arc-eglise.ch/espace-membres" },
  { id: "ios",     label: "🍎 App iOS (App Store)", value: "https://apps.apple.com/app/id000000000", hint: "Remplace par le vrai lien App Store quand l'app sera publiée." },
  { id: "android", label: "🤖 App Android (Play)",  value: "https://play.google.com/store/apps/details?id=ch.arceglise.app", hint: "Remplace par le vrai lien Play Store." },
  { id: "custom",  label: "✏️ Texte / URL libre",   value: "" },
];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function QrStudio() {
  const [text, setText] = useState("https://arc-eglise.ch");
  const [preset, setPreset] = useState("site");
  const [dark, setDark] = useState("#1a1d3a");
  const [light, setLight] = useState("#ffffff");
  const [ecc, setEcc] = useState<Ecc>("M");
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [logo, setLogo] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const effEcc: Ecc = logo ? "H" : ecc; // l'overlay logo exige une correction élevée
    try {
      await QRCode.toCanvas(canvas, text || " ", {
        errorCorrectionLevel: effEcc, margin, width: size,
        color: { dark, light },
      });
    } catch { return; }
    if (logo) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const box = Math.round(size * 0.22);
      const cx = size / 2, cy = size / 2;
      const x = cx - box / 2, y = cy - box / 2;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, x - 6, y - 6, box + 12, box + 12, 10);
      ctx.fill();
      const img = new Image();
      img.src = "/images/logo-arc.jpeg";
      try { await img.decode(); } catch { return; }
      roundRect(ctx, x, y, box, box, 6);
      ctx.save(); ctx.clip();
      ctx.drawImage(img, x, y, box, box);
      ctx.restore();
    }
  }, [text, dark, light, ecc, size, margin, logo]);

  useEffect(() => { render(); }, [render]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr-arc-${Date.now()}.png`;
    a.click();
    setToast("QR téléchargé ✅");
    setTimeout(() => setToast(null), 2000);
  }

  function applyPreset(id: string) {
    setPreset(id);
    const p = PRESETS.find(x => x.id === id);
    if (p && p.id !== "custom") setText(p.value);
    if (p && p.id === "custom") setText("");
  }

  const label = { display: "block", fontSize: 12, fontWeight: 700, color: "#4a5070", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".5px" };
  const input = { width: "100%", boxSizing: "border-box" as const, padding: "9px 11px", borderRadius: 9, border: "1.5px solid rgba(30,36,100,.15)", fontSize: 14 };
  const activeHint = PRESETS.find(p => p.id === preset)?.hint;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
      {/* Contrôles */}
      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={label}>Type / usage</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => applyPreset(p.id)}
                style={{ padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                         border: preset === p.id ? "1.5px solid #1e2464" : "1.5px solid rgba(30,36,100,.15)",
                         background: preset === p.id ? "#eef1fb" : "#fff", color: "#1e2464", fontWeight: preset === p.id ? 700 : 500 }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={label}>Contenu (texte ou lien encodé)</label>
          <textarea value={text} onChange={e => { setText(e.target.value); setPreset("custom"); }} rows={2}
            placeholder="https://… ou n'importe quel texte" style={{ ...input, resize: "vertical", fontFamily: "monospace" }} />
          {activeHint && <div style={{ fontSize: 12, color: "#c2410c", marginTop: 4 }}>💡 {activeHint}</div>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>Couleur du QR</label>
            <input type="color" value={dark} onChange={e => setDark(e.target.value)} style={{ width: "100%", height: 40, borderRadius: 9, border: "1.5px solid rgba(30,36,100,.15)", cursor: "pointer" }} />
          </div>
          <div>
            <label style={label}>Fond</label>
            <input type="color" value={light} onChange={e => setLight(e.target.value)} style={{ width: "100%", height: 40, borderRadius: 9, border: "1.5px solid rgba(30,36,100,.15)", cursor: "pointer" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>Correction d&apos;erreur</label>
            <select value={ecc} onChange={e => setEcc(e.target.value as Ecc)} disabled={logo} style={input}>
              <option value="L">Faible (L)</option>
              <option value="M">Moyenne (M)</option>
              <option value="Q">Élevée (Q)</option>
              <option value="H">Maximale (H)</option>
            </select>
            {logo && <div style={{ fontSize: 11, color: "#8890aa", marginTop: 3 }}>Forcée à « H » avec le logo.</div>}
          </div>
          <div>
            <label style={label}>Taille : {size}px</label>
            <input type="range" min={160} max={640} step={16} value={size} onChange={e => setSize(Number(e.target.value))} style={{ width: "100%", marginTop: 10 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#1e2464", cursor: "pointer" }}>
            <input type="checkbox" checked={logo} onChange={e => setLogo(e.target.checked)} /> Logo ARC au centre
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#4a5070" }}>
            Marge
            <input type="range" min={0} max={6} value={margin} onChange={e => setMargin(Number(e.target.value))} />
          </label>
        </div>
      </div>

      {/* Aperçu + export */}
      <div style={{ textAlign: "center", position: "sticky", top: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #e6e8f2", borderRadius: 16, padding: 16, boxShadow: "0 4px 20px rgba(30,36,100,.08)" }}>
          <canvas ref={canvasRef} style={{ width: "100%", maxWidth: 288, height: "auto", borderRadius: 8 }} />
        </div>
        <button onClick={download} style={{ width: "100%", marginTop: 12, padding: "11px 0", borderRadius: 10, border: "none", background: "#1e2464", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          ⬇️ Télécharger le PNG
        </button>
        {toast && <div style={{ marginTop: 8, fontSize: 13, color: "#047857" }}>{toast}</div>}
      </div>
    </div>
  );
}
