import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import AdminCheckInPanel from "./AdminCheckInPanel";
import { getGroup, GROUPS } from "@/lib/groups";

export default async function PresenceEventPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = ["admin", "pasteur"].includes(me?.role ?? "");
  if (!isAdmin) redirect("/espace-membres");

  // Charger l'événement
  const { data: event } = await supabase.from("events")
    .select("id, title, description, date, time_start, time_end, location, capacity, tags")
    .eq("id", params.id)
    .single();
  if (!event) notFound();

  const today = new Date().toISOString().split("T")[0];
  const isPast = event.date < today;

  // Charger tous les membres validés avec leurs groupes
  const { data: allMembers } = await supabase.from("profiles")
    .select("id, first_name, last_name, role, groups, avatar_url")
    .eq("validated", true)
    .order("first_name");

  // Charger les présences pour cet événement
  const { data: attendances } = await supabase.from("event_attendance")
    .select("user_id, checked_in_at, checked_in_by")
    .eq("event_id", params.id);

  const presentIds = new Set((attendances ?? []).map(a => a.user_id));
  const members    = allMembers ?? [];
  const presentSet = new Set(presentIds);

  // Séparer présents / absents
  const presentMembers = members.filter(m => presentSet.has(m.id));
  const absentMembers  = members.filter(m => !presentSet.has(m.id));
  const rate = members.length > 0 ? Math.round((presentMembers.length / members.length) * 100) : 0;

  function groupBy(list: typeof members) {
    const byGroup: Record<string, typeof members> = {};
    const noGroup: typeof members = [];
    for (const m of list) {
      const mGroups = m.groups ?? [];
      if (mGroups.length === 0) {
        noGroup.push(m);
      } else {
        for (const g of mGroups) {
          if (!byGroup[g]) byGroup[g] = [];
          byGroup[g]!.push(m);
        }
      }
    }
    return { byGroup, noGroup };
  }

  const { byGroup: presentByGroup, noGroup: presentNoGroup } = groupBy(presentMembers);
  const { byGroup: absentByGroup,  noGroup: absentNoGroup  } = groupBy(absentMembers);

  // Tous les groupes qui ont au moins 1 membre (présent ou absent)
  const allGroupsInEvent = new Set([
    ...Object.keys(presentByGroup),
    ...Object.keys(absentByGroup),
  ]);
  const sortedGroups = GROUPS.map(g => g.name).filter(g => allGroupsInEvent.has(g));

  // RSVP counts
  const { data: rsvpData } = await supabase.from("event_rsvp")
    .select("status").eq("event_id", params.id);
  const rsvpGoing = (rsvpData ?? []).filter(r => r.status === "going").length;

  return (
    <div className="max-w-5xl">
      <Link href="/espace-membres/presences"
        className="inline-flex items-center gap-1.5 text-sm text-arc-text3 hover:text-arc-navy mb-4 transition-colors">
        ← Calendrier des présences
      </Link>

      {/* En-tête événement */}
      <div className="bg-white border border-arc-border rounded-2xl p-5 mb-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`flex-shrink-0 text-center rounded-xl px-5 py-3 ${isPast ? "bg-gray-100" : "bg-arc-blueBg"}`}>
            <div className={`font-serif text-4xl font-bold leading-none ${isPast ? "text-arc-text3" : "text-arc-navy"}`}>
              {new Date(event.date + "T00:00:00").getDate()}
            </div>
            <div className={`text-[10px] font-bold uppercase mt-1 ${isPast ? "text-arc-text3" : "text-arc-blue"}`}>
              {new Date(event.date + "T00:00:00").toLocaleDateString("fr-CH", { month: "short", year: "numeric" })}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-bold text-arc-navy mb-1">{event.title}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-arc-text3">
              {event.time_start && <span>🕐 {event.time_start.slice(0,5)}{event.time_end ? ` — ${event.time_end.slice(0,5)}` : ""}</span>}
              {event.location   && <span>📍 {event.location}</span>}
            </div>
            {event.description && <p className="text-sm text-arc-text2 mt-2">{event.description}</p>}
          </div>
        </div>
      </div>

      {/* Stats présences */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Membres validés",  val: members.length,          color: "text-arc-navy"   },
          { label: "Présents",         val: presentMembers.length,    color: "text-green-600"  },
          { label: "Absents",          val: absentMembers.length,     color: "text-red-500"    },
          { label: "Taux présence",    val: isPast ? rate + "%" : "—", color: rate >= 60 ? "text-green-600" : rate >= 35 ? "text-amber-600" : "text-red-500" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-arc-border rounded-2xl p-4 text-center">
            <div className={`text-2xl font-bold font-serif ${s.color}`}>{s.val}</div>
            <div className="text-[11px] text-arc-text3 font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {rsvpGoing > 0 && (
        <div className="bg-arc-bg border border-arc-border rounded-xl px-4 py-2 mb-5 text-sm text-arc-text2 flex gap-4 flex-wrap">
          <span>RSVP "J'y vais" : <strong>{rsvpGoing}</strong></span>
          {isPast && <span>Présents réels : <strong>{presentMembers.length}</strong></span>}
          {isPast && rsvpGoing > 0 && <span>Taux confirmation : <strong>{Math.round(presentMembers.length / rsvpGoing * 100)}%</strong></span>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Colonne présents ── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">
            ✓ Présents ({presentMembers.length})
          </h2>
          <div className="space-y-3">
            {/* Par groupe */}
            {sortedGroups.map(g => {
              const pres = presentByGroup[g] ?? [];
              if (pres.length === 0) return null;
              return (
                <GroupSection key={g} groupName={g} members={pres} type="present" />
              );
            })}
            {/* Sans groupe */}
            {presentNoGroup.length > 0 && (
              <GroupSection groupName="Sans groupe" members={presentNoGroup} type="present" />
            )}
            {presentMembers.length === 0 && (
              <div className="bg-white border border-arc-border rounded-xl p-4 text-sm text-arc-text3">
                {isPast ? "Aucune présence enregistrée." : "L'événement n'a pas encore eu lieu."}
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne absents ── */}
        {isPast && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">
              ✗ Absents ({absentMembers.length})
            </h2>
            <div className="space-y-3">
              {sortedGroups.map(g => {
                const abs = absentByGroup[g] ?? [];
                if (abs.length === 0) return null;
                return (
                  <GroupSection key={g} groupName={g} members={abs} type="absent" />
                );
              })}
              {absentNoGroup.length > 0 && (
                <GroupSection groupName="Sans groupe" members={absentNoGroup} type="absent" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Panel check-in admin */}
      <div className="mt-6">
        <AdminCheckInPanel
          eventId={params.id}
          allMembers={members.map(m => ({
            id: m.id,
            name: [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre",
            checked: presentSet.has(m.id),
          }))}
        />
      </div>
    </div>
  );
}

function GroupSection({ groupName, members, type }: {
  groupName: string;
  members: { id: string; first_name: string | null; last_name: string | null }[];
  type: "present" | "absent";
}) {
  const g    = getGroup(groupName);
  const Icon = g.Icon;
  return (
    <div className="bg-white border border-arc-border rounded-xl overflow-hidden">
      <div className={`px-3 py-2.5 flex items-center gap-2.5 border-b border-arc-border ${type === "present" ? "bg-green-50/50" : "bg-red-50/50"}`}>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${g.bg} ${g.border} border`}>
          <Icon size={14} strokeWidth={2} className={g.color} />
        </span>
        <span className="text-xs font-bold text-arc-navy">{groupName}</span>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${type === "present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
          {members.length}
        </span>
      </div>
      <div className="p-3 flex flex-wrap gap-1.5">
        {members.map(m => {
          const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
          return (
            <span key={m.id} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              type === "present"
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-500 border-red-200"
            }`}>
              {type === "present" ? "✓ " : "✗ "}{name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
