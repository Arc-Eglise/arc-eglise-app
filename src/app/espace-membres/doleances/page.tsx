import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createGrievance, updateGrievanceStatus, deleteGrievance } from "@/lib/actions/membres";

type Grievance = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_anonymous: boolean;
  admin_response: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

const CATEGORIES: Record<string, { label: string; color: string }> = {
  pastoral:     { label: "Pastoral",     color: "text-purple-700 bg-purple-50 border-purple-200" },
  organisation: { label: "Organisation", color: "text-blue-700 bg-blue-50 border-blue-200" },
  technique:    { label: "Technique",    color: "text-orange-700 bg-orange-50 border-orange-200" },
  autre:        { label: "Autre",        color: "text-gray-700 bg-gray-50 border-gray-200" },
};

const STATUSES: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "text-amber-700 bg-amber-50 border-amber-200" },
  en_cours:   { label: "En cours",   color: "text-blue-700 bg-blue-50 border-blue-200" },
  resolu:     { label: "Résolu",     color: "text-green-700 bg-green-50 border-green-200" },
};

export default async function DoleancesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, validated")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "pasteur";

  const { data: rawGrievances } = await supabase
    .from("grievances")
    .select("*, profiles(first_name, last_name)")
    .order("created_at", { ascending: false });

  const grievances = (rawGrievances ?? []) as Grievance[];
  const myGrievances    = grievances.filter(g => g.user_id === user.id);
  const pendingCount    = grievances.filter(g => g.status === "en_attente").length;
  const canPost         = profile?.validated || isAdmin;

  async function handleCreate(formData: FormData): Promise<void> {
    "use server";
    await createGrievance(formData);
  }

  async function handleUpdateStatus(formData: FormData): Promise<void> {
    "use server";
    await updateGrievanceStatus(formData);
  }

  async function handleDelete(formData: FormData): Promise<void> {
    "use server";
    await deleteGrievance(formData.get("id") as string);
  }

  const displayGrievances = isAdmin ? grievances : myGrievances;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Doléances</h1>
        <p className="text-sm text-arc-text2 mt-0.5">
          {isAdmin
            ? `${grievances.length} soumission(s) · ${pendingCount} en attente`
            : `${myGrievances.length} soumission(s)`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* ── Liste ── */}
        <div className="space-y-3">
          {displayGrievances.length === 0 && (
            <div className="bg-white border border-arc-border rounded-2xl py-12 text-center text-arc-text3 text-sm">
              {isAdmin ? "Aucune doléance soumise." : "Tu n'as pas encore soumis de doléance."}
            </div>
          )}

          {displayGrievances.map(g => {
            const cat    = CATEGORIES[g.category] ?? CATEGORIES.autre;
            const stat   = STATUSES[g.status]     ?? STATUSES.en_attente;
            const isOwner = g.user_id === user.id;
            const authorName = g.is_anonymous
              ? "Anonyme"
              : [g.profiles?.first_name, g.profiles?.last_name].filter(Boolean).join(" ") || "Membre";

            return (
              <div key={g.id} className="bg-white border border-arc-border rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-arc-navy">{g.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                        {cat.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stat.color}`}>
                        {stat.label}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="text-[11px] text-arc-text3">
                        {authorName} · {new Date(g.created_at).toLocaleDateString("fr-CH")}
                      </div>
                    )}
                    {!isAdmin && (
                      <div className="text-[11px] text-arc-text3">
                        {new Date(g.created_at).toLocaleDateString("fr-CH")}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isOwner && g.status === "en_attente" && (
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={g.id} />
                        <button title="Retirer" className="text-xs px-2 py-1.5 rounded-lg border border-arc-border text-arc-text3 hover:border-red-300 hover:text-red-500 transition-colors">
                          ✕
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <p className="text-sm text-arc-text2 leading-relaxed mb-3">{g.description}</p>

                {/* Réponse admin */}
                {g.admin_response && (
                  <div className="bg-arc-blueBg border border-arc-bluePale rounded-xl p-3 mt-2">
                    <div className="text-[10px] font-bold text-arc-blue uppercase tracking-wider mb-1">
                      Réponse de l&apos;équipe
                    </div>
                    <p className="text-sm text-arc-navy">{g.admin_response}</p>
                  </div>
                )}

                {/* Formulaire réponse admin */}
                {isAdmin && (
                  <form action={handleUpdateStatus} className="mt-3 pt-3 border-t border-arc-border flex flex-col gap-2">
                    <input type="hidden" name="id" value={g.id} />
                    <div className="flex gap-2 items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-arc-text3 flex-shrink-0">
                        Statut
                      </label>
                      <select
                        name="status"
                        defaultValue={g.status}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy"
                      >
                        <option value="en_attente">En attente</option>
                        <option value="en_cours">En cours</option>
                        <option value="resolu">Résolu</option>
                      </select>
                      <button type="submit" className="px-3 py-1.5 rounded-lg bg-arc-navy text-white text-xs font-bold hover:bg-arc-navy2 transition-colors flex-shrink-0">
                        Mettre à jour
                      </button>
                    </div>
                    <textarea
                      name="admin_response"
                      defaultValue={g.admin_response ?? ""}
                      placeholder="Réponse (optionnelle)…"
                      rows={2}
                      maxLength={1000}
                      className="w-full px-3 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy resize-none"
                    />
                  </form>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Formulaire soumission ── */}
        <div className="self-start space-y-4">
          {canPost ? (
            <div className="bg-white border border-arc-border rounded-2xl p-5">
              <h2 className="font-bold text-arc-navy mb-1">✉️ Soumettre une doléance</h2>
              <p className="text-xs text-arc-text3 mb-4">
                Partage tes préoccupations, suggestions ou remarques à la direction.
              </p>
              <form action={handleCreate} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">
                    Titre *
                  </label>
                  <input
                    name="title" required maxLength={200}
                    placeholder="Résume ta doléance en quelques mots…"
                    className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">
                    Catégorie
                  </label>
                  <select
                    name="category"
                    className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white"
                  >
                    <option value="pastoral">Pastoral</option>
                    <option value="organisation">Organisation</option>
                    <option value="technique">Technique</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">
                    Description *
                  </label>
                  <textarea
                    name="description" required maxLength={2000} rows={5}
                    placeholder="Décris ta situation ou suggestion en détail…"
                    className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer select-none">
                  <input name="is_anonymous" type="checkbox" className="accent-arc-navy" />
                  Rester anonyme
                </label>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
                >
                  Soumettre
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
              <div className="font-bold mb-1">Compte en attente</div>
              Tu pourras soumettre une doléance une fois ton compte validé par le Pasteur.
            </div>
          )}

          {/* Info confidentialité */}
          <div className="bg-arc-blueBg border border-arc-bluePale rounded-2xl p-4 text-xs text-arc-navy/70">
            <div className="font-bold mb-1">🔒 Confidentialité</div>
            Seul l&apos;administrateur et le Pasteur peuvent voir toutes les soumissions.
            Si tu choisis l&apos;anonymat, ton nom ne sera pas affiché.
          </div>
        </div>
      </div>
    </div>
  );
}
