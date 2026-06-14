import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AgendaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .gte("date", new Date().toISOString().split("T")[0])
    .eq("is_published", true)
    .order("date");

  const grouped: Record<string, typeof events> = {};
  for (const ev of events ?? []) {
    const key = new Date(ev.date).toLocaleDateString("fr-CH", { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(ev);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Agenda</h1>
        <p className="text-sm text-arc-text2 mt-0.5">Événements à venir</p>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="bg-white border border-arc-border rounded-2xl py-16 text-center text-arc-text3 text-sm">
          Aucun événement prévu pour le moment.
        </div>
      )}

      {Object.entries(grouped).map(([month, evts]) => (
        <div key={month} className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-arc-blue mb-3 capitalize">{month}</h2>
          <div className="space-y-3">
            {(evts ?? []).map((ev) => (
              <div key={ev.id} className="bg-white border border-arc-border rounded-2xl p-5 flex gap-5">
                <div className="flex-shrink-0 text-center bg-arc-blueBg rounded-xl px-4 py-3 min-w-[64px]">
                  <div className="font-serif text-3xl font-bold text-arc-navy leading-none">
                    {new Date(ev.date).getDate()}
                  </div>
                  <div className="text-[10px] font-bold text-arc-blue uppercase mt-0.5">
                    {new Date(ev.date).toLocaleDateString("fr-CH", { month: "short" })}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-arc-navy">{ev.title}</h3>
                    {ev.price_chf > 0
                      ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-arc-goldLight text-arc-goldDark flex-shrink-0">CHF {ev.price_chf}</span>
                      : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">Gratuit</span>
                    }
                  </div>
                  <div className="text-sm text-arc-text3">
                    🕐 {ev.time_start?.slice(0, 5)}{ev.time_end ? ` — ${ev.time_end.slice(0, 5)}` : ""}
                  </div>
                  <div className="text-sm text-arc-text3">📍 {ev.location}</div>
                  {ev.description && (
                    <p className="text-sm text-arc-text2 mt-2 leading-relaxed">{ev.description}</p>
                  )}
                  {ev.tags?.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {ev.tags.map((t: string) => (
                        <span key={t} className="text-[10px] bg-arc-blueBg text-arc-navy px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  {ev.capacity && (
                    <div className="text-[11px] text-arc-text3 mt-2">Capacité : {ev.capacity} places</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
