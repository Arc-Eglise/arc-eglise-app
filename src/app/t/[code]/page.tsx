import { getTicket } from "@/lib/actions/tickets";
import { ticketQrDataUrl, CHURCH_NAME } from "@/lib/tickets/qr";

export const dynamic = "force-dynamic";

function fmt(date: string, timeStart: string | null): string {
  const jour = new Date(`${date}T00:00:00`).toLocaleDateString("fr-CH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return jour + (timeStart ? ` · ${timeStart.slice(0, 5).replace(":", "h")}` : "");
}

const STATUS: Record<string, { label: string; bg: string; fg: string; icon: string }> = {
  valid:     { label: "Billet valide",   bg: "#ecfdf5", fg: "#047857", icon: "✅" },
  used:      { label: "Déjà utilisé",    bg: "#fff7ed", fg: "#c2410c", icon: "⚠️" },
  cancelled: { label: "Billet annulé",   bg: "#fef2f2", fg: "#b91c1c", icon: "🚫" },
};

export default async function TicketPage({ params }: { params: { code: string } }) {
  const ticket = await getTicket(params.code);

  if (!ticket) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f4f6fb", padding: 24 }}>
        <div style={{ textAlign: "center", color: "#8890aa" }}>
          <div style={{ fontSize: 48 }}>🎟️</div>
          <h1 style={{ color: "#1e2464", fontSize: 20, margin: "12px 0 4px" }}>Billet introuvable</h1>
          <p>Ce code de billet n&apos;existe pas ou a été supprimé.</p>
        </div>
      </main>
    );
  }

  const ev = ticket.event as unknown as { title: string; date: string; time_start: string | null; location: string | null };
  const st = STATUS[ticket.status] ?? STATUS.valid;
  const qr = await ticketQrDataUrl(params.code);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f4f6fb", padding: 24, fontFamily: "system-ui,Arial,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", border: "1px solid #e6e8f2", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 30px rgba(30,36,100,.1)" }}>
        {/* En-tête : logo + église + événement */}
        <div style={{ background: "#2B3475", padding: "18px 20px", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-arc.jpeg" alt="ARC Église" width={72} height={44} style={{ display: "block", margin: "0 auto 8px" }} />
          <div style={{ fontFamily: "Georgia,serif", color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: ".5px" }}>{CHURCH_NAME}</div>
          <div style={{ color: "#C9A227", fontSize: 15, fontWeight: 700, marginTop: 6 }}>{ev.title}</div>
        </div>
        {/* QR */}
        <div style={{ padding: "22px 20px 8px", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR billet" width={220} height={220} style={{ display: "block", margin: "0 auto", opacity: ticket.status === "valid" ? 1 : 0.35 }} />
        </div>
        {/* Statut */}
        <div style={{ textAlign: "center", margin: "0 20px 14px", padding: "8px 12px", borderRadius: 10, background: st.bg, color: st.fg, fontWeight: 700, fontSize: 14 }}>
          {st.icon} {st.label}{ticket.status === "used" && ticket.used_at ? ` — ${new Date(ticket.used_at).toLocaleString("fr-CH", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}` : ""}
        </div>
        {/* Participant + date */}
        <div style={{ padding: "0 20px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1d3a" }}>{ticket.holder_name}</div>
          <div style={{ fontSize: 13, color: "#2B3475", marginTop: 4 }}>📅 {fmt(ev.date, ev.time_start)}</div>
          <div style={{ fontSize: 12, color: "#8890aa", marginTop: 2 }}>📍 {ev.location}</div>
        </div>
      </div>
    </main>
  );
}
