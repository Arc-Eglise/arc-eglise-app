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

export default async function CrmPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "pasteur"].includes(me?.role ?? "")) redirect("/espace-membres");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, validated, groups, avatar_url, country, crm_tags, created_at")
    .order("created_at", { ascending: false });

  const all       = members ?? [];
  const validated = all.filter(m => m.validated);
  const pending   = all.filter(m => !m.validated);
  const byRole    = all.reduce((acc, m) => { acc[m.role] = (acc[m.role] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  // Notes counts per member
  const { data: noteCounts } = await supabase
    .from("member_notes")
    .select("member_id");
  const noteMap: Record<string, number> = {};
  for (const n of noteCounts ?? []) noteMap[n.member_id] = (noteMap[n.member_id] ?? 0) + 1;

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",      val: all.length,        color: "text-arc-navy"  },
          { label: "Validés",    val: validated.length,  color: "text-green-600" },
          { label: "En attente", val: pending.length,    color: "text-amber-600" },
          { label: "Membres",    val: byRole.membre ?? 0, color: "text-arc-blue" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-arc-border rounded-2xl p-4 text-center">
            <div className={`text-3xl font-bold font-serif ${s.color}`}>{s.val}</div>
            <div className="text-xs text-arc-text3 font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* En attente de validation */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            ⏳ En attente de validation ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map(m => (
              <MemberRow key={m.id} member={m} noteCount={noteMap[m.id] ?? 0} pending />
            ))}
          </div>
        </div>
      )}

      {/* Tous les membres validés */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-arc-blue mb-3">
          Membres validés ({validated.length})
        </h2>
        <div className="space-y-2">
          {validated.length === 0 && (
            <div className="bg-white border border-arc-border rounded-2xl py-10 text-center text-arc-text3 text-sm">
              Aucun membre validé.
            </div>
          )}
          {validated.map(m => (
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
  };
  noteCount: number;
  pending?: boolean;
}) {
  const fullName = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
  const initiale = (m.first_name?.[0] ?? "?").toUpperCase();
  const tags = m.crm_tags ?? [];

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
