import { createClient } from "@/lib/supabase/server";
import { createSermon, updateSermon, deleteSermon } from "@/lib/actions/cms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData): Promise<void> {
  "use server";
  await createSermon(formData);
  redirect("/admin/sermons?saved=1");
}

async function handleUpdate(formData: FormData): Promise<void> {
  "use server";
  const id = formData.get("_id") as string;
  await updateSermon(id, formData);
  redirect("/admin/sermons?saved=1");
}

async function handleDelete(formData: FormData): Promise<void> {
  "use server";
  await deleteSermon(formData.get("id") as string);
  redirect("/admin/sermons");
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

export default async function AdminSermons({
  searchParams,
}: {
  searchParams?: { edit?: string; saved?: string };
}) {
  const supabase = createClient();
  const { data: sermons } = await supabase
    .from("sermons")
    .select("*")
    .order("date", { ascending: false });

  const editId = searchParams?.edit ?? null;
  const editing = editId ? (sermons ?? []).find((s) => s.id === editId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-arc-navy">Sermons</h1>
          <p className="text-sm text-arc-text2 mt-0.5">{sermons?.length ?? 0} sermon(s) dans la base</p>
        </div>
        {editId && (
          <a href="/admin/sermons" className="text-sm text-arc-text3 hover:text-arc-navy transition-colors">
            ✕ Annuler la modification
          </a>
        )}
      </div>

      {searchParams?.saved && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
          ✅ Sermon enregistré.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-arc-border overflow-hidden">
          <div className="divide-y divide-arc-border">
            {(sermons ?? []).map((s) => (
              <div key={s.id} className={`px-5 py-4 flex items-start gap-4 ${editId === s.id ? "bg-arc-blueBg" : ""}`}>
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
                  <a
                    href={`/admin/sermons?edit=${s.id}`}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-navy hover:text-arc-navy transition-colors"
                  >
                    ✏️
                  </a>
                  {!s.is_featured && (
                    <form action={handleSetFeatured}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-gold hover:text-arc-goldDark transition-colors">
                        ⭐
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

        {/* Formulaire ajout / édition */}
        <div className="bg-white rounded-2xl border border-arc-border p-5 self-start">
          <h2 className="font-bold text-arc-navy mb-4">
            {editing ? `✏️ Modifier : ${editing.title}` : "Ajouter un sermon"}
          </h2>
          <form action={editing ? handleUpdate : handleCreate} className="flex flex-col gap-3">
            {editing && <input type="hidden" name="_id" value={editing.id} />}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Titre *</label>
              <input name="title" required defaultValue={editing?.title ?? ""} placeholder="L'amour désintéressé"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Pasteur *</label>
              <input name="pastor" required defaultValue={editing?.pastor ?? "Past. Pedro Obova"}
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Date *</label>
                <input name="date" type="date" required
                  defaultValue={editing?.date ?? new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Référence</label>
                <input name="reference" defaultValue={editing?.reference ?? ""} placeholder="Jean 3:16"
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Série</label>
              <input name="series" defaultValue={editing?.series ?? ""} placeholder="La foi en action"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">ID YouTube</label>
              <input name="youtube_id" defaultValue={editing?.youtube_id ?? ""} placeholder="dQw4w9WgXcQ"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors font-mono" />
              <div className="text-[10px] text-arc-text3 mt-0.5">Uniquement l&apos;ID (après ?v=), pas l&apos;URL complète</div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Extrait</label>
              <textarea name="excerpt" rows={3} defaultValue={editing?.excerpt ?? ""} placeholder="Résumé du message…"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none" />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer">
                <input name="is_featured" type="checkbox" defaultChecked={editing?.is_featured ?? false}
                  className="accent-arc-navy" /> En vedette
              </label>
              <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer">
                <input name="is_published" type="checkbox" defaultChecked={editing?.is_published ?? true}
                  className="accent-arc-green" /> Publié
              </label>
            </div>

            <button type="submit"
              className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
              {editing ? "✅ Enregistrer les modifications" : "➕ Ajouter le sermon"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
