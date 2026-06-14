import { NextRequest, NextResponse } from "next/server";

const YT = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const apiKey    = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

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
