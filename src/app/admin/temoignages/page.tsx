import { createClient }          from "@/lib/supabase/server";
import { createTestimonial, deleteTestimonial, validateTestimonial, rejectTestimonial } from "@/lib/actions/cms";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData): Promise<void> {
  "use server";
  await createTestimonial(formData);
  redirect("/admin/temoignages?saved=1");
}

async function handleDelete(formData: FormData): Promise<void> {
  "use server";
  await deleteTestimonial(formData.get("id") as string);
  redirect("/admin/temoignages");
}

async function handleValidate(formData: FormData): Promise<void> {
  "use server";
  await validateTestimonial(formData.get("id") as string);
  redirect("/admin/temoignages?saved=1");
}

async function handleReject(formData: FormData): Promise<void> {
  "use server";
  await rejectTestimonial(formData.get("id") as string);
  redirect("/admin/temoignages");
}

export default async function AdminTemoignages({
  searchParams,
}: {
  searchParams?: { saved?: string };
}) {
  const supabase = createClient();

  const [{ data: pending }, { data: approved }] = await Promise.all([
    supabase.from("testimonials").select("*, profiles!testimonials_submitted_by_fkey(first_name,last_name)")
      .eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("testimonials").select("*").neq("status", "pending").order("sort_order", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Témoignages</h1>
        <p className="text-sm text-arc-text2 mt-0.5">
          {pending?.length ?? 0} en attente · {approved?.length ?? 0} publiés/rejetés
        </p>
      </div>

      {searchParams?.saved && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
          ✅ Action effectuée.
        </div>
      )}

      {/* ── File de validation ── */}
      {(pending?.length ?? 0) > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            ⏳ En attente de validation ({pending?.length})
          </h2>
          <div className="flex flex-col gap-4">
            {(pending ?? []).map((t) => {
              const submitter = (t as { profiles?: { first_name: string | null; last_name: string | null } | null }).profiles;
              return (
                <div key={t.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {t.author_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-arc-navy text-sm">{t.author_name}</span>
                        {t.author_role && (
                          <span className="text-[11px] text-arc-text3 border border-arc-border rounded-full px-2 py-0.5">{t.author_role}</span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-auto">
                          ⏳ En attente
                        </span>
                      </div>
                      {submitter && (
                        <div className="text-[10px] text-arc-text3 mt-0.5">
                          Soumis par : {submitter.first_name} {submitter.last_name}
                        </div>
                      )}
                      <p className="text-sm text-arc-text2 mt-2 leading-relaxed">{t.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-amber-200">
                    <form action={handleValidate}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-[12px] px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors">
                        ✅ Approuver & Publier
                      </button>
                    </form>
                    <form action={handleReject}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-[12px] px-4 py-2 rounded-lg border border-arc-border text-arc-text3 font-semibold hover:border-arc-red hover:text-arc-red transition-colors">
                        ✕ Refuser
                      </button>
                    </form>
                    <form action={handleDelete} className="ml-auto">
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-red hover:text-arc-red transition-colors">
                        🗑 Supprimer
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* Liste publiés */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-arc-blue mb-3">
            Publiés & Rejetés ({approved?.length ?? 0})
          </h2>
          <div className="flex flex-col gap-4">
            {(approved ?? []).map((t) => (
              <div key={t.id} className="bg-white rounded-2xl border border-arc-border p-5">
                <div className="flex items-start gap-4">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.author_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-arc-navy to-arc-blue flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {t.author_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-arc-navy text-sm">{t.author_name}</span>
                      {t.author_role && (
                        <span className="text-[11px] text-arc-text3 border border-arc-border rounded-full px-2 py-0.5">{t.author_role}</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${t.is_published ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {t.is_published ? "Publié" : "Refusé/Masqué"}
                      </span>
                    </div>
                    <p className="text-sm text-arc-text2 mt-1.5 leading-relaxed line-clamp-3">{t.content}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-arc-border">
                  <span className="text-[10px] text-arc-text3">Ordre : {t.sort_order}</span>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-red hover:text-arc-red transition-colors">
                      🗑 Supprimer
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {!approved?.length && (
              <div className="text-center text-sm text-arc-text3 py-12 bg-white rounded-2xl border border-arc-border">
                Aucun témoignage validé. Ajoutez-en un →
              </div>
            )}
          </div>
        </div>

        {/* Formulaire ajout admin */}
        <div className="bg-white rounded-2xl border border-arc-border p-5 self-start">
          <h2 className="font-bold text-arc-navy mb-1">Ajouter un témoignage</h2>
          <p className="text-[11px] text-arc-text3 mb-4">Publication immédiate (sans validation)</p>
          <form action={handleCreate} encType="multipart/form-data" className="flex flex-col gap-3">

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Photo (optionnelle)</label>
              <input name="photo" type="file" accept="image/*"
                className="w-full text-sm text-arc-text2 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-arc-blueBg file:text-arc-navy hover:file:bg-arc-bluePale cursor-pointer" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Prénom et initiale *</label>
              <input name="author_name" required placeholder="Miriam K."
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Titre / Rôle</label>
              <input name="author_role" placeholder="Membre depuis 2022"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Témoignage *</label>
              <textarea name="content" required rows={5} placeholder="Son témoignage en quelques lignes…"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Ordre</label>
                <input name="sort_order" type="number" defaultValue={(approved?.length ?? 0) + 1} min="0"
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input name="is_published" type="checkbox" defaultChecked className="w-4 h-4 rounded accent-arc-navy" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-arc-blue">Publié</span>
                </label>
              </div>
            </div>

            <button type="submit"
              className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
              ➕ Ajouter le témoignage
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
