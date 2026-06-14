import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createPrayerRequest, prayForRequest, markPrayerAnswered, deletePrayerRequest } from "@/lib/actions/membres";

type PrayerWithProfile = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_anonymous: boolean;
  is_answered: boolean;
  prayer_count: number;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

export default async function PrierePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: profile }, { data: rawPrayers }] = await Promise.all([
    supabase.from("profiles").select("validated, role").eq("id", user.id).single(),
    supabase.from("prayer_requests")
      .select("*, profiles(first_name, last_name)")
      .order("created_at", { ascending: false }),
  ]);

  const prayers = (rawPrayers ?? []) as PrayerWithProfile[];
  const active   = prayers.filter((p) => !p.is_answered);
  const answered = prayers.filter((p) =>  p.is_answered);
  const canPost  = profile?.validated || ["admin", "pasteur"].includes(profile?.role ?? "") || profile?.groups?.includes("support");

  async function handleCreate(formData: FormData): Promise<void> {
    "use server";
    await createPrayerRequest(formData);
  }

  async function handlePray(formData: FormData): Promise<void> {
    "use server";
    await prayForRequest(formData.get("id") as string);
  }

  async function handleAnswered(formData: FormData): Promise<void> {
    "use server";
    await markPrayerAnswered(formData.get("id") as string);
  }

  async function handleDelete(formData: FormData): Promise<void> {
    "use server";
    await deletePrayerRequest(formData.get("id") as string);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Mur de Prière</h1>
        <p className="text-sm text-arc-text2 mt-0.5">{active.length} demande(s) active(s)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* Liste */}
        <div className="space-y-3">
          {active.length === 0 && (
            <div className="bg-white border border-arc-border rounded-2xl py-12 text-center text-arc-text3 text-sm">
              Aucune demande en cours. Sois le premier à partager →
            </div>
          )}

          {active.map((p) => {
            const authorName = p.is_anonymous
              ? "Anonyme"
              : [p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(" ") || "Membre";
            const isAuthor = p.user_id === user.id;

            return (
              <div key={p.id} className="bg-white border border-arc-border rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-arc-navy">{p.title}</h3>
                    <div className="text-[11px] text-arc-text3 mt-0.5">
                      {authorName} · {new Date(p.created_at).toLocaleDateString("fr-CH")}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <form action={handlePray}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-arc-blueBg text-arc-navy border border-arc-bluePale hover:bg-arc-bluePale transition-colors">
                        🙏 {p.prayer_count > 0 ? p.prayer_count : "Prier"}
                      </button>
                    </form>
                    {isAuthor && (
                      <>
                        <form action={handleAnswered}>
                          <input type="hidden" name="id" value={p.id} />
                          <button title="Marquer comme exaucée" className="text-xs font-bold px-2 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                            ✅
                          </button>
                        </form>
                        <form action={handleDelete}>
                          <input type="hidden" name="id" value={p.id} />
                          <button title="Supprimer" className="text-xs px-2 py-1.5 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-red hover:text-arc-red transition-colors">
                            ✕
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
                {p.description && (
                  <p className="text-sm text-arc-text2 leading-relaxed">{p.description}</p>
                )}
              </div>
            );
          })}

          {answered.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">
                ✅ Prières exaucées ({answered.length})
              </h2>
              <div className="space-y-2">
                {answered.map((p) => (
                  <div key={p.id} className="bg-green-50 border border-green-200 rounded-xl p-4 opacity-80">
                    <h3 className="font-semibold text-green-800 text-sm">{p.title}</h3>
                    <div className="text-[11px] text-green-600 mt-0.5">
                      {p.prayer_count} personne(s) ont prié · {new Date(p.created_at).toLocaleDateString("fr-CH")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formulaire */}
        <div className="self-start">
          {canPost ? (
            <div className="bg-white border border-arc-border rounded-2xl p-5">
              <h2 className="font-bold text-arc-navy mb-4">✉️ Partager une demande</h2>
              <form action={handleCreate} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">
                    Titre *
                  </label>
                  <input
                    name="title"
                    required
                    maxLength={200}
                    placeholder="Prière pour la guérison de..."
                    className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">
                    Détails (optionnel)
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    maxLength={1000}
                    placeholder="Décris ta situation en quelques mots..."
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
                  🙏 Soumettre ma demande
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
              <div className="font-bold mb-1">Compte en attente</div>
              Tu pourras partager des demandes de prière une fois ton compte validé par le Pasteur.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
