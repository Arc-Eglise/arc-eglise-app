import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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
  searchParams?: { q?: string; stage?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "pasteur"].includes(me?.role ?? "")) redirect("/espace-membres");

  const q     = searchParams?.q?.trim().toLowerCase() ?? "";
  const stage = searchParams?.stage ?? "";

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, validated, groups, avatar_url, country, crm_tags, created_at, pastoral_stage")
    .order("created_at", { ascending: false });

  const all = members ?? [];

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
    return matchQ && matchStage;
  });

  const filteredValidated = filtered.filter(m => m.validated);
  const filteredPending   = filtered.filter(m => !m.validated);

  const showAll = !q && !stage;
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
                href={`/espace-membres/crm?stage=${isActive ? "" : s.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
        {stage && <input type="hidden" name="stage" value={stage} />}
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
        {(q || stage) && (
          <a
            href="/espace-membres/crm"
            className="px-4 py-2.5 rounded-xl border border-arc-border text-sm text-arc-text3 hover:border-arc-navy hover:text-arc-navy transition-colors"
          >
            ✕ Effacer
          </a>
        )}
      </form>

      {(q || stage) && (
        <div className="mb-3 text-sm text-arc-text3">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          {stage && <span> · Étape : <strong className="text-arc-navy">{STAGE_MAP[stage]?.label ?? stage}</strong></span>}
          {q    && <span> · Recherche : <strong className="text-arc-navy">{q}</strong></span>}
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
              <MemberRow key={m.id} member={m} noteCount={noteMap[m.id] ?? 0} pending />
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
            <MemberRow key={m.id} member={m} noteCount={noteMap[m.id] ?? 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member: m, noteCount, pending }: {
  member: {
    id: string; first_name: string | null; last_name: string | null;
    role: string; validated: boolean; groups: string[] | null;
    avatar_url: string | null; country: string | null;
    crm_tags: string[] | null; created_at: string;
    pastoral_stage: string | null;
  };
  noteCount: number;
  pending?: boolean;
}) {
  const fullName = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
  const initiale = (m.first_name?.[0] ?? "?").toUpperCase();
  const tags  = m.crm_tags ?? [];
  const stage = STAGE_MAP[m.pastoral_stage ?? "visiteur"];

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
