import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const YT = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  // Source unique de l'ID chaîne : réglage Supabase (éditable dans « Gérer le
  // stream »), avec repli sur la variable d'env pour rétrocompatibilité.
  const { data: setting } = await createClient()
    .from("site_settings")
    .select("value")
    .eq("key", "youtube_channel_id")
    .maybeSingle();
  const channelId = (setting?.value as string)?.trim() || process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || apiKey === "your_youtube_api_key_here" || !channelId || channelId.startsWith("UCxxxxx")) {
    return NextResponse.json({ configured: false, items: [], live: null });
  }

  const maxResults = req.nextUrl.searchParams.get("maxResults") ?? "12";
  const type       = req.nextUrl.searchParams.get("type") ?? "videos"; // "videos" | "live"

  if (type === "live") {
    const res = await fetch(
      `${YT}/search?key=${apiKey}&channelId=${channelId}&part=snippet&type=video&eventType=live&maxResults=1`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return NextResponse.json({ configured: true, live: null, items: [] });
    const data = await res.json();
    const item = data.items?.[0] ?? null;
    return NextResponse.json({
      configured: true,
      live: item ? {
        videoId:     item.id.videoId,
        title:       item.snippet.title,
        thumbnail:   item.snippet.thumbnails?.high?.url ?? null,
        publishedAt: item.snippet.publishedAt,
      } : null,
      items: [],
    });
  }

  // Recent videos
  const res = await fetch(
    `${YT}/search?key=${apiKey}&channelId=${channelId}&part=snippet&type=video&order=date&maxResults=${maxResults}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return NextResponse.json({ configured: true, live: null, items: [] });

  const data = await res.json();
  const items = (data.items ?? []).map((item: {
    id: { videoId: string };
    snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string } } };
  }) => ({
    videoId:     item.id.videoId,
    title:       item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnail:   item.snippet.thumbnails?.high?.url ?? null,
  }));

  return NextResponse.json({ configured: true, live: null, items });
}
