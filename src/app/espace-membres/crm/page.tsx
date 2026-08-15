import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import GroupBadge from "@/components/GroupBadge";
import MemberSidebar from "@/components/espace-membres/MemberSidebar";
import MemberRightPanel from "@/components/espace-membres/MemberRightPanel";
import { droits } from "@/lib/droits";
import { DONS_ENABLED } from "@/lib/features";
import { computeEngagement, ENGAGEMENT_META, type EngagementStatus } from "@/lib/crm/engagement";

const TAG_COLORS = [
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
  "bg-yellow-100 text-yellow-700",
  "bg-cyan-100 text-cyan-700",
];

const STAGES: { key: string; label: string; color: string; dot: string }[] = [
  { key: "visiteur",     label: "Visiteur",     color: "text-gray-600 bg-gray-50 border-gray-200",       dot: "bg-gray-400"   },
  { key: "integration",  label: "Intégration",  color: "text-amber-700 bg-amber-50 border-amber-200",    dot: "bg-amber-400"  },
  { key: "actif",        label: "Membre actif", color: "text-green-700 bg-green-50 border-green-200",    dot: "bg-green-500"  },
  { key: "formation",    label: "Formation",    color: "text-blue-700 bg-blue-50 border-blue-200",       dot: "bg-blue-500"   },
  { key: "responsable",  label: "Responsable",  color: "text-purple-700 bg-purple-50 border-purple-200", dot: "bg-purple-500" },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

export default async function CrmPage({
  searchParams,
}: {
  searchParams?: { q?: string; stage?: string; tag?: string; group?: string; engagement?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase
    .from("profiles")
    .select("role, groups, managed_groups, first_name, last_name, email, avatar_url")
    .eq("id", user.id)
    .single();
  const meGroupsCrm = (me?.groups as string[] | null) ?? [];
  const hasCrmAccess =
    ["admin", "pasteur"].includes(me?.role ?? "") ||
    meGroupsCrm.includes("suivi") ||
    meGroupsCrm.includes("support");
  if (!hasCrmAccess) redirect("/espace-membres");

  const q          = searchParams?.q?.trim().toLowerCase() ?? "";
  const stage      = searchParams?.stage ?? "";
  const tag        = searchParams?.tag ?? "";
  const group      = searchParams?.group ?? "";
  const engagement = searchParams?.engagement ?? "";
  const hasFilter  = !!(q || stage || tag || group || engagement);

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, validated, groups, avatar_url, country, crm_tags, created_at, pastoral_stage")
    .order("created_at", { ascending: false });

  const all = members ?? [];

  // Engagement par membre (Phase 5 : segmentation) — agrégation JS des présences + interactions
  const since90 = Date.now() - 90 * 24 * 3600 * 1000;
  const [attAll, intAll] = await Promise.all([
    supabase.from("event_attendance").select("user_id, checked_in_at"),
    supabase.from("member_interactions").select("member_id, occurred_at"),
  ]);
  const lastAttMap = new Map<string, string>();
  const count90Map = new Map<string, number>();
  for (const a of attAll.data ?? []) {
    const uid = a.user_id as string; const at = a.checked_in_at as string | null;
    if (!at) continue;
    if (!lastAttMap.has(uid) || new Date(at) > new Date(lastAttMap.get(uid)!)) lastAttMap.set(uid, at);
    if (new Date(at).getTime() >= since90) count90Map.set(uid, (count90Map.get(uid) ?? 0) + 1);
  }
  const lastIntMap = new Map<string, string>();
  for (const it of intAll.data ?? []) {
    const mid = it.member_id as string; const at = it.occurred_at as string | null;
    if (!at) continue;
    if (!lastIntMap.has(mid) || new Date(at) > new Date(lastIntMap.get(mid)!)) lastIntMap.set(mid, at);
  }
  const engMap = new Map<string, EngagementStatus>();
  for (const m of all) {
    const id = m.id as string;
    engMap.set(id, computeEngagement({
      lastAttendanceAt:   lastAttMap.get(id) ?? null,
      attendanceCount90d: count90Map.get(id) ?? 0,
      lastInteractionAt:  lastIntMap.get(id) ?? null,
    }).status);
  }

  // Note counts per member
  const { data: noteCounts } = await supabase.from("member_notes").select("member_id");
  const noteMap: Record<string, number> = {};
  for (const n of noteCounts ?? []) noteMap[n.member_id] = (noteMap[n.member_id] ?? 0) + 1;

  // Relances : notes avec followup_date dans les 7 prochains jours
  const todayStr    = new Date().toISOString().split("T")[0];
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const { data: reminderNotes } = await supabase
    .from("member_notes")
    .select("id, content, followup_date, member_id")
    .not("followup_date", "is", null)
    .gte("followup_date", todayStr)
    .lte("followup_date", nextWeekStr)
    .order("followup_date");

  // Fetch member names for reminders
  const reminderMemberIds = Array.from(new Set((reminderNotes ?? []).map(r => r.member_id)));
  let reminderMemberMap: Record<string, { id: string; first_name: string | null; last_name: string | null }> = {};
  if (reminderMemberIds.length > 0) {
    const { data: remMbrs } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", reminderMemberIds);
    reminderMemberMap = Object.fromEntries((remMbrs ?? []).map(m => [m.id, m]));
  }

  // Pipeline counts
  const stageCounts: Record<string, number> = {};
  for (const m of all) {
    const s = (m.pastoral_stage as string | null) ?? "visiteur";
    stageCounts[s] = (stageCounts[s] ?? 0) + 1;
  }

  // Filter
  const validated = all.filter(m => m.validated);
  const pending   = all.filter(m => !m.validated);

  const filtered = all.filter(m => {
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ").toLowerCase();
    const matchQ = !q || name.includes(q) || (m.crm_tags ?? []).some((t: string) => t.toLowerCase().includes(q));
    const matchStage = !stage || (m.pastoral_stage ?? "visiteur") === stage;
    const matchTag = !tag || (m.crm_tags ?? []).includes(tag);
    const matchGroup = !group || (m.groups ?? []).includes(group);
    const matchEng = !engagement || engMap.get(m.id as string) === engagement;
    return matchQ && matchStage && matchTag && matchGroup && matchEng;
  });

  const filteredValidated = filtered.filter(m => m.validated);
  const filteredPending   = filtered.filter(m => !m.validated);

  // Tags & fonctions disponibles (pour les filtres de segmentation)
  const allTags = Array.from(new Set(all.flatMap(m => (m.crm_tags as string[] | null) ?? []))).sort();
  const allGroups = Array.from(new Set(all.flatMap(m => (m.groups as string[] | null) ?? []))).sort();

  // Construit une URL de filtre en préservant les autres critères (segments combinables)
  const current = { q, stage, tag, group, engagement };
  const seg = (overrides: Partial<typeof current>): string => {
    const merged = { ...current, ...overrides };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, String(v));
    const s = sp.toString();
    return "/espace-membres/crm" + (s ? `?${s}` : "");
  };

  // Communication ciblée (Phase 6) — réservée admin/pasteur/communication
  const canSend = ["admin", "pasteur"].includes(me?.role ?? "") || meGroupsCrm.includes("communication");
  const canFinance = ["admin", "pasteur"].includes(me?.role ?? "") || meGroupsCrm.includes("finance");
  const commUrl = seg({}).replace("/espace-membres/crm", "/espace-membres/crm/communication");
  const byRole  = all.reduce((acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  const managedGroups = ((me as { managed_groups?: string[] } | null)?.managed_groups ?? []);
  const sidebarPerms = {
    canAdmin: ["admin", "pasteur"].includes(me?.role ?? "") || meGroupsCrm.includes("communication") || meGroupsCrm.includes("support"),
    peutVoirCRM: droits.peutVoirCRM(me ?? {}),
    isManager: managedGroups.length > 0,
    donsEnabled: DONS_ENABLED,
    hasGroups: meGroupsCrm.length > 0,
  };
  const sidebarUser = {
    displayName: me
      ? `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || (me.email ?? "Membre")
      : "Membre",
    initiale: (me?.first_name?.[0] ?? me?.email?.[0] ?? "?").toUpperCase(),
    role: me?.role ?? "membre",
    avatarUrl: (me?.avatar_url as string | null) ?? null,
  };

  return (
    <>
    <MemberSidebar perms={sidebarPerms} user={sidebarUser} membresValides={validated.length} />
    <MemberRightPanel membresValides={validated.length} visiteurs={pending.length} totalUsers={all.length}
      prayerCount={(await supabase.from("prayer_requests").select("*", { count: "exact", head: true }).eq("is_answered", false)).count ?? 0} />
    <div className="min-[821px]:ml-[220px] min-[1280px]:mr-[264px] max-w-[1200px] px-4 md:px-6 pt-6 pb-24">

      {/* En-tête — portage maquette Stitch (CRM) */}
      <div className="mb-10">
        <h1 className="text-[40px] md:text-[48px] md:leading-[56px] md:tracking-[-0.02em] leading-tight font-bold text-[#000666]" style={{ fontFamily: '"Playfair Display", serif' }}>
          CRM Pastoral
        </h1>
        <p className="text-[18px] text-[#454652] mt-2">{all.length} membres · vue d&apos;ensemble de la communauté</p>
      </div>

      {/* Stats — cartes maquette (label + grand nombre serif + icône) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total membres", val: all.length,         color: "text-[#1a237e]", icon: "group" },
          { label: "Validés",       val: validated.length,   color: "text-green-700", icon: "verified" },
          { label: "En attente",    val: pending.length,     color: "text-amber-600", icon: "hourglass_empty" },
          { label: "Rôle membre",   val: byRole.membre ?? 0, color: "text-[#4c56af]", icon: "badge" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#e6e9f4] rounded-xl p-5 shadow-[0_4px_20px_rgba(26,35,126,0.05)]">
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#767683]">{s.label}</span>
              <span className="material-symbols-outlined text-[20px] text-[#8690ee]" aria-hidden="true">{s.icon}</span>
            </div>
            <div className={`text-[32px] font-bold mt-2 ${s.color}`} style={{ fontFamily: '"Playfair Display", serif' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Pipeline pastoral */}
      <div className="bg-white border border-[#c6c5d4] rounded-2xl p-4 mb-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#000666] mb-3">Pipeline de suivi pastoral</div>
        <div className="grid grid-cols-5 gap-2">
          {STAGES.map(s => {
            const count = stageCounts[s.key] ?? 0;
            const isActive = stage === s.key;
            return (
              <a
                key={s.key}
                href={seg({ stage: isActive ? "" : s.key })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${isActive ? s.color + " ring-2 ring-offset-1 ring-[#000666]/20" : "border-[#c6c5d4] hover:border-[#000666]/30 hover:bg-[#f3f4f5]"}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <div className="font-bold text-xl text-[#000666]">{count}</div>
                <div className="text-[10px] font-semibold text-[#767683] leading-tight">{s.label}</div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Segmentation dynamique (Phase 5) */}
      <div className="bg-white border border-[#c6c5d4] rounded-2xl p-4 mb-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#000666]">Segments & filtres</div>
          <div className="flex items-center gap-3">
            {canSend && (
              <Link href={commUrl} className="text-[11px] font-semibold text-white bg-[#000666] hover:bg-[#1a237e] px-2.5 py-1 rounded-full transition-colors">
                ✉️ Contacter ce segment
              </Link>
            )}
            <Link href="/espace-membres/crm/tableau-de-bord" className="text-[11px] font-semibold text-[#000666] hover:underline">📈 Tableau de bord</Link>
            <Link href="/espace-membres/crm/taches" className="text-[11px] font-semibold text-[#000666] hover:underline">✅ Tâches</Link>
            <Link href="/espace-membres/crm/formations" className="text-[11px] font-semibold text-[#000666] hover:underline">🎓 Formations</Link>
            <Link href="/espace-membres/crm/desengagement" className="text-[11px] font-semibold text-[#000666] hover:underline">📊 Alertes désengagement →</Link>
            {canFinance && <Link href="/espace-membres/crm/dons" className="text-[11px] font-semibold text-[#000666] hover:underline">💶 Dons &amp; finances</Link>}
          </div>
        </div>

        {/* Engagement */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-[#767683] w-16 flex-shrink-0">Engagement</span>
          {(Object.keys(ENGAGEMENT_META) as EngagementStatus[]).map(st => {
            const meta = ENGAGEMENT_META[st];
            const active = engagement === st;
            return (
              <a key={st} href={seg({ engagement: active ? "" : st })}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${active ? meta.cls + " ring-2 ring-offset-1 ring-[#000666]/20" : "border-[#c6c5d4] text-[#767683] hover:border-[#000666]/40"}`}>
                {meta.emoji} {meta.label}
              </a>
            );
          })}
        </div>

        {/* Fonctions */}
        {allGroups.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-[#767683] w-16 flex-shrink-0">Fonction</span>
            {allGroups.map(g => {
              const active = group === g;
              return (
                <a key={g} href={seg({ group: active ? "" : g })}
                  className={`rounded-full transition-all ${active ? "ring-2 ring-offset-1 ring-[#000666]/30" : "opacity-80 hover:opacity-100"}`}>
                  <GroupBadge name={g} size="sm" />
                </a>
              );
            })}
          </div>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-[#767683] w-16 flex-shrink-0">Tags</span>
            {allTags.map((t, i) => {
              const active = tag === t;
              return (
                <a key={t} href={seg({ tag: active ? "" : t })}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all ${TAG_COLORS[i % TAG_COLORS.length]} ${active ? "ring-2 ring-offset-1 ring-[#000666]/30" : "opacity-80 hover:opacity-100"}`}>
                  {t}
                </a>
              );
            })}
          </div>
        )}

        {hasFilter && (
          <div className="pt-1">
            <a href="/espace-membres/crm" className="text-[11px] font-semibold text-red-500 hover:underline">✕ Réinitialiser tous les filtres</a>
          </div>
        )}
      </div>

      {/* Relances à venir */}
      {(reminderNotes ?? []).length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            🔔 Relances de la semaine ({reminderNotes?.length})
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl divide-y divide-amber-100">
            {(reminderNotes ?? []).map(r => {
              const mb = reminderMemberMap[r.member_id];
              const name = mb ? [mb.first_name, mb.last_name].filter(Boolean).join(" ") || "Membre" : "Membre";
              const date = new Date(r.followup_date + "T00:00:00").toLocaleDateString("fr-CH", { weekday: "short", day: "numeric", month: "short" });
              return (
                <Link
                  key={r.id}
                  href={`/espace-membres/crm/${r.member_id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-amber-100/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="text-[10px] font-bold text-amber-700 bg-amber-200 rounded-lg px-2 py-1 text-center leading-none">
                      {date}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#000666] text-sm">{name}</div>
                    <div className="text-xs text-[#767683] truncate">{r.content}</div>
                  </div>
                  <span className="text-[#767683] text-sm flex-shrink-0">→</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recherche */}
      <form action="/espace-membres/crm" method="GET" className="mb-4 flex gap-2">
        {stage      && <input type="hidden" name="stage" value={stage} />}
        {tag        && <input type="hidden" name="tag" value={tag} />}
        {group      && <input type="hidden" name="group" value={group} />}
        {engagement && <input type="hidden" name="engagement" value={engagement} />}
        <input
          name="q"
          type="text"
          defaultValue={q}
          placeholder="Rechercher par nom ou tag…"
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#c6c5d4] text-sm outline-none focus:border-[#000666] transition-colors bg-white"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-[#000666] text-white text-sm font-bold hover:bg-[#1a237e] transition-colors"
        >
          Rechercher
        </button>
        {hasFilter && (
          <a
            href="/espace-membres/crm"
            className="px-4 py-2.5 rounded-xl border border-[#c6c5d4] text-sm text-[#767683] hover:border-[#000666] hover:text-[#000666] transition-colors"
          >
            ✕ Effacer
          </a>
        )}
      </form>

      {hasFilter && (
        <div className="mb-3 text-sm text-[#767683]">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          {stage      && <span> · Étape : <strong className="text-[#000666]">{STAGE_MAP[stage]?.label ?? stage}</strong></span>}
          {engagement && <span> · Engagement : <strong className="text-[#000666]">{ENGAGEMENT_META[engagement as EngagementStatus]?.label ?? engagement}</strong></span>}
          {group      && <span> · Fonction : <strong className="text-[#000666]">{group}</strong></span>}
          {tag        && <span> · Tag : <strong className="text-[#000666]">{tag}</strong></span>}
          {q          && <span> · Recherche : <strong className="text-[#000666]">{q}</strong></span>}
        </div>
      )}

      {/* Kanban pastoral — vue maquette (colonnes par étape) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#000666]">
          Pipeline pastoral · {filtered.length} membre{filtered.length !== 1 ? "s" : ""}
        </h2>
        {filteredPending.length > 0 && (
          <span className="text-[11px] font-semibold text-amber-600">⏳ {filteredPending.length} en attente</span>
        )}
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#c6c5d4] rounded-2xl py-10 text-center text-[#767683] text-sm">
          Aucun membre trouvé.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1 pb-2">
          <div className="flex gap-3 items-start min-w-max">
            {STAGES.map(s => {
              const col = filtered.filter(m => (m.pastoral_stage ?? "visiteur") === s.key);
              return (
                <div key={s.key} className="w-[264px] flex-none rounded-2xl p-3 flex flex-col gap-2.5" style={{ background: "#f1f3fb" }}>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                      <span className="text-xs font-bold text-[#454652]">{s.label}</span>
                    </div>
                    <span className="text-[11px] text-[#767683]">{col.length}</span>
                  </div>
                  {col.length === 0
                    ? <div className="text-[11px] text-[#767683] text-center py-5">—</div>
                    : col.map(m => (
                        <KanbanCard key={m.id} member={m} noteCount={noteMap[m.id] ?? 0} engStatus={engMap.get(m.id as string)} />
                      ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

function KanbanCard({ member: m, noteCount, engStatus }: {
  member: {
    id: string; first_name: string | null; last_name: string | null;
    role: string; validated: boolean; groups: string[] | null;
    avatar_url: string | null; country: string | null;
    crm_tags: string[] | null; created_at: string;
    pastoral_stage: string | null;
  };
  noteCount: number;
  engStatus?: EngagementStatus;
}) {
  const fullName = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
  const initiale = (m.first_name?.[0] ?? "?").toUpperCase();
  const tags = m.crm_tags ?? [];
  const eng  = engStatus ? ENGAGEMENT_META[engStatus] : null;

  return (
    <Link
      href={`/espace-membres/crm/${m.id}`}
      className="bg-white border border-[#c6c5d4] rounded-xl p-3 flex flex-col gap-2 hover:border-[#000666]/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${m.validated ? "bg-[#000666]" : "bg-amber-100"}`}>
          {m.avatar_url
            ? <Image src={m.avatar_url} alt={fullName} width={32} height={32} className="w-full h-full object-cover" />
            : <span className={`font-bold text-[11px] ${m.validated ? "text-white" : "text-amber-700"}`}>{initiale}</span>}
        </div>
        <span className="flex-1 min-w-0 text-[12.5px] font-medium text-[#191c1d] truncate group-hover:text-[#000666] transition-colors">{fullName}</span>
        {eng && <span title={`Engagement : ${eng.label}`} className={`w-2 h-2 rounded-full flex-shrink-0 ${eng.dot}`} aria-hidden />}
      </div>
      {(!m.validated || (m.groups ?? []).length > 0 || noteCount > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {!m.validated && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">En attente</span>}
          {(m.groups ?? []).slice(0, 2).map((g) => (
            <GroupBadge key={g} name={g} size="sm" showLabel={false} />
          ))}
          {noteCount > 0 && <span className="text-[10px] text-[#767683]">📝 {noteCount}</span>}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {tags.slice(0, 3).map((t, i) => (
            <span key={t} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${TAG_COLORS[i % TAG_COLORS.length]}`}>{t}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
