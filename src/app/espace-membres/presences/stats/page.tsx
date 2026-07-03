import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GROUPS, getGroup } from "@/lib/groups";

export default async function PresencesStatsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "pasteur"].includes(me?.role ?? "")) redirect("/espace-membres");

  const today    = new Date().toISOString().split("T")[0];
  const from12   = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const from30   = new Date(Date.now() - 30  * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [eventsRes, attendRes, allMembersRes, rsvpRes] = await Promise.all([
    supabase.from("events").select("id, title, date, tags")
      .eq("is_published", true).gte("date", from12).lt("date", today).order("date"),
    supabase.from("event_attendance").select("event_id, user_id"),
    supabase.from("profiles").select("id, first_name, last_name, groups, validated, created_at"),
    supabase.from("event_rsvp").select("event_id, user_id, status"),
  ]);

  const events   = eventsRes.data ?? [];
  const attends  = attendRes.data ?? [];
  const members  = (allMembersRes.data ?? []).filter(m => m.validated);
  const rsvps    = rsvpRes.data ?? [];

  // ── Présences par événement (tendance sur 12 mois) ──
  const attendByEvent: Record<string, Set<string>> = {};
  for (const a of attends) {
    if (!attendByEvent[a.event_id]) attendByEvent[a.event_id] = new Set();
    attendByEvent[a.event_id]!.add(a.user_id);
  }

  // ── Présences par membre (classement) ──
  const memberAttendCount: Record<string, number> = {};
  for (const a of attends) {
    memberAttendCount[a.user_id] = (memberAttendCount[a.user_id] ?? 0) + 1;
  }

  // Membres les plus présents (top 10)
  const top10 = [...members]
    .sort((a, b) => (memberAttendCount[b.id] ?? 0) - (memberAttendCount[a.id] ?? 0))
    .slice(0, 10)
    .map(m => ({ ...m, count: memberAttendCount[m.id] ?? 0 }));

  // ── Membres inactifs depuis 30+ jours ──
  // Événements des 30 derniers jours
  const recentEvents = events.filter(e => e.date >= from30);
  const recentEventIds = new Set(recentEvents.map(e => e.id));
  const recentAttenders = new Set(
    attends.filter(a => recentEventIds.has(a.event_id)).map(a => a.user_id)
  );
  const inactiveMembers = members
    .filter(m => !recentAttenders.has(m.id))
    .sort((a, b) => (memberAttendCount[b.id] ?? 0) - (memberAttendCount[a.id] ?? 0));

  // ── Stats par groupe ──
  type GroupStat = { group: string; totalMembers: number; totalPresences: number; avgRate: number };
  const groupStats: GroupStat[] = [];
  for (const { name: group } of GROUPS) {
    const groupMembers = members.filter(m => (m.groups ?? []).includes(group));
    if (groupMembers.length === 0) continue;
    const gmIds = new Set(groupMembers.map(m => m.id));
    let totalPres = 0;
    for (const ev of events) {
      const presInGroup = Array.from(attendByEvent[ev.id] ?? new Set()).filter(uid => gmIds.has(uid)).length;
      totalPres += presInGroup;
    }
    const avgRate = events.length > 0 && groupMembers.length > 0
      ? Math.round((totalPres / events.length / groupMembers.length) * 100) : 0;
    groupStats.push({ group, totalMembers: groupMembers.length, totalPresences: totalPres, avgRate });
  }
  groupStats.sort((a, b) => b.avgRate - a.avgRate);

  // ── Tendance mensuelle (12 mois) ──
  const monthlyStats: { label: string; events: number; avgAttend: number; rate: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dEnd  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const mStr  = d.toISOString().split("T")[0].slice(0, 7);
    const mEvs  = events.filter(e => e.date.startsWith(mStr));
    const label = d.toLocaleDateString("fr-CH", { month: "short", year: "2-digit" });
    if (mEvs.length === 0) {
      monthlyStats.push({ label, events: 0, avgAttend: 0, rate: 0 });
    } else {
      const totalA = mEvs.reduce((s, e) => s + (attendByEvent[e.id]?.size ?? 0), 0);
      const avg    = Math.round(totalA / mEvs.length);
      const rate   = members.length > 0 ? Math.round((avg / members.length) * 100) : 0;
      monthlyStats.push({ label, events: mEvs.length, avgAttend: avg, rate });
    }
  }
  const maxRate = Math.max(...monthlyStats.map(m => m.rate), 1);

  return (
    <div className="max-w-4xl">
      <Link href="/espace-membres/presences"
        className="inline-flex items-center gap-1.5 text-sm text-arc-text3 hover:text-arc-navy mb-4 transition-colors">
        ← Calendrier des présences
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Statistiques Pastorales</h1>
        <p className="text-sm text-arc-text2 mt-0.5">Analyse des présences — 12 derniers mois</p>
      </div>

      {/* ── Tendance mensuelle ── */}
      <div className="bg-white border border-arc-border rounded-2xl p-5 mb-5">
        <h2 className="font-bold text-arc-navy mb-4">📈 Tendance mensuelle des présences</h2>
        <div className="flex items-end gap-2 h-32 overflow-x-auto pb-1">
          {monthlyStats.map(m => (
            <div key={m.label} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 40 }}>
              <span className="text-[9px] font-bold text-arc-text3">{m.rate > 0 ? m.rate + "%" : ""}</span>
              <div className="w-7 rounded-t-md transition-all"
                style={{
                  height: `${Math.max(4, (m.rate / maxRate) * 96)}px`,
                  backgroundColor: m.rate >= 60 ? "#22c55e" : m.rate >= 35 ? "#f59e0b" : m.rate > 0 ? "#ef4444" : "#e5e7eb",
                }}
              />
              <span className="text-[9px] text-arc-text3 text-center leading-tight">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-[10px] text-arc-text3">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500 inline-block"/>≥60%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"/>35–60%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400 inline-block"/>&lt;35%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-200 inline-block"/>Pas d'événement</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* ── Stats par groupe ── */}
        <div className="bg-white border border-arc-border rounded-2xl p-5">
          <h2 className="font-bold text-arc-navy mb-4">👥 Fidélité par groupe</h2>
          <div className="space-y-2">
            {groupStats.map(gs => {
            const g = getGroup(gs.group);
            const Icon = g.Icon;
            return (
              <div key={gs.group} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${g.bg} ${g.border}`}>
                  <Icon size={14} strokeWidth={2} className={g.color} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-arc-navy truncate">{gs.group}</span>
                    <span className={`text-xs font-bold ${gs.avgRate >= 60 ? "text-green-600" : gs.avgRate >= 35 ? "text-amber-600" : "text-red-500"}`}>
                      {gs.avgRate}%
                    </span>
                  </div>
                  <div className="w-full bg-arc-bg rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${gs.avgRate}%`,
                        backgroundColor: gs.avgRate >= 60 ? "#22c55e" : gs.avgRate >= 35 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-arc-text3 flex-shrink-0">{gs.totalMembers} mbr.</span>
              </div>
            );
          })}
          </div>
        </div>

        {/* ── Top 10 membres présents ── */}
        <div className="bg-white border border-arc-border rounded-2xl p-5">
          <h2 className="font-bold text-arc-navy mb-4">🏅 Top 10 membres les plus présents</h2>
          <div className="space-y-1.5">
            {top10.map((m, i) => {
              const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
              const rate = events.length > 0 ? Math.round((m.count / events.length) * 100) : 0;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-amber-600 text-white" : "bg-arc-bg text-arc-text3"
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-xs font-medium text-arc-navy truncate">{name}</span>
                  <span className="text-xs text-arc-text3">{m.count} fois</span>
                  <span className={`text-[10px] font-bold w-10 text-right ${rate >= 60 ? "text-green-600" : rate >= 35 ? "text-amber-600" : "text-red-500"}`}>
                    {rate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Membres inactifs ── */}
      <div className="bg-white border border-arc-border rounded-2xl p-5">
        <h2 className="font-bold text-arc-navy mb-1">⚠️ Membres inactifs depuis 30+ jours</h2>
        <p className="text-xs text-arc-text3 mb-4">Membres validés absents de tous les événements du dernier mois</p>

        {inactiveMembers.length === 0 ? (
          <p className="text-sm text-green-600 font-semibold">✓ Tous les membres sont actifs ce mois-ci !</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {inactiveMembers.slice(0, 40).map(m => {
              const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
              const total = memberAttendCount[m.id] ?? 0;
              return (
                <Link key={m.id} href={`/espace-membres/crm/${m.id}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:border-amber-400 transition-colors">
                  <span className="text-xs font-medium text-amber-800">{name}</span>
                  {total > 0 && <span className="text-[10px] text-amber-500">{total}× passé</span>}
                </Link>
              );
            })}
            {inactiveMembers.length > 40 && (
              <span className="text-xs text-arc-text3 self-center">+{inactiveMembers.length - 40} autres</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
