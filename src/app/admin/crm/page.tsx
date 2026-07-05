import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";

const ROLES = ["admin", "pasteur", "membre", "visiteur"];
const GROUPS = ["pasteur","chorale","media","social","sanitaire","finance","support","jeunesse","femmes","ecodim","suivi","communication"];

export default async function CrmPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; group?: string; validated?: string };
}) {
  const supabase = createClient();
  const { q, role, group, validated } = searchParams;

  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role, groups, validated, country, created_at, avatar_url")
    .order("created_at", { ascending: false });

  if (role) query = query.eq("role", role);
  if (validated === "true") query = query.eq("validated", true);
  if (validated === "false") query = query.eq("validated", false);
  if (group) query = query.contains("groups", [group]);

  const { data: members } = await query;

  const filtered = q
    ? (members ?? []).filter((m) => {
        const text = [m.first_name, m.last_name, m.email].join(" ").toLowerCase();
        return text.includes(q.toLowerCase());
      })
    : (members ?? []);

  const total     = members?.length ?? 0;
  const validated_ = members?.filter((m) => m.validated).length ?? 0;
  const pending   = members?.filter((m) => !m.validated).length ?? 0;

  const roleStyle: Record<string, string> = {
    admin:    "bg-red-100 text-red-700",
    pasteur:  "bg-purple-100 text-purple-700",
    membre:   "bg-green-100 text-green-700",
    visiteur: "bg-amber-100 text-amber-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-arc-navy">CRM — Membres</h1>
          <p className="text-sm text-arc-text2 mt-0.5">{total} comptes · {validated_} validés · {pending} en attente</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total", value: total, color: "text-arc-navy" },
          { label: "Validés", value: validated_, color: "text-green-700" },
          { label: "En attente", value: pending, color: "text-amber-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-arc-border rounded-2xl p-4 text-center">
            <div className={`font-serif text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-arc-text3 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" className="bg-white border border-arc-border rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom ou email..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
        />
        <select name="role" defaultValue={role ?? ""} className="px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white">
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="group" defaultValue={group ?? ""} className="px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white">
          <option value="">Tous les groupes</option>
          {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select name="validated" defaultValue={validated ?? ""} className="px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white">
          <option value="">Tout statut</option>
          <option value="true">Validés</option>
          <option value="false">En attente</option>
        </select>
        <button type="submit" className="px-4 py-2 rounded-lg bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors">
          Filtrer
        </button>
        {(q || role || group || validated) && (
          <Link href="/admin/crm" className="px-3 py-2 rounded-lg border border-arc-border text-sm text-arc-text3 hover:text-arc-navy transition-colors">
            ✕ Effacer
          </Link>
        )}
      </form>

      {/* List */}
      <div className="bg-white border border-arc-border rounded-2xl overflow-hidden">
        <div className="divide-y divide-arc-border">
          {filtered.map((m) => {
            const initiale = (m.first_name?.[0] ?? m.email[0]).toUpperCase();
            const fullName = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email;
            return (
              <Link
                key={m.id}
                href={`/admin/crm/${m.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-arc-bg transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-arc-navy flex items-center justify-center overflow-hidden flex-shrink-0">
                  {m.avatar_url
                    ? <Image src={m.avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-white">{initiale}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-arc-navy">{fullName}</div>
                  <div className="text-[11px] text-arc-text3">{m.email} {m.country ? `· ${m.country}` : ""}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleStyle[m.role] ?? "bg-arc-blueBg text-arc-navy"}`}>
                    {m.role}
                  </span>
                  {m.groups?.slice(0, 2).map((g: string) => (
                    <span key={g} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-arc-gold/10 text-arc-goldDark hidden sm:inline">
                      {g}
                    </span>
                  ))}
                  {!m.validated && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⏳</span>
                  )}
                </div>
                <span className="text-arc-text3 text-sm flex-shrink-0">›</span>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-arc-text3">Aucun membre trouvé.</div>
          )}
        </div>
      </div>
    </div>
  );
}
