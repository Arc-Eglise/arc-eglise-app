import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import PresencesTable from "./PresencesTable";
import HrBoard from "./HrBoard";
import DeclareAbsence from "./DeclareAbsence";
import ExportCsvButton from "./ExportCsvButton";
import type { HrRecord, HrDeclaration } from "@/lib/actions/hr";

export default async function PresencesPage({
  searchParams,
}: {
  searchParams: { offset?: string; tab?: string; hrdate?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, validated, groups")
    .eq("id", user.id)
    .single();

  const isAdmin = ["admin", "pasteur"].includes(me?.role ?? "");
  // Encadrement RH = admin | pasteur | fonction "support" (miroir de la RLS hr_attendance)
  const isEncadrement = isAdmin || ((me?.groups as string[] | null) ?? []).includes("support");

  // Onglet actif : « evenements » (présence aux cultes, défaut) ou « rh »
  const tab = searchParams?.tab === "rh" && isEncadrement ? "rh" : "evenements";
  const hrDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams?.hrdate ?? "")
    ? searchParams!.hrdate!
    : new Date().toISOString().split("T")[0];

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

  // Données RH du jour (onglet RH) — source réelle Supabase, vide si aucune saisie
  const hrRecords: HrRecord[] = tab === "rh"
    ? (((await supabase.from("hr_attendance").select("*").eq("date", hrDate)).data ?? []) as HrRecord[])
    : [];

  // Déclarations RH du membre courant (self-service) — source réelle Supabase
  const myDeclarations: HrDeclaration[] =
    ((await supabase.from("hr_declarations").select("*").eq("member_id", user.id).order("start_date", { ascending: false })).data ?? []) as HrDeclaration[];

  // Toutes les déclarations (vue encadrement, onglet RH) — RLS filtre l'accès
  const allDeclarations: HrDeclaration[] = tab === "rh"
    ? (((await supabase.from("hr_declarations").select("*").order("start_date", { ascending: false }).limit(100)).data ?? []) as HrDeclaration[])
    : [];
  const memberName = (id: string) => {
    const m = members.find(x => x.id === id);
    return m ? ([m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre") : "Membre";
  };
  const DECL_LABEL: Record<string, string> = {
    retard: "Retard", absent: "Absence", conge: "Congé", vacances: "Vacances", maladie: "Maladie", distance: "À distance",
  };

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

  // Export CSV réel (présences par membre × événement) — alimente le bouton Exporter
  const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csvHeader = ["Membre", "Fonction(s)", ...evList.map(e => `${e.title} (${e.date})`), "Total présences"].map(csvEscape).join(",");
  const csvRows = members.map(m => {
    const name   = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
    const groups = (m.groups ?? []).join(" / ");
    const cells  = evList.map(e => attendMap[e.id]?.has(m.id) ? "présent" : "");
    const total  = evList.filter(e => attendMap[e.id]?.has(m.id)).length;
    return [name, groups, ...cells, String(total)].map(csvEscape).join(",");
  });
  const presencesCsv = [csvHeader, ...csvRows].join("\r\n");

  return (
    <div>
      <BackButton href="/espace-membres" label="Espace membres" className="mb-6" />
      {/* En-tête éditorial (maquette Sacred Modernity) */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-[40px] md:text-[48px] leading-tight font-bold text-[#1a237e] tracking-tight" style={{ fontFamily: '"Playfair Display", serif' }}>
            Présences
          </h1>
          <p className="text-[#454652] mt-2">Vue d&apos;ensemble et pointage — cultes et personnel de l&apos;ARC.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <ExportCsvButton csv={presencesCsv} filename={`presences-arc-${today}.csv`} />
          {isAdmin && (
            <Link href="/espace-membres/presences/stats"
              className="px-4 py-2.5 rounded-lg bg-[#1a237e] text-white text-sm font-semibold hover:bg-[#000666] transition-all inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">bar_chart</span> Statistiques
            </Link>
          )}
        </div>
      </div>

      {/* Onglets : présence aux événements (défaut) | RH (encadrement) */}
      <div className="inline-flex rounded-full border border-[#c6c5d4] bg-white p-1 mb-8 shadow-sm">
        <Link
          href="/espace-membres/presences"
          className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${tab === "evenements" ? "bg-[#1a237e] text-white" : "text-[#454652] hover:text-[#1a237e]"}`}
        >
          Présence aux événements
        </Link>
        {isEncadrement && (
          <Link
            href="/espace-membres/presences?tab=rh"
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${tab === "rh" ? "bg-[#1a237e] text-white" : "text-[#454652] hover:text-[#1a237e]"}`}
          >
            RH
          </Link>
        )}
      </div>

      {tab === "rh" ? (
        <>
          {/* Déclarations des membres (self-service) — vue encadrement, lecture seule */}
          <div className="bg-white border border-arc-border rounded-xl p-4 shadow-sm mb-5">
            <div className="font-serif text-lg text-arc-navy mb-3">Déclarations des membres</div>
            {allDeclarations.length === 0 ? (
              <p className="text-sm text-arc-text3">Aucune déclaration pour le moment.</p>
            ) : (
              <div className="divide-y divide-arc-border/60">
                {allDeclarations.map(d => (
                  <div key={d.id} className="flex items-center gap-3 py-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-arc-navy min-w-[140px]">{memberName(d.member_id)}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-arc-blueBg text-arc-blue">{DECL_LABEL[d.type] ?? d.type}</span>
                    <span className="text-xs text-arc-text2">
                      du {new Date(d.start_date + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "short" })} au {new Date(d.return_date + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {d.note && <span className="text-xs text-arc-text3 truncate">— {d.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <HrBoard
            members={members.map(m => ({ id: m.id, first_name: m.first_name, last_name: m.last_name, groups: m.groups ?? [] }))}
            date={hrDate}
            initialRecords={hrRecords}
          />
        </>
      ) : (
      <>
      {/* Self-service : déclaration d'absence / congé / retard par le membre */}
      <DeclareAbsence initialDeclarations={myDeclarations} />

      {/* KPIs — charte Sacred Modernity (label + grand nombre + icône) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-arc-border rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-arc-text3">
              Présents · {latestEvent ? new Date(latestEvent.date + "T00:00:00").toLocaleDateString("fr-CH", { day:"numeric", month:"short" }) : "—"}
            </span>
            <span className="text-arc-blue" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
          </div>
          <div className="text-3xl font-bold font-serif text-arc-navy mt-2">{latestCount}</div>
          {latestPrev !== null && (
            <div className={`text-[11px] mt-1 font-semibold ${latestCount >= latestPrev ? "text-green-600" : "text-red-500"}`}>
              {latestCount >= latestPrev ? "↑" : "↓"} {latestCount >= latestPrev ? "+" : ""}{latestCount - latestPrev} vs précédent
            </div>
          )}
        </div>
        <div className="bg-white border border-arc-border rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-arc-text3">Taux de présence moyen</span>
            <span className="text-arc-blue" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            </span>
          </div>
          <div className={`text-3xl font-bold font-serif mt-2 ${avgRate >= 60 ? "text-green-600" : avgRate >= 35 ? "text-amber-600" : "text-red-500"}`}>{avgRate}%</div>
        </div>
        <div className="bg-white border border-arc-border rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-arc-text3">Membres validés</span>
            <span className="text-arc-blue" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            </span>
          </div>
          <div className="text-3xl font-bold font-serif text-arc-navy mt-2">{totalMembers}</div>
        </div>
        <div className="bg-white border border-arc-border rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-arc-text3">Fidélité · 3 cultes</span>
            <span className="text-arc-gold" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
            </span>
          </div>
          <div className={`text-3xl font-bold font-serif mt-2 ${fidelityRate >= 80 ? "text-green-600" : "text-amber-600"}`}>{fidelityRate}%</div>
          {fidelityRate >= 80 && <div className="text-[11px] text-green-600 mt-1 font-semibold">↑ Excellent</div>}
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
      </>
      )}
    </div>
  );
}
