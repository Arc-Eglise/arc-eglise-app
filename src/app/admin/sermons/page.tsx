import { createClient } from "@/lib/supabase/server";
import { createSermon, deleteSermon } from "@/lib/actions/cms";
import { revalidatePath } from "next/cache";

async function handleCreate(formData: FormData): Promise<void> {
  "use server";
  await createSermon(formData);
}

async function handleDelete(formData: FormData): Promise<void> {
  "use server";
  await deleteSermon(formData.get("id") as string);
}

async function handleSetFeatured(formData: FormData): Promise<void> {
  "use server";
  const supabase = createClient();
  const id = formData.get("id") as string;
  await supabase.from("sermons").update({ is_featured: false }).neq("id", id);
  await supabase.from("sermons").update({ is_featured: true }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/sermons");
}

export default async function AdminSermons() {
  const supabase = createClient();
  const { data: sermons } = await supabase
    .from("sermons")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-arc-navy">Sermons</h1>
          <p className="text-sm text-arc-text2 mt-0.5">{sermons?.length ?? 0} sermon(s) dans la base</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-arc-border overflow-hidden">
          <div className="divide-y divide-arc-border">
            {(sermons ?? []).map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-arc-navy text-sm">{s.title}</span>
                    {s.is_featured && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-arc-gold/15 text-arc-goldDark">⭐ Vedette</span>
                    )}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {s.is_published ? "Publié" : "Brouillon"}
                    </span>
                  </div>
                  <div className="text-xs text-arc-text3">
                    {s.pastor} · {s.reference ?? ""} · {new Date(s.date).toLocaleDateString("fr-CH")}
                  </div>
                  {s.youtube_id && (
                    <div className="text-[11px] text-arc-blue mt-0.5">▶ youtube.com/watch?v={s.youtube_id}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!s.is_featured && (
                    <form action={handleSetFeatured}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-gold hover:text-arc-goldDark transition-colors">
                        ⭐ Vedette
                      </button>
                    </form>
                  )}
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-red hover:text-arc-red transition-colors">
                      🗑
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {!sermons?.length && (
              <div className="px-5 py-12 text-center text-arc-text3 text-sm">
                Aucun sermon. Ajoutes-en un avec le formulaire →
              </div>
            )}
          </div>
        </div>

        {/* Formulaire ajout */}
        <div className="bg-white rounded-2xl border border-arc-border p-5">
          <h2 className="font-bold text-arc-navy mb-4">Ajouter un sermon</h2>
          <form action={handleCreate} className="flex flex-col gap-3">

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Titre *</label>
              <input name="title" required placeholder="L'amour désintéressé" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Pasteur *</label>
              <input name="pastor" required defaultValue="Past. Pedro Obova" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Date *</label>
                <input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Référence</label>
                <input name="reference" placeholder="Jean 3:16" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Série</label>
              <input name="series" placeholder="La foi en action" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">ID YouTube</label>
              <input name="youtube_id" placeholder="dQw4w9WgXcQ" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors font-mono" />
              <div className="text-[10px] text-arc-text3 mt-0.5">Uniquement l'ID (après ?v=), pas l'URL complète</div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Extrait</label>
              <textarea name="excerpt" rows={3} placeholder="Résumé du message…" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none" />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer">
                <input name="is_featured" type="checkbox" className="accent-arc-navy" /> En vedette
              </label>
              <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer">
                <input name="is_published" type="checkbox" defaultChecked className="accent-arc-green" /> Publié
              </label>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
              ➕ Ajouter le sermon
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
