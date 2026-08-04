"use client";

import { useState } from "react";
import { createNote } from "@/lib/actions/notes";

interface Props {
  streamTitle?: string;
  streamId?: string;
}

/**
 * ADR-002 Phase 2 — fenêtre flottante de prise de notes pendant un live.
 * S'ouvre par-dessus le lecteur, chaque note est horodatée et enregistrée
 * avec source_kind='streaming'.
 */
export default function StreamNotesWidget({ streamTitle = "Direct", streamId }: Props) {
  const [open, setOpen]   = useState(false);
  const [text, setText]   = useState("");
  const [saved, setSaved] = useState<{ id: string; text: string; at: string }[]>([]);
  const [busy, setBusy]   = useState(false);

  async function save() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    const at = new Date().toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
    const res = await createNote({
      title: `📺 ${streamTitle} — ${at}`,
      body,
      color: "purple",
      source_kind: "streaming",
      source_ref_id: streamId ?? null,
      source_snapshot: { kind: "streaming", stream: streamTitle, stream_id: streamId ?? null, at, captured_at: new Date().toISOString() },
    });
    setBusy(false);
    if (!("error" in res)) {
      setSaved(prev => [{ id: (res as { data: { id: string } }).data.id, text: body, at }, ...prev]);
      setText("");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "absolute", top: 12, right: 12, zIndex: 30,
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(21,26,74,.9)", color: "#fff", border: "none",
          borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700,
          cursor: "pointer", backdropFilter: "blur(4px)",
        }}
      >
        🗒️ Prendre des notes
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute", top: 12, right: 12, zIndex: 31, width: 300,
        background: "#fff", borderRadius: 14, border: "1px solid #e6e9f4",
        boxShadow: "0 12px 34px rgba(30,36,100,.28)", overflow: "hidden",
        display: "flex", flexDirection: "column", maxHeight: "78%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#151a4a", color: "#fff" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>🗒️ Notes du live</span>
        <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ padding: 10 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }}
          placeholder="Ta note (Ctrl/⌘+Entrée pour enregistrer)…"
          rows={3}
          style={{ width: "100%", border: "1px solid #e6e9f4", borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none", resize: "vertical" }}
        />
        <button
          onClick={save} disabled={busy || !text.trim()}
          style={{ marginTop: 8, width: "100%", background: "#151a4a", color: "#fff", border: "none", borderRadius: 10, padding: "9px", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: text.trim() ? 1 : .5 }}
        >
          {busy ? "…" : "Enregistrer la note"}
        </button>
      </div>

      {saved.length > 0 && (
        <div style={{ borderTop: "1px solid #e6e9f4", overflowY: "auto", padding: "6px 10px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8b91b0", textTransform: "uppercase", letterSpacing: ".04em", margin: "4px 0 6px" }}>
            {saved.length} note{saved.length > 1 ? "s" : ""} ce direct
          </div>
          {saved.map(s => (
            <div key={s.id} style={{ fontSize: 12, color: "#1e2464", padding: "6px 8px", background: "#f5f6fb", borderRadius: 8, marginBottom: 5 }}>
              <span style={{ color: "#9268e8", fontWeight: 700, marginRight: 6 }}>{s.at}</span>
              {s.text.length > 90 ? s.text.slice(0, 90) + "…" : s.text}
            </div>
          ))}
          <a href="/espace-membres/notes-taches" style={{ display: "block", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#9268e8", textDecoration: "none", marginTop: 4 }}>
            Voir toutes mes notes →
          </a>
        </div>
      )}
    </div>
  );
}
