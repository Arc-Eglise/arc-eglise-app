"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { newTicketCode, ticketQrDataUrl, ticketCardHtml } from "@/lib/tickets/qr";
import { sendEventTicketEmail } from "@/lib/email";

interface EventRow {
  id: string; title: string; date: string;
  time_start: string | null; location: string | null;
}

/** Formate « dimanche 18 août 2026 · 10h30 » à partir de date + time_start. */
function formatEventDate(date: string, timeStart: string | null): string {
  const d = new Date(`${date}T${(timeStart ?? "00:00").slice(0, 5)}:00`);
  const jour = d.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const heure = timeStart ? ` · ${timeStart.slice(0, 5).replace(":", "h")}` : "";
  return jour + heure;
}

/**
 * Émet N billets (QR) pour un membre sur un événement, puis envoie le mail Resend.
 * Utilisé pour les réservations GRATUITES (RSVP). Le déclencheur « achat payant »
 * réutilisera cette fonction avec source:"purchase" (après le gel Stripe).
 */
export async function issueEventTickets(opts: {
  eventId: string;
  holderName: string;
  email: string;
  count?: number;
  source?: "rsvp" | "registration" | "purchase";
  userId?: string | null;
}) {
  const admin = createAdminClient();
  const count = Math.max(1, Math.min(opts.count ?? 1, 20));

  const { data: ev } = await admin
    .from("events")
    .select("id, title, date, time_start, location")
    .eq("id", opts.eventId)
    .maybeSingle();
  if (!ev) return { error: "Événement introuvable" };
  const event = ev as EventRow;

  const eventDate = formatEventDate(event.date, event.time_start);
  const location = event.location ?? "Av. Charles-Naine 39, La Chaux-de-Fonds";

  // Crée les billets + génère les cartes QR.
  const rows: Record<string, unknown>[] = [];
  const cards: string[] = [];
  for (let i = 1; i <= count; i++) {
    const code = newTicketCode();
    rows.push({
      event_id: event.id, user_id: opts.userId ?? null,
      holder_name: opts.holderName, email: opts.email,
      code, seat_index: i, source: opts.source ?? "rsvp",
    });
    const qrDataUrl = await ticketQrDataUrl(code);
    cards.push(ticketCardHtml({
      eventName: event.title, eventDate, location,
      holderName: opts.holderName, qrDataUrl,
    }));
  }

  const { error } = await admin.from("event_tickets").insert(rows);
  if (error) return { error: error.message };

  try {
    await sendEventTicketEmail({
      to: opts.email, holderName: opts.holderName,
      eventName: event.title, eventDate, location, ticketCards: cards,
    });
  } catch (e) {
    // Billets créés mais mail échoué : on le signale sans perdre les billets.
    return { ok: true, count, emailError: e instanceof Error ? e.message : "Envoi mail échoué" };
  }
  return { ok: true, count };
}

/** Réserver ma place (RSVP « going ») + recevoir mon billet QR par mail. */
export async function reserveMyTicket(eventId: string, count = 1) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles").select("first_name, last_name, email").eq("id", user.id).maybeSingle();
  const holderName = [prof?.first_name, prof?.last_name].filter(Boolean).join(" ").trim() || "Membre ARC";
  const email = (prof?.email as string | null) ?? user.email;
  if (!email) return { error: "Aucune adresse email sur ton profil" };

  // Enregistre le RSVP « going » (idempotent).
  await admin.from("event_rsvp")
    .upsert({ event_id: eventId, user_id: user.id, status: "going" }, { onConflict: "event_id,user_id" });

  return issueEventTickets({
    eventId, holderName, email, count, source: "rsvp", userId: user.id,
  });
}

/** Détail d'un billet (page /t/[code] + scan admin). */
export async function getTicket(code: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("event_tickets")
    .select("id, holder_name, status, used_at, seat_index, event:events(title, date, time_start, location)")
    .eq("code", code)
    .maybeSingle();
  return data ?? null;
}

/** Valider (scanner) un billet — réservé équipe. Marque « used ». */
export async function scanTicket(code: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "pasteur"].includes((prof?.role as string) ?? "")) return { error: "Non autorisé" };

  const { data: t } = await admin
    .from("event_tickets")
    .select("id, status, holder_name, used_at, event:events(title, date, time_start)")
    .eq("code", code).maybeSingle();
  if (!t) return { status: "invalid" as const };
  if (t.status === "used") return { status: "already" as const, ticket: t };
  if (t.status === "cancelled") return { status: "cancelled" as const, ticket: t };

  await admin.from("event_tickets")
    .update({ status: "used", used_at: new Date().toISOString(), used_by: user.id })
    .eq("id", t.id);
  return { status: "ok" as const, ticket: t };
}
