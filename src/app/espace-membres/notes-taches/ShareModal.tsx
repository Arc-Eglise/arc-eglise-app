"use client";

import { useEffect, useState } from "react";
import { listShareTargets, shareResource } from "@/lib/actions/shares";
import type { ResourceType } from "@/lib/notes-taches/types";

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  title: string;
  onClose: () => void;
  onShared?: () => void;
}

type Targets = { members: { id: string; name: string }[]; functions: { slug: string; label: string }[] };

export default function ShareModal({ resourceType, resourceId, title, onClose, onShared }: Props) {
  const [tab, setTab]         = useState<"membre" | "fonction">("membre");
  const [targets, setTargets] = useState<Targets | null>(null);
  const [search, setSearch]   = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy]       = useState(false);
  const [done, setDone]       = useState<string | null>(null);

  useEffect(() => {
    listShareTargets().then(r => { if ("data" in r && r.data) setTargets(r.data as Targets); });
  }, []);

  async function share(kind: "user" | "function", id: string, label: string) {
    setBusy(true);
    const res = await shareResource({
      resourceType, resourceId, targetKind: kind,
      targetId: kind === "user" ? id : null,
      targetFunction: kind === "function" ? id : null,
      message: message.trim() || undefined,
    });
    setBusy(false);
    setDone("id" in res ? `Partagé avec ${label} ✓` : "Échec du partage");
    if ("id" in res) { onShared?.(); setTimeout(onClose, 900); }
  }

  const members = (targets?.members ?? []).filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,23,58,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e6e9f4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, color: "#1e2464" }}>Partager {resourceType === "note" ? "la note" : "la tâche"}</div>
            <div style={{ fontSize: 12, color: "#8b91b0", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#8b91b0" }}>✕</button>
        </div>

        <div style={{ padding: "12px 18px", display: "flex", gap: 6 }}>
          {(["membre", "fonction"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: "1px solid #e6e9f4", background: tab === t ? "#151a4a" : "#fff", color: tab === t ? "#fff" : "#5c6280", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {t === "membre" ? "👤 Un membre" : "👥 Une fonction"}
            </button>
          ))}
        </div>

        <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message (facultatif)…" maxLength={300}
          style={{ margin: "0 18px 10px", padding: "8px 10px", borderRadius: 9, border: "1px solid #e6e9f4", fontSize: 13, outline: "none" }} />

        <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 16px" }}>
          {done && <div style={{ padding: "10px", background: "#dcfce7", color: "#15803d", borderRadius: 9, fontSize: 13, fontWeight: 600, textAlign: "center", marginBottom: 10 }}>{done}</div>}

          {tab === "membre" ? (
            <>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un membre…"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid #e6e9f4", fontSize: 13, outline: "none", marginBottom: 8 }} />
              {!targets ? <div style={{ color: "#8b91b0", fontSize: 13, padding: 8 }}>Chargement…</div> :
                members.length === 0 ? <div style={{ color: "#8b91b0", fontSize: 13, padding: 8 }}>Aucun membre.</div> :
                members.map(m => (
                  <button key={m.id} disabled={busy} onClick={() => share("user", m.id, m.name)}
                    style={rowBtn}>{m.name}<span style={{ color: "#9268e8", fontWeight: 700 }}>Partager →</span></button>
                ))}
            </>
          ) : (
            <>
              {!targets ? <div style={{ color: "#8b91b0", fontSize: 13, padding: 8 }}>Chargement…</div> :
                targets.functions.map(f => (
                  <button key={f.slug} disabled={busy} onClick={() => share("function", f.slug, f.label)}
                    style={rowBtn}>{f.label}<span style={{ color: "#9268e8", fontWeight: 700 }}>Partager →</span></button>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const rowBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  width: "100%", padding: "10px 12px", marginBottom: 6, borderRadius: 10,
  border: "1px solid #e6e9f4", background: "#fff", cursor: "pointer",
  fontSize: 13, fontWeight: 600, color: "#1e2464",
};
