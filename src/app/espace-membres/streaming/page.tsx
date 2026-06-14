import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function StreamingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: featured }, { data: latest }] = await Promise.all([
    supabase.from("sermons")
      .select("title, pastor, date, youtube_id, excerpt, reference")
      .eq("is_featured", true)
      .eq("is_published", true)
      .maybeSingle(),
    supabase.from("sermons")
      .select("id, title, pastor, date, youtube_id")
      .eq("is_published", true)
      .not("youtube_id", "is", null)
      .order("date", { ascending: false })
      .limit(6),
  ]);

  type MainSermon = { title: string; pastor: string; date: string; youtube_id: string; excerpt?: string | null; reference?: string | null };
  const mainSermon: MainSermon | null = featured ?? (latest?.[0] ? { ...latest[0], excerpt: null, reference: null } : null);

  const schedule = [
    { icon: "📅", title: "Culte dominical",  desc: "Tous les dimanches à 9h30" },
    { icon: "🎤", title: "Groupe de louange", desc: "Mercredi à 19h00" },
    { icon: "📖", title: "Étude biblique",    desc: "Vendredi à 18h30" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Streaming</h1>
        <p className="text-sm text-arc-text2 mt-0.5">Sermons et diffusion en direct</p>
      </div>

      {/* Main video */}
      {mainSermon?.youtube_id ? (
        <div className="mb-6">
          <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-4">
            <iframe
              src={`https://www.youtube.com/embed/${mainSermon.youtube_id}?rel=0`}
              title={mainSermon.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-serif text-xl font-bold text-arc-navy mb-1">{mainSermon.title}</h2>
            <div className="text-sm text-arc-text3">
              {mainSermon.pastor} · {new Date(mainSermon.date).toLocaleDateString("fr-CH")}
              {mainSermon.reference ? ` · ${mainSermon.reference}` : ""}
            </div>
            {mainSermon.excerpt && (
              <p className="text-sm text-arc-text2 mt-3 leading-relaxed">{mainSermon.excerpt}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-arc-navy rounded-2xl aspect-video flex flex-col items-center justify-center text-white mb-6">
          <div className="text-5xl mb-3">📺</div>
          <div className="font-serif text-2xl font-bold mb-1">En direct tous les dimanches</div>
          <div className="text-white/60 text-sm">Culte à 9h30 · La Chaux-de-Fonds</div>
        </div>
      )}

      {/* Schedule */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {schedule.map((item) => (
          <div key={item.title} className="bg-white border border-arc-border rounded-2xl p-4 flex gap-3 items-start">
            <div className="text-2xl flex-shrink-0">{item.icon}</div>
            <div>
              <div className="font-bold text-arc-navy text-sm">{item.title}</div>
              <div className="text-xs text-arc-text3 mt-0.5">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent sermons list */}
      {latest && latest.length > 1 && (
        <div className="bg-white border border-arc-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-arc-border">
            <h2 className="font-bold text-sm text-arc-navy">Sermons récents</h2>
          </div>
          <div className="divide-y divide-arc-border">
            {(mainSermon?.youtube_id ? latest.slice(1) : latest).map((s) => (
              <a
                key={s.id}
                href={`https://www.youtube.com/watch?v=${s.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-arc-bg transition-colors"
              >
                <div className="w-16 h-11 rounded-lg overflow-hidden bg-arc-navy flex-shrink-0">
                  <Image
                    src={`https://img.youtube.com/vi/${s.youtube_id}/mqdefault.jpg`}
                    alt={s.title}
                    width={120}
                    height={68}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-arc-navy truncate">{s.title}</div>
                  <div className="text-xs text-arc-text3">{s.pastor} · {new Date(s.date).toLocaleDateString("fr-CH")}</div>
                </div>
                <span className="text-arc-blue text-sm flex-shrink-0">▶</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
