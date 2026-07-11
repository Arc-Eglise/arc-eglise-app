import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

export default async function AdminDashboard() {
  const supabase = createClient();

  const [
    { count: sermonsCount },
    { count: eventsCount },
    { count: membresCount },
    { count: visiteursCount },
    { count: doleancesCount },
  ] = await Promise.all([
    supabase.from("sermons").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }).gte("date", new Date().toISOString().split("T")[0]),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("validated", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("validated", false),
    supabase.from("grievances").select("*", { count: "exact", head: true }).eq("status", "en_attente"),
  ]);

  const STATS = [
    { icon: "sermons-replay"       as const, label: "Sermons",           value: sermonsCount   ?? 0, href: "/admin/sermons"    },
    { icon: "agenda"               as const, label: "Événements à venir",value: eventsCount    ?? 0, href: "/admin/evenements" },
    { icon: "presences"            as const, label: "Membres validés",    value: membresCount  ?? 0, href: "/admin/membres"    },
    { icon: "notification"         as const, label: "Comptes en attente", value: visiteursCount ?? 0, href: "/admin/membres"   },
    { icon: "doleances"            as const, label: "Doléances en att.",  value: doleancesCount ?? 0, href: "/admin/doleances" },
  ];

  const { data: recentSermons } = await supabase
    .from("sermons")
    .select("id, title, pastor, date, is_published")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, title, date, time_start, capacity")
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })
    .limit(5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-arc-navy mb-1">Tableau de bord</h1>
        <p className="text-sm text-arc-text2">Bienvenue dans l'interface de gestion du contenu ARC.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-2xl p-5 border border-arc-border hover:border-arc-blue hover:-translate-y-0.5 hover:shadow-arc transition-all duration-200 block"
          >
            <div className="mb-3">
              <Icon name={s.icon} variant="tile" size={44} />
            </div>
            <div className="font-serif text-3xl font-bold text-arc-navy">{s.value}</div>
            <div className="text-xs text-arc-text3 mt-0.5">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent sermons */}
        <div className="bg-white rounded-2xl border border-arc-border overflow-hidden">
          <div className="px-5 py-4 border-b border-arc-border flex items-center justify-between">
            <h2 className="font-bold text-arc-navy">Sermons récents</h2>
            <Link href="/admin/sermons" className="text-xs font-semibold text-arc-blue hover:text-arc-navy transition-colors">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-arc-border">
            {(recentSermons ?? []).map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-arc-navy truncate">{s.title}</div>
                  <div className="text-[11px] text-arc-text3">{s.pastor} · {new Date(s.date).toLocaleDateString("fr-CH")}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {s.is_published ? "Publié" : "Brouillon"}
                </span>
              </div>
            ))}
            {!recentSermons?.length && (
              <div className="px-5 py-8 text-center text-sm text-arc-text3">Aucun sermon encore</div>
            )}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-2xl border border-arc-border overflow-hidden">
          <div className="px-5 py-4 border-b border-arc-border flex items-center justify-between">
            <h2 className="font-bold text-arc-navy">Prochains événements</h2>
            <Link href="/admin/evenements" className="text-xs font-semibold text-arc-blue hover:text-arc-navy transition-colors">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-arc-border">
            {(upcomingEvents ?? []).map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                <div className="text-center flex-shrink-0">
                  <div className="font-serif text-xl font-bold text-arc-navy leading-none">
                    {new Date(e.date).getDate()}
                  </div>
                  <div className="text-[9px] text-arc-blue uppercase font-bold">
                    {new Date(e.date).toLocaleDateString("fr-CH", { month: "short" })}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-arc-navy truncate">{e.title}</div>
                  <div className="text-[11px] text-arc-text3">{e.time_start.slice(0,5)} · {e.capacity ? `${e.capacity} places` : "Places illimitées"}</div>
                </div>
              </div>
            ))}
            {!upcomingEvents?.length && (
              <div className="px-5 py-8 text-center text-sm text-arc-text3">Aucun événement à venir</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { href: "/admin/sermons",      icon: "sermons-replay"       as const, label: "Ajouter un sermon" },
          { href: "/admin/evenements",   icon: "agenda"               as const, label: "Ajouter un événement" },
          { href: "/admin/membres",      icon: "gestion-utilisateurs" as const, label: "Gérer les membres" },
          { href: "/admin/equipe",       icon: "notre-equipe"         as const, label: "Modifier l'équipe" },
          { href: "/admin/temoignages",  icon: "temoignage"           as const, label: "Témoignages" },
          { href: "/admin/site",         icon: "parametres"           as const, label: "Site vitrine" },
        ]).map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="bg-white border border-arc-border rounded-xl px-4 py-3 text-sm font-semibold text-arc-navy flex items-center gap-2 hover:border-arc-blue hover:bg-arc-blueBg transition-all duration-200"
          >
            <Icon name={l.icon} size={20} /> {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
