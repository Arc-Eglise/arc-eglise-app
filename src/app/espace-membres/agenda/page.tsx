import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EventCard } from "./AgendaClient";
import { EventsManagerClient } from "./EventsManagerClient";

export default async function AgendaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, groups")
    .eq("id", user.id)
    .single();

  const isAdmin = ["admin", "pasteur"].includes(profile?.role ?? "");
  const canManage =
    isAdmin ||
    (profile?.groups as string[] | null ?? []).includes("communication") ||
    (profile?.groups as string[] | null ?? []).includes("media") ||
    (profile?.groups as string[] | null ?? []).includes("support");
  const today   = new Date().toISOString().split("T")[0];
  const past30  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [upcomingRes, pastRes, myRsvpRes, myAttendRes] = await Promise.all([
    supabase.from("events")
      .select("id, title, description, date, time_start, time_end, location, capacity, price_chf, tags, image_url")
      .eq("is_published", true).gte("date", today).order("date"),
    supabase.from("events")
      .select("id, title, description, date, time_start, time_end, location, capacity, price_chf, tags, image_url")
      .eq("is_published", true).gte("date", past30).lt("date", today).order("date", { ascending: false }),
    supabase.from("event_rsvp").select("event_id, status").eq("user_id", user.id),
    supabase.from("event_attendance").select("event_id, checked_in_at").eq("user_id", user.id),
  ]);

  const upcoming = upcomingRes.data ?? [];
  const past     = pastRes.data ?? [];
  const allEvents = [...upcoming, ...past];

  const myRsvpMap     = Object.fromEntries((myRsvpRes.data ?? []).map(r => [r.event_id, r.status as "going" | "maybe" | "declined"]));
  const myAttendMap   = Object.fromEntries((myAttendRes.data ?? []).map(r => [r.event_id, r.checked_in_at as string]));

  // Counts RSVP + attendance per event
  let countsMap:    Record<string, { going: number; maybe: number }> = {};
  let attendMap:    Record<string, number> = {};
  let attendeesMap: Record<string, { userId: string; name: string }[]> = {};

  if (allEvents.length > 0) {
    const ids = allEvents.map(e => e.id);

    const [rsvpCounts, attendCounts] = await Promise.all([
      supabase.from("event_rsvp").select("event_id, status").in("event_id", ids),
      canManage
        ? supabase.from("event_attendance")
            .select("event_id, user_id, profiles!event_attendance_user_id_fkey(first_name, last_name)")
            .in("event_id", ids)
        : supabase.from("event_attendance").select("event_id, user_id").in("event_id", ids),
    ]);

    for (const r of rsvpCounts.data ?? []) {
      if (!countsMap[r.event_id]) countsMap[r.event_id] = { going: 0, maybe: 0 };
      if (r.status === "going")  countsMap[r.event_id].going++;
      if (r.status === "maybe")  countsMap[r.event_id].maybe++;
    }

    for (const a of attendCounts.data ?? []) {
      attendMap[a.event_id] = (attendMap[a.event_id] ?? 0) + 1;
      if (canManage) {
        if (!attendeesMap[a.event_id]) attendeesMap[a.event_id] = [];
        const p = (a as { profiles?: { first_name: string | null; last_name: string | null } | null }).profiles;
        attendeesMap[a.event_id].push({
          userId: a.user_id,
          name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Membre",
        });
      }
    }
  }

  // Group upcoming by month
  const grouped: Record<string, typeof upcoming> = {};
  for (const ev of upcoming) {
    const key = new Date(ev.date + "T00:00:00").toLocaleDateString("fr-CH", { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(ev);
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <Link href="/espace-membres/ai-biblique" className="inline-flex items-center gap-1.5 text-sm text-arc-blue hover:text-arc-navy transition-colors">
          ← ARC Église AI
        </Link>
        <span className="text-arc-border">|</span>
        <Link href="/espace-membres" className="inline-flex items-center gap-1.5 text-sm text-arc-text2 hover:text-arc-navy transition-colors">
          ← Espace Membres
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Agenda</h1>
        <p className="text-sm text-arc-text2 mt-0.5">Événements à venir — confirme ta présence</p>
      </div>

      {/* ── Gestion des événements (admins/managers) ── */}
      <EventsManagerClient canManage={canManage} />

      {/* ── Événements à venir ── */}
      {Object.keys(grouped).length === 0 && past.length === 0 && (
        <div className="bg-white border border-arc-border rounded-2xl py-16 text-center text-arc-text3 text-sm">
          Aucun événement prévu pour le moment.
        </div>
      )}

      {Object.entries(grouped).map(([month, evts]) => (
        <div key={month} className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-arc-blue mb-3 capitalize">{month}</h2>
          <div className="space-y-3">
            {(evts ?? []).map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                myRsvp={myRsvpMap[ev.id] ?? null}
                counts={countsMap[ev.id] ?? { going: 0, maybe: 0 }}
                attendCount={attendMap[ev.id] ?? 0}
                myCheckedIn={myAttendMap[ev.id] ?? null}
                isPast={false}
                isToday={ev.date === today}
                isAdmin={canManage}
                attendees={attendeesMap[ev.id] ?? []}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Événements passés (30 derniers jours) ── */}
      {past.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-arc-text3 mb-3">
            Événements passés (30 jours)
          </h2>
          <div className="space-y-3">
            {past.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                myRsvp={myRsvpMap[ev.id] ?? null}
                counts={countsMap[ev.id] ?? { going: 0, maybe: 0 }}
                attendCount={attendMap[ev.id] ?? 0}
                myCheckedIn={myAttendMap[ev.id] ?? null}
                isPast={true}
                isAdmin={canManage}
                attendees={attendeesMap[ev.id] ?? []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
