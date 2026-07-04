import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PresencesTable from "./PresencesTable";

export default async function PresencesPage({
  searchParams,
}: {
  searchParams: { offset?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, validated")
    .eq("id", user.id)
    .single();

  const isAdmin = ["admin", "pasteur"].includes(me?.role ?? "");

  // Récupérer les événements passés (+ aujourd'hui) — paginés par 5
  const offsetVal = Math.max(0, parseInt(searchParams.offset ?? "0", 10));
  const PAGE_SIZE = 5;

  const today = new Date().toISOString().split("T")[0];

  const { data: events, count: totalEvents } = await supabase
    .from("events")
    .select("id, title, date, time_start, location, tags", { count: "exact" })
    .eq("is_published", true)
    .lte("date", today)
    .order("date", { ascending: false })
    .range(offsetVal, offsetVal + PAGE_SIZE - 1);

  const evList = events ?? [];

  // Présences pour ces événements
  const eventIds = evList.map(e => e.id);
  const [attendRes, membersRes, myAttendRes] = await Promise.all([
    eventIds.length > 0
      ? supabase.from("event_attendance")
          .select("event_id, user_id, profiles!event_attendance_user_id_fkey(first_name, last_name)")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    supabase.from("profiles")
      .select("id, first_name, last_name, role, groups, validated")
      .eq("validated", true)
      .order("first_name"),
    supabase.from("event_attendance")
      .select("event_id")
      .eq("user_id", user.id)
      .in("event_id", eventIds.length > 0 ? eventIds : ["none"]),
  ]);

  const members  = membersRes.data ?? [];
  const attends  = attendRes.data ?? [];
  const myCheckedEventIds = new Set((myAttendRes.data ?? []).map(a => a.event_id));

  // Construire la map event_id → Set<user_id>
  type AttendRow = {
    event_id: string;
    user_id: string;
    profiles?: { first_name: string | null; last_name: string | null } | null;
  };
  const attendMap: Record<string, Set<string>> = {};
  for (const a of (attends as unknown as AttendRow[])) {
    if (!attendMap[a.event_id]) attendMap[a.event_id] = new Set();
    attendMap[a.event_id]!.add(a.user_id);
  }

  // KPIs
  const totalMembers = members.length;
  const latestEvent  = evList[0];
  const latestCount  = latestEvent ? (attendMap[latestEvent.id]?.size ?? 0) : 0;
  const latestPrev   = evList[1]   ? (attendMap[evList[1].id]?.size ?? 0)   : null;
  const avgRate = evList.length > 0 && totalMembers > 0
    ? Math.round(evList.reduce((s, e) => s + (attendMap[e.id]?.size ?? 0), 0) / evList.length / totalMembers * 100) : 0;

  // Taux fidélité sur 3 derniers événements
  const last3 = evList.slice(0, 3);
  const fidelityMembers = last3.length > 0
    ? members.filter(m => last3.every(e => attendMap[e.id]?.has(m.id))).length : 0;
  const fidelityRate = totalMembers > 0 ? Math.round(fidelityMembers / totalMembers * 100) : 0;

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-arc-navy">Présences</h1>
          <p className="text-sm text-arc-text2 mt-0.5">Suivi des présences aux cultes et événements</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={undefined}
            className="px-4 py-2 rounded-xl border border-arc-border text-sm text-arc-navy hover:border-arc-navy transition-all"
          >
            📤 Exporter CSV
          </button>
          {isAdmin && (
            <Link href="/espace-membres/presences/stats"
              className="px-4 py-2 rounded-xl border border-arc-border text-sm text-arc-navy hover:border-arc-navy transition-all">
              📊 Statistiques
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-arc-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold font-serif text-arc-navy">{latestCount}</div>
          <div className="text-[11px] text-arc-text3 font-semibold mt-1">
            Présents — {latestEvent ? new Date(latestEvent.date + "T00:00:00").toLocaleDateString("fr-CH", { day:"numeric", month:"short" }) : "—"}
          </div>
          {latestPrev !== null && (
            <div className={`text-[10px] mt-0.5 font-semibold ${latestCount >= latestPrev ? "text-green-600" : "text-red-500"}`}>
              {latestCount >= latestPrev ? "↑" : "↓"} {latestCount >= latestPrev ? "+" : ""}{latestCount - latestPrev} vs précédent
            </div>
          )}
        </div>
        <div className="bg-white border border-arc-border rounded-2xl p-4 text-center">
          <div className={`text-2xl font-bold font-serif ${avgRate >= 60 ? "text-green-600" : avgRate >= 35 ? "text-amber-600" : "text-red-500"}`}>
            {avgRate}%
          </div>
          <div className="text-[11px] text-arc-text3 font-semibold mt-1">Taux de présence moyen</div>
        </div>
        <div className="bg-white border border-arc-border rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold font-serif text-arc-navy">{totalMembers}</div>
          <div className="text-[11px] text-arc-text3 font-semibold mt-1">Membres validés</div>
        </div>
        <div className="bg-white border border-arc-border rounded-2xl p-4 text-center">
          <div className={`text-2xl font-bold font-serif ${fidelityRate >= 80 ? "text-green-600" : "text-amber-600"}`}>
            {fidelityRate}%
          </div>
          <div className="text-[11px] text-arc-text3 font-semibold mt-1">Fidélité membres (3 cultes)</div>
          {fidelityRate >= 80 && <div className="text-[10px] text-green-600 mt-0.5 font-semibold">↑ Excellent</div>}
        </div>
      </div>

      {/* Table interactive */}
      <PresencesTable
        events={evList.map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          time_start: e.time_start,
          location: e.location,
        }))}
        members={members.map(m => ({
          id: m.id,
          first_name: m.first_name,
          last_name: m.last_name,
          groups: m.groups ?? [],
        }))}
        attendMap={Object.fromEntries(
          Object.entries(attendMap).map(([k, s]) => [k, Array.from(s)])
        )}
        totalEvents={totalEvents ?? 0}
        pageSize={PAGE_SIZE}
        offset={offsetVal}
        currentUserId={user.id}
        myCheckedEventIds={Array.from(myCheckedEventIds)}
        isAdmin={isAdmin}
      />

      {/* Note totale */}
      {latestEvent && latestCount > 0 && (
        <div className="mt-4 px-4 py-3 bg-arc-blueBg border-l-4 border-arc-blue rounded-r-xl text-sm text-arc-text2">
          💡 Dernier culte : <strong>{latestCount} présents</strong> sur {totalMembers} membres.
          {attendMap[latestEvent.id] && ` Taux : ${Math.round(latestCount / totalMembers * 100)}%.`}
        </div>
      )}
    </div>
  );
}
