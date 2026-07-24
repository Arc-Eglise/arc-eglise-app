import { createClient }      from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { redirect }           from "next/navigation";
import { revalidatePath }     from "next/cache";
import { priorityMeta, computeSla, isResolvedStatus, PRIORITIES } from "@/lib/crm/support";

type Grievance = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_anonymous: boolean;
  admin_response: string | null;
  responded_by: string | null;
  created_at: string;
  priority: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  satisfaction: number | null;
  satisfaction_comment: string | null;
  profiles: { first_name: string | null; last_name: string | null; email: string } | null;
  responder: { first_name: string | null; last_name: string | null } | null;
};

const CAT: Record<string, { label: string; cls: string }> = {
  pastoral:     { label: "Pastoral",      cls: "text-purple-700 bg-purple-50 border-purple-200" },
  organisation: { label: "Organisation",  cls: "text-blue-700   bg-blue-50   border-blue-200"   },
  technique:    { label: "Technique",     cls: "text-orange-700 bg-orange-50 border-orange-200" },
  autre:        { label: "Autre",         cls: "text-gray-700   bg-gray-50   border-gray-200"   },
};

const STATUS: Record<string, { label: string; cls: string }> = {
  en_attente: { label: "En attente", cls: "text-amber-700 bg-amber-50  border-amber-200"  },
  en_cours:   { label: "En cours",   cls: "text-blue-700  bg-blue-50   border-blue-200"   },
  resolu:     { label: "Résolu",     cls: "text-green-700 bg-green-50  border-green-200"  },
};

export default async function AdminDoleancesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  /* ── Auth ── */
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, groups, first_name, last_name")
    .eq("id", user.id)
    .single();

  const canAccess =
    profile?.role === "admin" ||
    profile?.role === "pasteur" ||
    (profile?.groups as string[] | null)?.includes("support");

  if (!canAccess) redirect("/admin");

  /* ── Données (bypass RLS) ── */
  const admin   = createAdminClient();
  const filter  = searchParams.status ?? "all";

  let query = admin
    .from("grievances")
    .select("*, profiles(first_name, last_name, email), responder:responded_by(first_name, last_name)")
    .order("created_at", { ascending: false });

  if (filter !== "all") query = query.eq("status", filter);

  const { data: raw } = await query;
  const grievances = (raw ?? []) as unknown as Grievance[];

  // Tri : tickets ouverts d'abord, puis par priorité (urgente → basse), puis récence.
  grievances.sort((a, b) => {
    const ar = isResolvedStatus(a.status) ? 1 : 0;
    const br = isResolvedStatus(b.status) ? 1 : 0;
    if (ar !== br) return ar - br;
    const ap = priorityMeta(a.priority).order;
    const bp = priorityMeta(b.priority).order;
    if (ap !== bp) return ap - bp;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  /* ── Stats ── */
  const { data: counts } = await admin
    .from("grievances")
    .select("status");
  const total     = counts?.length ?? 0;
  const enAttente = counts?.filter(g => g.status === "en_attente").length ?? 0;
  const enCours   = counts?.filter(g => g.status === "en_cours").length   ?? 0;
  const resolu    = counts?.filter(g => g.status === "resolu").length      ?? 0;

  /* ── Server Actions ── */
  async function handleUpdate(formData: FormData) {
    "use server";
    const supabaseSrv = createClient();
    const { data: { user: u } } = await supabaseSrv.auth.getUser();
    if (!u) return;

    const id             = formData.get("id") as string;
    const status         = formData.get("status") as string;
    const priority       = (formData.get("priority") as string) || "normale";
    const admin_response = (formData.get("admin_response") as string)?.trim() || null;

    const adminSrv = createAdminClient();
    const { data: cur } = await adminSrv.from("grievances").select("first_response_at").eq("id", id).maybeSingle();

    const patch: Record<string, unknown> = { status, priority, admin_response, responded_by: u.id };
    if (!cur?.first_response_at && status !== "en_attente") patch.first_response_at = new Date().toISOString();
    patch.resolved_at = isResolvedStatus(status) ? new Date().toISOString() : null;

    await adminSrv.from("grievances").update(patch).eq("id", id);

    revalidatePath("/admin/doleances");
    revalidatePath("/espace-membres/doleances");
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const adminSrv = createAdminClient();
    await adminSrv.from("grievances").delete().eq("id", id);
    revalidatePath("/admin/doleances");
  }

  const FILTERS = [
    { key: "all",       label: `Toutes (${total})` },
    { key: "en_attente",label: `En attente (${enAttente})` },
    { key: "en_cours",  label: `En cours (${enCours})` },
    { key: "resolu",    label: `Résolues (${resolu})` },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-arc-navy">Doléances</h1>
          <p className="text-sm text-arc-text2 mt-0.5">
            Demandes et signalements des membres — {total} au total
          </p>
        </div>
        {enAttente > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-bold border border-amber-200">
            ⏳ {enAttente} en attente de traitement
          </span>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",       value: total,     color: "bg-arc-navy"   },
          { label: "En attente",  value: enAttente, color: "bg-amber-500"  },
          { label: "En cours",    value: enCours,   color: "bg-blue-500"   },
          { label: "Résolues",    value: resolu,    color: "bg-green-500"  },
        ].map(s => (
          <div key={s.label} className="bg-white border border-arc-border rounded-2xl p-4 text-center">
            <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center text-white font-bold text-sm mx-auto mb-2`}>
              {s.value}
            </div>
            <div className="text-[11px] text-arc-text3 font-semibold uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(f => (
          <a
            key={f.key}
            href={f.key === "all" ? "/admin/doleances" : `/admin/doleances?status=${f.key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filter === f.key
                ? "bg-arc-navy text-white border-arc-navy"
                : "bg-white text-arc-text2 border-arc-border hover:border-arc-navy hover:text-arc-navy"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* List */}
      {grievances.length === 0 ? (
        <div className="bg-white border border-arc-border rounded-2xl py-16 text-center text-arc-text3 text-sm">
          Aucune doléance {filter !== "all" ? `"${STATUS[filter]?.label ?? filter}"` : ""}.
        </div>
      ) : (
        <div className="space-y-4">
          {grievances.map(g => {
            const cat    = CAT[g.category]    ?? CAT.autre;
            const stat   = STATUS[g.status]   ?? STATUS.en_attente;
            const prio   = priorityMeta(g.priority);
            const sla    = computeSla(g.created_at, g.priority, g.status);
            const author = g.is_anonymous
              ? "Anonyme"
              : [g.profiles?.first_name, g.profiles?.last_name].filter(Boolean).join(" ") || g.profiles?.email || "Membre";
            const responder = g.responded_by
              ? [g.responder?.first_name, g.responder?.last_name].filter(Boolean).join(" ") || "Admin"
              : null;

            return (
              <div key={g.id} className={`bg-white border rounded-2xl p-5 ${sla.breached ? "border-red-300 ring-1 ring-red-100" : "border-arc-border"}`}>

                {/* Top row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prio.cls}`}>{prio.label}</span>
                      <h3 className="font-semibold text-arc-navy">{g.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.cls}`}>
                        {cat.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stat.cls}`}>
                        {stat.label}
                      </span>
                      {sla.breached ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">⏰ SLA dépassé ({sla.ageDays} j)</span>
                      ) : !isResolvedStatus(g.status) && (
                        <span className="text-[10px] font-semibold text-arc-text3">SLA : {sla.remainingDays >= 0 ? `${sla.remainingDays} j restant${sla.remainingDays !== 1 ? "s" : ""}` : "échéance atteinte"}</span>
                      )}
                      {g.satisfaction != null && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700" title={g.satisfaction_comment ?? undefined}>
                          {"★".repeat(g.satisfaction)}{"☆".repeat(5 - g.satisfaction)}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-arc-text3">
                      {author} · {new Date(g.created_at).toLocaleDateString("fr-CH", {
                        day: "numeric", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                      {responder && <span className="ml-2 text-arc-blue">· Traité par {responder}</span>}
                    </div>
                  </div>

                  {/* Supprimer */}
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={g.id} />
                    <button
                      title="Supprimer"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-arc-border text-arc-text3 hover:border-red-300 hover:text-red-500 transition-colors text-sm flex-shrink-0"
                    >
                      ✕
                    </button>
                  </form>
                </div>

                {/* Message */}
                <p className="text-sm text-arc-text2 leading-relaxed mb-4 whitespace-pre-wrap">{g.description}</p>

                {/* Réponse existante */}
                {g.admin_response && (
                  <div className="bg-arc-blueBg border border-arc-bluePale rounded-xl p-3 mb-4">
                    <div className="text-[10px] font-bold text-arc-blue uppercase tracking-wider mb-1">
                      Réponse de l&apos;équipe{responder ? ` (${responder})` : ""}
                    </div>
                    <p className="text-sm text-arc-navy whitespace-pre-wrap">{g.admin_response}</p>
                  </div>
                )}

                {/* Formulaire traitement */}
                <form action={handleUpdate} className="pt-3 border-t border-arc-border">
                  <input type="hidden" name="id" value={g.id} />
                  <div className="flex gap-3 mb-2 flex-wrap items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-arc-text3 flex-shrink-0">Statut</label>
                      <select
                        name="status"
                        defaultValue={g.status}
                        className="px-2 py-1.5 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white"
                      >
                        <option value="en_attente">⏳ En attente</option>
                        <option value="en_cours">🔄 En cours</option>
                        <option value="resolu">✅ Résolu</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-arc-text3 flex-shrink-0">Priorité</label>
                      <select
                        name="priority"
                        defaultValue={g.priority ?? "normale"}
                        className="px-2 py-1.5 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white"
                      >
                        {PRIORITIES.map(p => (
                          <option key={p} value={p}>{priorityMeta(p).label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-arc-navy text-white text-xs font-bold hover:bg-arc-navy/90 transition-colors ml-auto"
                    >
                      Sauvegarder
                    </button>
                  </div>
                  <textarea
                    name="admin_response"
                    defaultValue={g.admin_response ?? ""}
                    placeholder="Réponse visible par le membre (optionnelle)…"
                    rows={2}
                    maxLength={1000}
                    className="w-full px-3 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy resize-none"
                  />
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
