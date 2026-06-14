import { createClient } from "@/lib/supabase/server";
import type { ArcEvent } from "@/lib/supabase/types";

export default async function EventsSection() {
  const supabase = createClient();

  const { data: events } = await supabase
    .from("events")
    .select(`
      *,
      registrations_count:event_registrations(count)
    `)
    .eq("is_published", true)
    .eq("is_public", true)
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })
    .limit(3);

  return (
    <section id="evenements" className="py-24 bg-white">
      <div className="max-w-8xl mx-auto px-5 md:px-10">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[3px] uppercase text-arc-blue mb-4">
            <span className="w-5 h-px bg-arc-blue" /> Agenda <span className="w-5 h-px bg-arc-blue" />
          </div>
          <h2 className="font-serif text-[38px] md:text-[44px] font-bold text-arc-navy leading-[1.15] mb-4">
            Événements & Cultes
          </h2>
          <p className="text-base text-arc-text2 leading-relaxed max-w-[560px] mx-auto">
            Rejoignez-nous pour nos célébrations, formations et événements spéciaux tout au long de l'année.
          </p>
        </div>

        {events && events.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[22px]">
              {events.map((ev: ArcEvent & { registrations_count: { count: number }[] }) => {
                const registered = ev.registrations_count?.[0]?.count ?? 0;
                const fillPct    = ev.capacity ? Math.round((registered / ev.capacity) * 100) : 0;
                const spotsLeft  = ev.capacity ? ev.capacity - registered : null;
                const month      = new Date(ev.date + "T12:00:00").toLocaleDateString("fr-CH", { month: "short" }).toUpperCase();
                const day        = new Date(ev.date + "T12:00:00").getDate();

                return (
                  <div
                    key={ev.id}
                    className="rounded-[20px] overflow-hidden cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(30,36,100,0.16)] transition-all duration-300 bg-white border border-arc-border"
                  >
                    <div className="px-7 pt-7 pb-4 flex items-start justify-between gap-4">
                      <div className="text-center flex-shrink-0">
                        <div className="font-serif text-[40px] font-bold leading-none text-arc-navy">{day}</div>
                        <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-arc-blue">{month}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-1.5 flex-wrap mb-2">
                          {ev.price_chf > 0
                            ? <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-arc-goldLight text-arc-goldDark">CHF {ev.price_chf}</span>
                            : <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-arc-green">Gratuit</span>
                          }
                          {ev.tags?.map((t: string) => (
                            <span key={t} className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-arc-blueBg text-arc-navy">{t}</span>
                          ))}
                        </div>
                        <div className="font-serif text-[19px] font-bold text-arc-navy mb-1">{ev.title}</div>
                        <div className="text-xs text-arc-text3">
                          {ev.time_start.slice(0,5)}{ev.time_end ? ` → ${ev.time_end.slice(0,5)}` : ""} · {ev.location}
                        </div>
                      </div>
                    </div>

                    {ev.capacity && (
                      <div className="px-7 pb-4">
                        <div className="h-[3px] bg-arc-border rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm bg-gradient-to-r from-arc-navy to-arc-blue"
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-arc-text3 mt-1">{registered}/{ev.capacity} inscrits</div>
                      </div>
                    )}

                    <div className="px-[22px] py-4 border-t border-arc-border bg-arc-bg flex items-center justify-between">
                      <span className="text-[11px] text-arc-text3">
                        {spotsLeft !== null ? `${spotsLeft} place${spotsLeft > 1 ? "s" : ""} disponible${spotsLeft > 1 ? "s" : ""}` : "Entrée libre"}
                      </span>
                      <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-arc-navy text-white hover:bg-arc-navy2 transition-colors">
                        S'inscrire →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[11px] text-sm font-bold bg-transparent text-arc-navy border-[1.5px] border-arc-navy/25 hover:bg-arc-blueBg hover:border-arc-navy transition-all duration-300">
                Voir tout l'agenda →
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-arc-text3 text-sm">
            Les prochains événements seront bientôt annoncés.
          </div>
        )}
      </div>
    </section>
  );
}
