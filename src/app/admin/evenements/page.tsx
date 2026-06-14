import { createClient } from "@/lib/supabase/server";
import { createEvent, deleteEvent } from "@/lib/actions/cms";

async function handleCreate(formData: FormData): Promise<void> {
  "use server";
  await createEvent(formData);
}

async function handleDelete(formData: FormData): Promise<void> {
  "use server";
  await deleteEvent(formData.get("id") as string);
}

export default async function AdminEvenements() {
  const supabase = createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Événements</h1>
        <p className="text-sm text-arc-text2 mt-0.5">{events?.length ?? 0} événement(s)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-arc-border overflow-hidden">
          <div className="divide-y divide-arc-border">
            {(events ?? []).map((ev) => {
              const isPast = new Date(ev.date) < new Date();
              return (
                <div key={ev.id} className={`px-5 py-4 flex items-start gap-4 ${isPast ? "opacity-50" : ""}`}>
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
                    </div>
                    <div className="text-xs text-arc-text3">
                      {ev.time_start.slice(0,5)}{ev.time_end ? ` → ${ev.time_end.slice(0,5)}` : ""} · {ev.location}
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {ev.tags?.map((t: string) => (
                        <span key={t} className="text-[10px] bg-arc-blueBg text-arc-navy px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                      {ev.price_chf > 0 && <span className="text-[10px] bg-arc-goldLight text-arc-goldDark px-2 py-0.5 rounded-full">CHF {ev.price_chf}</span>}
                      {ev.capacity && <span className="text-[10px] text-arc-text3">{ev.capacity} places</span>}
                    </div>
                  </div>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={ev.id} />
                    <button className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-red hover:text-arc-red transition-colors flex-shrink-0">
                      🗑
                    </button>
                  </form>
                </div>
              );
            })}
            {!events?.length && (
              <div className="px-5 py-12 text-center text-arc-text3 text-sm">Aucun événement. Ajoutes-en un →</div>
            )}
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-arc-border p-5">
          <h2 className="font-bold text-arc-navy mb-4">Ajouter un événement</h2>
          <form action={handleCreate} className="flex flex-col gap-3">

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Titre *</label>
              <input name="title" required placeholder="Culte dominical" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Date *</label>
                <input name="date" type="date" required className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Heure début *</label>
                <input name="time_start" type="time" required defaultValue="09:30" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Heure fin</label>
                <input name="time_end" type="time" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Places max</label>
                <input name="capacity" type="number" min="1" placeholder="60" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Lieu</label>
              <input name="location" defaultValue="Av. Charles-Naine 39, La Chaux-de-Fonds" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Prix (CHF)</label>
                <input name="price_chf" type="number" min="0" step="0.50" defaultValue="0" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Tags (virgule)</label>
                <input name="tags" placeholder="Gratuit, Live" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Description</label>
              <textarea name="description" rows={2} placeholder="Détails de l'événement…" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none" />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer">
                <input name="is_public" type="checkbox" defaultChecked className="accent-arc-navy" /> Public
              </label>
              <label className="flex items-center gap-2 text-sm text-arc-text2 cursor-pointer">
                <input name="is_published" type="checkbox" defaultChecked className="accent-arc-green" /> Publié
              </label>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
              ➕ Ajouter l'événement
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
