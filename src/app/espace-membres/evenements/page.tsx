import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import ReserveButton from "@/components/evenements/ReserveButton";

export const dynamic = "force-dynamic";

function fmt(date: string, timeStart: string | null): string {
  const jour = new Date(`${date}T00:00:00`).toLocaleDateString("fr-CH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return jour + (timeStart ? ` · ${timeStart.slice(0, 5).replace(":", "h")}` : "");
}

export default async function EvenementsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: events }, { data: myTickets }] = await Promise.all([
    admin.from("events")
      .select("id, title, description, date, time_start, time_end, location, capacity, price_chf, tags")
      .eq("is_published", true).gte("date", today).order("date"),
    admin.from("event_tickets").select("event_id").eq("user_id", user.id).eq("status", "valid"),
  ]);

  const ticketCount: Record<string, number> = {};
  for (const t of myTickets ?? []) ticketCount[t.event_id] = (ticketCount[t.event_id] ?? 0) + 1;

  const list = events ?? [];

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui,Arial,sans-serif" }}>
      <Link href="/espace-membres?panel=agenda" style={{ fontSize: 13, color: "#8890aa", textDecoration: "none" }}>← Agenda</Link>
      <h1 style={{ fontFamily: "Georgia,serif", fontSize: 30, fontWeight: 700, color: "#1e2464", margin: "6px 0 2px" }}>Événements & réservations</h1>
      <p style={{ color: "#8890aa", margin: "0 0 20px", fontSize: 14 }}>Réserve ta place — tu recevras ton billet QR par email.</p>

      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#8890aa" }}>
          <div style={{ fontSize: 40 }}>📅</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>Aucun événement à venir</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {list.map(ev => {
            const free = !ev.price_chf || Number(ev.price_chf) === 0;
            return (
              <div key={ev.id} style={{ background: "#fff", border: "1px solid #e6e8f2", borderRadius: 14, padding: "16px 18px", boxShadow: "0 2px 12px rgba(30,36,100,.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e2464", margin: 0 }}>{ev.title}</h2>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: free ? "#ecfdf5" : "#fff7ed", color: free ? "#047857" : "#c2410c", height: "fit-content" }}>
                    {free ? "Gratuit" : `${ev.price_chf} CHF`}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#2B3475", marginTop: 6 }}>📅 {fmt(ev.date, ev.time_start)}</div>
                <div style={{ fontSize: 13, color: "#8890aa", marginTop: 2 }}>📍 {ev.location}</div>
                {ev.description && <p style={{ fontSize: 14, color: "#4a5070", lineHeight: 1.6, margin: "10px 0 0" }}>{ev.description}</p>}

                {free ? (
                  <ReserveButton eventId={ev.id} already={ticketCount[ev.id] ?? 0} />
                ) : (
                  <div style={{ marginTop: 12, fontSize: 13, color: "#c2410c", background: "#fff7ed", borderRadius: 8, padding: "8px 12px" }}>
                    💳 Billets payants — disponibles prochainement.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
