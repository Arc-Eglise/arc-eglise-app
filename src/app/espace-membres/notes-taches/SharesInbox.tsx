"use client";

import { useEffect, useState } from "react";
import {
  listIncomingShares, listOutgoingShares, respondToShare, revokeShare,
} from "@/lib/actions/shares";

type Incoming = {
  id: string; resource_type: "note" | "task"; status: string;
  preview: string; sender_name: string; function_label: string | null;
  message: string | null; created_at: string;
};
type Outgoing = {
  id: string; resource_type: "note" | "task"; status: string;
  target_kind: string; shared_with_function: string | null; created_at: string;
};

export default function SharesInbox({ onChanged }: { onChanged?: () => void }) {
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);

  async function reload() {
    const [inc, out] = await Promise.all([listIncomingShares(), listOutgoingShares()]);
    if ("data" in inc) setIncoming(inc.data as Incoming[]);
    if ("data" in out) setOutgoing(out.data as Outgoing[]);
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  async function respond(id: string, accept: boolean, as: "note" | "task") {
    setBusy(id);
    await respondToShare(id, accept, as);
    setBusy(null);
    await reload();
    onChanged?.();
  }
  async function revoke(id: string) {
    setBusy(id);
    await revokeShare(id);
    setBusy(null);
    await reload();
  }

  const pending = incoming.filter(s => s.status === "en_attente");
  const past    = incoming.filter(s => s.status !== "en_attente");

  if (loading) return <div style={{ color: "#8b91b0", padding: 24, textAlign: "center" }}>Chargement…</div>;

  return (
    <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr" }}>
      {/* Reçus en attente */}
      <section>
        <h3 style={{ fontWeight: 700, color: "#1e2464", fontSize: 15, marginBottom: 10 }}>📥 Partages reçus {pending.length > 0 && <span style={{ fontSize: 12, color: "#9268e8" }}>({pending.length} en attente)</span>}</h3>
        {pending.length === 0 && past.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "#8b91b0", background: "#fff", border: "1px solid #e6e9f4", borderRadius: 14 }}>
            Aucun partage reçu pour le moment.
          </div>
        ) : (
          <>
            {pending.map(s => (
              <div key={s.id} style={{ background: "#fff", border: "1px solid #e6e9f4", borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#8b91b0", marginBottom: 4 }}>
                  {s.resource_type === "note" ? "🗒️ Note" : "✅ Tâche"} · de <strong style={{ color: "#1e2464" }}>{s.sender_name}</strong>
                  {s.function_label && <> · via <em>{s.function_label}</em></>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e2464" }}>{s.preview}</div>
                {s.message && <div style={{ fontSize: 13, color: "#5c6280", marginTop: 4, fontStyle: "italic" }}>« {s.message} »</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button disabled={busy === s.id} onClick={() => respond(s.id, true, "note")} style={btn("#151a4a")}>🗒️ Ajouter à mes notes</button>
                  <button disabled={busy === s.id} onClick={() => respond(s.id, true, "task")} style={btn("#151a4a")}>✅ Ajouter à mes tâches</button>
                  <button disabled={busy === s.id} onClick={() => respond(s.id, false, "note")} style={btnGhost}>Refuser</button>
                </div>
              </div>
            ))}
            {past.map(s => (
              <div key={s.id} style={{ background: "#f5f6fb", border: "1px solid #e6e9f4", borderRadius: 12, padding: "10px 14px", marginBottom: 8, fontSize: 13, color: "#5c6280", display: "flex", justifyContent: "space-between" }}>
                <span>{s.resource_type === "note" ? "🗒️" : "✅"} {s.preview} · de {s.sender_name}</span>
                <span style={{ fontWeight: 700, color: s.status === "accepte" ? "#15803d" : "#c2410c" }}>{s.status === "accepte" ? "Accepté" : "Refusé"}</span>
              </div>
            ))}
          </>
        )}
      </section>

      {/* Envoyés */}
      <section>
        <h3 style={{ fontWeight: 700, color: "#1e2464", fontSize: 15, marginBottom: 10 }}>📤 Mes partages envoyés</h3>
        {outgoing.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#8b91b0", background: "#fff", border: "1px solid #e6e9f4", borderRadius: 14 }}>
            Tu n'as encore rien partagé.
          </div>
        ) : outgoing.map(s => (
          <div key={s.id} style={{ background: "#fff", border: "1px solid #e6e9f4", borderRadius: 12, padding: "10px 14px", marginBottom: 8, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#5c6280" }}>
              {s.resource_type === "note" ? "🗒️ Note" : "✅ Tâche"} · {s.target_kind === "function" ? `fonction « ${s.shared_with_function} »` : "un membre"}
              {" · "}<span style={{ fontWeight: 700, color: s.status === "accepte" ? "#15803d" : s.status === "refuse" ? "#c2410c" : "#8b91b0" }}>
                {s.status === "accepte" ? "accepté" : s.status === "refuse" ? "refusé" : "en attente"}
              </span>
            </span>
            <button disabled={busy === s.id} onClick={() => revoke(s.id)} style={{ ...btnGhost, color: "#c2410c" }}>Révoquer</button>
          </div>
        ))}
      </section>
    </div>
  );
}

const btn = (bg: string): React.CSSProperties => ({
  background: bg, color: "#fff", border: "none", borderRadius: 9,
  padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
});
const btnGhost: React.CSSProperties = {
  background: "#fff", color: "#5c6280", border: "1px solid #e6e9f4",
  borderRadius: 9, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};
