import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import GroupBadge from "@/components/GroupBadge";
import { computeEngagement, ENGAGEMENT_META, type EngagementStatus } from "@/lib/crm/engagement";

const ROLE_STYLE: Record<string, string> = {
  admin:    "text-red-700 bg-red-50 border-red-200",
  pasteur:  "text-purple-700 bg-purple-50 border-purple-200",
  support:  "text-blue-700 bg-blue-50 border-blue-200",
  membre:   "text-green-700 bg-green-50 border-green-200",
  visiteur: "text-gray-700 bg-gray-50 border-gray-200",
};

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

  const { data: me } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
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

  const showAll = !hasFilter;

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
  const commUrl = seg({}).replace("/espace-membres/crm", "/espace-membres/crm/communication");
  const byRole  = all.reduce((acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <Link href="/espace-membres" className="inline-flex items-center gap-1.5 text-sm text-arc-blue hover:text-arc-navy mb-5 transition-colors">
        ← Espace Membres
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">CRM Pastoral</h1>
        <p className="text-sm text-arc-text2 mt-0.5">{all.length} membres enregistrés</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total",      val: all.length,         color: "text-arc-navy"  },
          { label: "Validés",    val: validated.length,   color: "text-green-600" },
          { label: "En attente", val: pending.length,     color: "text-amber-600" },
          { label: "Membres",    val: byRole.membre ?? 0, color: "text-arc-blue"  },
        ].map(s => (
          <div key={s.label} className="bg-white border border-arc-border rounded-2xl p-4 text-center">
            <div className={`text-3xl font-bold font-serif ${s.color}`}>{s.val}</div>
            <div className="text-xs text-arc-text3 font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline pastoral */}
      <div className="bg-white border border-arc-border rounded-2xl p-4 mb-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-arc-blue mb-3">Pipeline de suivi pastoral</div>
        <div className="grid grid-cols-5 gap-2">
          {STAGES.map(s => {
            const count = stageCounts[s.key] ?? 0;
            const isActive = stage === s.key;
            return (
              <a
                key={s.key}
                href={seg({ stage: isActive ? "" : s.key })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${isActive ? s.color + " ring-2 ring-offset-1 ring-arc-navy/20" : "border-arc-border hover:border-arc-navy/30 hover:bg-arc-bg"}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                <div className="font-bold text-xl text-arc-navy">{count}</div>
                <div className="text-[10px] font-semibold text-arc-text3 leading-tight">{s.label}</div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Segmentation dynamique (Phase 5) */}
      <div className="bg-white border border-arc-border rounded-2xl p-4 mb-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[10px] font-bold uppercase tracking-widest text-arc-blue">Segments & filtres</div>
          <div className="flex items-center gap-3">
            {canSend && (
              <Link href={commUrl} className="text-[11px] font-semibold text-white bg-arc-navy hover:bg-arc-navy2 px-2.5 py-1 rounded-full transition-colors">
                ✉️ Contacter ce segment
              </Link>
            )}
            <Link href="/espace-membres/crm/desengagement" className="text-[11px] font-semibold text-arc-blue hover:underline">📊 Alertes désengagement →</Link>
          </div>
        </div>

        {/* Engagement */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-arc-text3 w-16 flex-shrink-0">Engagement</span>
          {(Object.keys(ENGAGEMENT_META) as EngagementStatus[]).map(st => {
            const meta = ENGAGEMENT_META[st];
            const active = engagement === st;
            return (
              <a key={st} href={seg({ engagement: active ? "" : st })}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${active ? meta.cls + " ring-2 ring-offset-1 ring-arc-navy/20" : "border-arc-border text-arc-text3 hover:border-arc-navy/40"}`}>
                {meta.emoji} {meta.label}
              </a>
            );
          })}
        </div>

        {/* Fonctions */}
        {allGroups.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-arc-text3 w-16 flex-shrink-0">Fonction</span>
            {allGroups.map(g => {
              const active = group === g;
              return (
                <a key={g} href={seg({ group: active ? "" : g })}
                  className={`rounded-full transition-all ${active ? "ring-2 ring-offset-1 ring-arc-navy/30" : "opacity-80 hover:opacity-100"}`}>
                  <GroupBadge name={g} size="sm" />
                </a>
              );
            })}
          </div>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-arc-text3 w-16 flex-shrink-0">Tags</span>
            {allTags.map((t, i) => {
              const active = tag === t;
              return (
                <a key={t} href={seg({ tag: active ? "" : t })}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all ${TAG_COLORS[i % TAG_COLORS.length]} ${active ? "ring-2 ring-offset-1 ring-arc-navy/30" : "opacity-80 hover:opacity-100"}`}>
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
                    <div className="font-semibold text-arc-navy text-sm">{name}</div>
                    <div className="text-xs text-arc-text3 truncate">{r.content}</div>
                  </div>
                  <span className="text-arc-text3 text-sm flex-shrink-0">→</span>
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
          className="flex-1 px-4 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors bg-white"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
        >
          Rechercher
        </button>
        {hasFilter && (
          <a
            href="/espace-membres/crm"
            className="px-4 py-2.5 rounded-xl border border-arc-border text-sm text-arc-text3 hover:border-arc-navy hover:text-arc-navy transition-colors"
          >
            ✕ Effacer
          </a>
        )}
      </form>

      {hasFilter && (
        <div className="mb-3 text-sm text-arc-text3">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          {stage      && <span> · Étape : <strong className="text-arc-navy">{STAGE_MAP[stage]?.label ?? stage}</strong></span>}
          {engagement && <span> · Engagement : <strong className="text-arc-navy">{ENGAGEMENT_META[engagement as EngagementStatus]?.label ?? engagement}</strong></span>}
          {group      && <span> · Fonction : <strong className="text-arc-navy">{group}</strong></span>}
          {tag        && <span> · Tag : <strong className="text-arc-navy">{tag}</strong></span>}
          {q          && <span> · Recherche : <strong className="text-arc-navy">{q}</strong></span>}
        </div>
      )}

      {/* En attente */}
      {filteredPending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            ⏳ En attente de validation ({filteredPending.length})
          </h2>
          <div className="space-y-2">
            {filteredPending.map(m => (
              <MemberRow key={m.id} member={m} noteCount={noteMap[m.id] ?? 0} engStatus={engMap.get(m.id as string)} pending />
            ))}
          </div>
        </div>
      )}

      {/* Membres validés */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-arc-blue mb-3">
          {showAll ? `Membres validés (${filteredValidated.length})` : `Résultats validés (${filteredValidated.length})`}
        </h2>
        <div className="space-y-2">
          {filteredValidated.length === 0 && (
            <div className="bg-white border border-arc-border rounded-2xl py-10 text-center text-arc-text3 text-sm">
              Aucun membre trouvé.
            </div>
          )}
          {filteredValidated.map(m => (
            <MemberRow key={m.id} member={m} noteCount={noteMap[m.id] ?? 0} engStatus={engMap.get(m.id as string)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member: m, noteCount, pending, engStatus }: {
  member: {
    id: string; first_name: string | null; last_name: string | null;
    role: string; validated: boolean; groups: string[] | null;
    avatar_url: string | null; country: string | null;
    crm_tags: string[] | null; created_at: string;
    pastoral_stage: string | null;
  };
  noteCount: number;
  pending?: boolean;
  engStatus?: EngagementStatus;
}) {
  const fullName = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
  const initiale = (m.first_name?.[0] ?? "?").toUpperCase();
  const tags  = m.crm_tags ?? [];
  const stage = STAGE_MAP[m.pastoral_stage ?? "visiteur"];
  const eng   = engStatus ? ENGAGEMENT_META[engStatus] : null;

  return (
    <Link
      href={`/espace-membres/crm/${m.id}`}
      className="bg-white border border-arc-border rounded-xl p-4 flex items-center gap-3 hover:border-arc-navy hover:shadow-sm transition-all group"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ${pending ? "bg-amber-100" : "bg-arc-navy"}`}>
        {m.avatar_url
          ? <Image src={m.avatar_url} alt={fullName} width={40} height={40} className="w-full h-full object-cover" />
          : <span className={`font-serif font-bold text-base ${pending ? "text-amber-700" : "text-white"}`}>{initiale}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {eng && <span title={`Engagement : ${eng.label}`} className={`w-2 h-2 rounded-full flex-shrink-0 ${eng.dot}`} aria-hidden />}
          <span className="font-semibold text-arc-navy text-sm group-hover:text-arc-blue transition-colors">{fullName}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_STYLE[m.role] ?? "text-arc-text3 bg-gray-50 border-gray-200"}`}>
            {m.role}
          </span>
          {stage && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.color}`}>
              {stage.label}
            </span>
          )}
          {pending && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">En attente</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {m.country && <span className="text-[11px] text-arc-text3">📍 {m.country}</span>}
          <span className="text-[11px] text-arc-text3">Inscrit le {new Date(m.created_at).toLocaleDateString("fr-CH")}</span>
        </div>
        {(m.groups ?? []).length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {(m.groups ?? []).map((g) => (
              <GroupBadge key={g} name={g} size="sm" showLabel={false} />
            ))}
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {tags.map((t, i) => (
              <span key={t} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[i % TAG_COLORS.length]}`}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 text-right">
        {noteCount > 0 && (
          <span className="text-[11px] text-arc-text3">📝 {noteCount}</span>
        )}
        <span className="text-arc-text3 group-hover:text-arc-navy transition-colors text-sm">→</span>
      </div>
    </Link>
  );
}
