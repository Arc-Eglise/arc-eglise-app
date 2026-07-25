"use client";

import { useState, useTransition } from "react";
import { reserveMyTicket } from "@/lib/actions/tickets";

export default function ReserveButton({ eventId, already }: { eventId: string; already: number }) {
  const [count, setCount] = useState(1);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function reserve() {
    setMsg(null);
    start(async () => {
      const res = await reserveMyTicket(eventId, count);
      if ("error" in res && res.error) {
        setMsg({ ok: false, text: res.error });
      } else if ("emailError" in res && res.emailError) {
        setMsg({ ok: true, text: `Billet(s) créé(s) ✅ mais l'email n'a pas pu partir (${res.emailError}).` });
      } else {
        setMsg({ ok: true, text: `${count} billet${count > 1 ? "s" : ""} envoyé${count > 1 ? "s" : ""} par email 🎟️` });
      }
    });
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 12 }}>
      <label style={{ fontSize: 13, color: "#4a5070", display: "flex", alignItems: "center", gap: 6 }}>
        Places
        <select value={count} onChange={e => setCount(Number(e.target.value))}
          disabled={pending}
          style={{ padding: "6px 8px", borderRadius: 8, border: "1.5px solid rgba(30,36,100,.15)", fontSize: 14 }}>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <button onClick={reserve} disabled={pending}
        style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: pending ? "wait" : "pointer",
                 background: "#1e2464", color: "#fff", fontWeight: 700, fontSize: 14, opacity: pending ? 0.7 : 1 }}>
        {pending ? "Réservation…" : "🎟️ Réserver ma place"}
      </button>
      {already > 0 && <span style={{ fontSize: 12, color: "#047857" }}>Tu as déjà {already} billet{already > 1 ? "s" : ""}.</span>}
      {msg && (
        <div style={{ width: "100%", fontSize: 13, marginTop: 4, color: msg.ok ? "#047857" : "#b91c1c" }}>{msg.text}</div>
      )}
    </div>
  );
}
