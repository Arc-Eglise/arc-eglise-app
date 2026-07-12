import { createClient } from "@/lib/supabase/server";
import { createEvent, updateEvent, deleteEvent } from "@/lib/actions/cms";
import { redirect } from "next/navigation";

async function handleCreate(formData: FormData): Promise<void> {
  "use server";
  await createEvent(formData);
  redirect("/admin/evenements?saved=1");
}

async function handleUpdate(formData: FormData): Promise<void> {
  "use server";
  const id = formData.get("_id") as string;
  await updateEvent(id, formData);
  redirect("/admin/evenements?saved=1");
}

async function handleDelete(formData: FormData): Promise<void> {
  "use server";
  await deleteEvent(formData.get("id") as string);
  redirect("/admin/evenements");
}

const REC_LABELS: Record<string, string> = {
  none:       "Aucune",
  daily:      "Quotidien",
  weekly:     "Hebdomadaire",
  monthly:    "Mensuel",
  yearly:     "Annuel",
  indefinite: "Indéfiniment",
};

export default async function AdminEvenements({
  searchParams,
}: {
  searchParams?: { edit?: string; saved?: string };
}) {
  const supabase = createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  const editId = searchParams?.edit ?? null;
  const editing = editId ? (events ?? []).find((e) => e.id === editId) : null;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-arc-navy">Événements</h1>
            <p className="text-sm text-arc-text2 mt-0.5">{events?.length ?? 0} événement(s)</p>
          </div>
          {editId && (
            <a href="/admin/evenements" className="text-sm text-arc-text3 hover:text-arc-navy transition-colors">
              ✕ Annuler
            </a>
          )}
        </div>
      </div>

      {searchParams?.saved && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
          ✅ Événement enregistré.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-arc-border overflow-hidden">
          <div className="divide-y divide-arc-border">
            {(events ?? []).map((ev) => {
              const isPast = new Date(ev.date) < new Date();
              const recType = ev.recurrence_type ?? "none";
              return (
                <div key={ev.id} className={`px-5 py-4 flex items-start gap-4 ${isPast ? "opacity-50" : ""} ${editId === ev.id ? "bg-arc-blueBg" : ""}`}>
                  <div className="text-center flex-shrink-0 w-12">
                    <div className="font-serif text-2xl font-bold text-arc-navy leading-none">
                      {new Date(ev.date).getDate()}
                    </div>
                    <div className="text-[9px] text-arc-blue font-bold uppercase">
                      {new Date(ev.date).toLocaleDateString("fr-CH", { month: "short" })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-sm text-arc-navy">{ev.title}</span>
                      {isPast && <span className="text-[9px] font-bold text-arc-text3 bg-arc-bg px-1.5 py-0.5 rounded">Passé</span>}
                      {!ev.is_published && <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Brouillon</span>}
                      {recType !== "none" && (
                        <span className="text-[9px] font-bold text-arc-blue bg-arc-blueBg px-1.5 py-0.5 rounded">
                          🔄 {REC_LABELS[recType] ?? recType}
                          {recType !== "indefinite" && ev.recurrence_interval > 1 ? ` ×${ev.recurrence_interval}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-arc-text3">
                      {ev.time_start?.slice(0, 5)}{ev.time_end ? ` → ${ev.time_end?.slice(0, 5)}` : ""} · {ev.location}
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {ev.tags?.map((t: string) => (
                        <span key={t} className="text-[10px] bg-arc-blueBg text-arc-navy px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a href={`/admin/evenements?edit=${ev.id}`}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-navy hover:text-arc-navy transition-colors">
                      ✏️
                    </a>
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={ev.id} />
                      <button className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-red hover:text-arc-red transition-colors">
                        🗑
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
            {!events?.length && (
              <div className="px-5 py-12 text-center text-arc-text3 text-sm">Aucun événement. Ajoutes-en un →</div>
            )}
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-arc-border p-5 self-start">
          <h2 className="font-bold text-arc-navy mb-4">
            {editing ? `✏️ Modifier : ${editing.title}` : "Ajouter un événement"}
          </h2>
          <form action={editing ? handleUpdate : handleCreate} className="flex flex-col gap-3">
            {editing && <input type="hidden" name="_id" value={editing.id} />}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Titre *</label>
              <input name="title" required defaultValue={editing?.title ?? ""} placeholder="Culte dominical"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Date *</label>
                <input name="date" type="date" required defaultValue={editing?.date ?? ""}
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Heure début *</label>
                <input name="time_start" type="time" required defaultValue={editing?.time_start?.slice(0, 5) ?? "09:30"}
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Heure fin</label>
                <input name="time_end" type="time" defaultValue={editing?.time_end?.slice(0, 5) ?? ""}
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Places max</label>
                <input name="capacity" type="number" min="1" defaultValue={editing?.capacity ?? ""}
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Lieu</label>
              <input name="location" defaultValue={editing?.location ?? "Av. Charles-Naine 39, La Chaux-de-Fonds"}
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Prix (CHF)</label>
                <input name="price_chf" type="number" min="0" step="0.50" defaultValue={editing?.price_chf ?? 0}
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Tags (virgule)</label>
                <input name="tags" defaultValue={editing?.tags?.join(", ") ?? ""} placeholder="Gratuit, Live"
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Description</label>
              <textarea name="description" rows={2} defaultValue={editing?.description ?? ""} placeholder="Détails…"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none" />
            </div>

            {/* ── Récurrence ── */}
            <div className="pt-2 border-t border-arc-border">
              <div className="text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-2">🔄 Récurrence</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-arc-text3 mb-1">Type</label>
                  <select name="recurrence_type" defaultValue={editing?.recurrence_type ?? "none"}
                    className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors">
                    <option value="none">Aucune</option>
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                    <option value="indefinite">Indéfiniment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-arc-text3 mb-1">Intervalle (tous les N…)</label>
                  <input name="recurrence_interval" type="number" min="1" defaultValue={editing?.recurrence_interval ?? 1}
                    className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-[10px] text-arc-text3 mb-1">Date de fin (laisser vide = indéfini)</label>
                <input name="recurrence_end_date" type="date" defaultValue={editing?.recurrence_end_date ?? ""}
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer">
                <input name="is_public" type="checkbox" defaultChecked={editing?.is_public ?? true} className="accent-arc-navy" /> Public
              </label>
              <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer">
                <input name="is_published" type="checkbox" defaultChecked={editing?.is_published ?? true} className="accent-arc-green" /> Publié
              </label>
            </div>

            <button type="submit"
              className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
              {editing ? "✅ Enregistrer les modifications" : "➕ Ajouter l'événement"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
