import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Image            from "next/image";

type YTItem = {
  videoId:     string;
  title:       string;
  description: string;
  publishedAt: string;
  thumbnail:   string | null;
};

export default async function StreamingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Fetch YouTube live + recent videos + DB featured sermon in parallel
  const [liveRes, videosRes, { data: featured }, { data: dbSermons }] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : "http://localhost:3000"}/api/youtube/videos?type=live`, { cache: "no-store" })
      .then(r => r.json()).catch(() => ({ configured: false, live: null })),
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : "http://localhost:3000"}/api/youtube/videos?maxResults=12`, { next: { revalidate: 300 } })
      .then(r => r.json()).catch(() => ({ configured: false, items: [] })),
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

  const isLive: boolean    = !!(liveRes?.live);
  const liveVideo          = liveRes?.live ?? null;
  const ytConfigured: boolean = !!(videosRes?.configured);
  const ytVideos: YTItem[] = videosRes?.items ?? [];

  // Priority: live stream > featured DB sermon > latest YT video > latest DB sermon
  type MainVideo = { youtubeId: string; title: string; subtitle: string; excerpt?: string | null };
  let mainVideo: MainVideo | null = null;

  if (isLive && liveVideo) {
    mainVideo = { youtubeId: liveVideo.videoId, title: liveVideo.title, subtitle: "🔴 En direct maintenant" };
  } else if (featured?.youtube_id) {
    mainVideo = { youtubeId: featured.youtube_id, title: featured.title, subtitle: `${featured.pastor} · ${new Date(featured.date).toLocaleDateString("fr-CH")}`, excerpt: featured.excerpt };
  } else if (ytVideos.length > 0) {
    const v = ytVideos[0];
    mainVideo = { youtubeId: v.videoId, title: v.title, subtitle: new Date(v.publishedAt).toLocaleDateString("fr-CH") };
  } else if (dbSermons?.[0]?.youtube_id) {
    const s = dbSermons[0];
    mainVideo = { youtubeId: s.youtube_id, title: s.title, subtitle: `${s.pastor} · ${new Date(s.date).toLocaleDateString("fr-CH")}` };
  }

  const schedule = [
    { icon: "📅", title: "Culte dominical",   desc: "Dimanche à 9h30" },
    { icon: "🎤", title: "Groupe de louange",  desc: "Mercredi à 19h00" },
    { icon: "📖", title: "Étude biblique",     desc: "Vendredi à 18h30" },
  ];

  // Video list: YT API if configured, else DB
  const videoList: { id: string; youtubeId: string; title: string; subtitle: string; thumbnail?: string | null }[] =
    ytConfigured && ytVideos.length > 1
      ? ytVideos.slice(1).map(v => ({
          id:        v.videoId,
          youtubeId: v.videoId,
          title:     v.title,
          subtitle:  new Date(v.publishedAt).toLocaleDateString("fr-CH"),
          thumbnail: v.thumbnail,
        }))
      : (dbSermons ?? []).slice(mainVideo ? 1 : 0).map(s => ({
          id:        s.id,
          youtubeId: s.youtube_id,
          title:     s.title,
          subtitle:  `${s.pastor} · ${new Date(s.date).toLocaleDateString("fr-CH")}`,
          thumbnail: null,
        }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-arc-navy">Streaming</h1>
          <p className="text-sm text-arc-text2 mt-0.5">Sermons · Cultes · Diffusion en direct</p>
        </div>
        {isLive && (
          <span className="inline-flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full" />
            EN DIRECT
          </span>
        )}
        {ytConfigured && !isLive && (
          <span className="inline-flex items-center gap-2 text-xs text-arc-text3 border border-arc-border rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            YouTube connecté
          </span>
        )}
      </div>

      {/* Main video */}
      {mainVideo ? (
        <div className="mb-6">
          <div className={`rounded-2xl overflow-hidden bg-black aspect-video mb-4 ${isLive ? "ring-2 ring-red-500 ring-offset-2" : ""}`}>
            <iframe
              src={`https://www.youtube.com/embed/${mainVideo.youtubeId}${isLive ? "?autoplay=1" : "?rel=0"}`}
              title={mainVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-serif text-xl font-bold text-arc-navy mb-1">{mainVideo.title}</h2>
            <div className="text-sm text-arc-text3">{mainVideo.subtitle}</div>
            {mainVideo.excerpt && <p className="text-sm text-arc-text2 mt-3 leading-relaxed">{mainVideo.excerpt}</p>}
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
        {schedule.map(item => (
          <div key={item.title} className="bg-white border border-arc-border rounded-2xl p-4 flex gap-3 items-start">
            <div className="text-2xl flex-shrink-0">{item.icon}</div>
            <div>
              <div className="font-bold text-arc-navy text-sm">{item.title}</div>
              <div className="text-xs text-arc-text3 mt-0.5">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Video list */}
      {videoList.length > 0 && (
        <div className="bg-white border border-arc-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-arc-border flex items-center justify-between">
            <h2 className="font-bold text-sm text-arc-navy">Vidéos récentes</h2>
            {ytConfigured && (
              <span className="text-[10px] text-arc-text3 font-medium uppercase tracking-wide">YouTube API</span>
            )}
          </div>
          <div className="divide-y divide-arc-border">
            {videoList.map(v => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-arc-bg transition-colors"
              >
                <div className="w-16 h-11 rounded-lg overflow-hidden bg-arc-navy flex-shrink-0">
                  {(v.thumbnail || v.youtubeId) && (
                    <Image
                      src={v.thumbnail ?? `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                      alt={v.title}
                      width={120}
                      height={68}
                      className="w-full h-full object-cover"
                      unoptimized={!!v.thumbnail}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-arc-navy truncate">{v.title}</div>
                  <div className="text-xs text-arc-text3">{v.subtitle}</div>
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
