"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { scanTicket } from "@/lib/actions/tickets";

type Res = { kind: "ok" | "already" | "cancelled" | "invalid" | "error"; text: string; sub?: string };

// Extrait le code depuis une valeur scannée (URL .../t/<code> ou code brut).
function extractCode(raw: string): string {
  const v = raw.trim();
  const m = v.match(/\/t\/([^/?#\s]+)/);
  return m ? m[1] : v;
}

const STYLE: Record<Res["kind"], { bg: string; fg: string; icon: string }> = {
  ok:        { bg: "#ecfdf5", fg: "#047857", icon: "✅" },
  already:   { bg: "#fff7ed", fg: "#c2410c", icon: "⚠️" },
  cancelled: { bg: "#fef2f2", fg: "#b91c1c", icon: "🚫" },
  invalid:   { bg: "#fef2f2", fg: "#b91c1c", icon: "❌" },
  error:     { bg: "#fef2f2", fg: "#b91c1c", icon: "❌" },
};

export default function TicketScanner() {
  const [manual, setManual] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [pending, start] = useTransition();
  const [camOn, setCamOn] = useState(false);
  const [camSupported, setCamSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef<string>("");

  useEffect(() => {
    // BarcodeDetector natif (Chrome desktop/Android). Absent sur iOS Safari.
    setCamSupported(typeof (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !== "undefined");
  }, []);

  function validate(raw: string) {
    const code = extractCode(raw);
    if (!code) return;
    start(async () => {
      const r = await scanTicket(code);
      if ("error" in r && r.error) { setRes({ kind: "error", text: r.error }); return; }
      const holder = (r as { ticket?: { holder_name?: string; event?: { title?: string } } }).ticket;
      const name = holder?.holder_name ?? "";
      const evt = holder?.event?.title ?? "";
      if (r.status === "ok")        setRes({ kind: "ok",        text: `Entrée validée — ${name}`, sub: evt });
      else if (r.status === "already") setRes({ kind: "already", text: `Déjà utilisé — ${name}`, sub: evt });
      else if (r.status === "cancelled") setRes({ kind: "cancelled", text: `Billet annulé — ${name}`, sub: evt });
      else setRes({ kind: "invalid", text: "Billet inconnu / invalide" });
    });
  }

  async function startCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamOn(true);
      const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      const det = new Detector({ formats: ["qr_code"] });
      const loop = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) { requestAnimationFrame(loop); return; }
        try {
          const codes = await det.detect(videoRef.current);
          if (codes[0]?.rawValue && codes[0].rawValue !== lastRef.current) {
            lastRef.current = codes[0].rawValue;
            validate(codes[0].rawValue);
            setTimeout(() => { lastRef.current = ""; }, 2500);
          }
        } catch { /* ignore frame errors */ }
        if (videoRef.current?.srcObject) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch {
      setRes({ kind: "error", text: "Accès caméra refusé ou indisponible." });
      setCamSupported(false);
    }
  }

  function stopCam() {
    const v = videoRef.current;
    const s = v?.srcObject as MediaStream | null;
    s?.getTracks().forEach(t => t.stop());
    if (v) v.srcObject = null;
    setCamOn(false);
  }
  useEffect(() => () => stopCam(), []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Résultat */}
      {res && (
        <div style={{ padding: "16px 18px", borderRadius: 12, background: STYLE[res.kind].bg, color: STYLE[res.kind].fg, fontWeight: 700 }}>
          <div style={{ fontSize: 17 }}>{STYLE[res.kind].icon} {res.text}</div>
          {res.sub && <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, opacity: .85 }}>{res.sub}</div>}
        </div>
      )}

      {/* Caméra */}
      <div style={{ background: "#0b0e24", borderRadius: 14, overflow: "hidden", position: "relative", aspectRatio: "4/3" }}>
        <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: camOn ? "block" : "none" }} />
        {!camOn && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#8890aa", textAlign: "center", padding: 20 }}>
            <div>
              <div style={{ fontSize: 40 }}>📷</div>
              {camSupported
                ? <button onClick={startCam} style={{ marginTop: 10, padding: "10px 20px", borderRadius: 10, border: "none", background: "#1e2464", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Activer la caméra</button>
                : <div style={{ fontSize: 13, marginTop: 8 }}>Caméra non supportée sur ce navigateur.<br />Utilise l&apos;appareil photo du téléphone (il ouvrira le billet) ou la saisie manuelle ci-dessous.</div>}
            </div>
          </div>
        )}
        {camOn && <button onClick={stopCam} style={{ position: "absolute", top: 10, right: 10, padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(0,0,0,.5)", color: "#fff", cursor: "pointer" }}>Arrêter</button>}
      </div>

      {/* Saisie manuelle / scanner PC */}
      <form onSubmit={e => { e.preventDefault(); validate(manual); setManual(""); }} style={{ display: "flex", gap: 8 }}>
        <input value={manual} onChange={e => setManual(e.target.value)} disabled={pending}
          placeholder="Coller le lien du billet, ou scanner PC…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid rgba(30,36,100,.15)", fontSize: 14 }} />
        <button type="submit" disabled={pending || !manual.trim()}
          style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#1e2464", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: pending || !manual.trim() ? .6 : 1 }}>
          {pending ? "…" : "Valider"}
        </button>
      </form>
      <p style={{ fontSize: 12, color: "#8890aa", margin: 0 }}>💡 Scanner USB : il tape le lien automatiquement puis « Entrée ». Smartphone : « Activer la caméra ».</p>
    </div>
  );
}
