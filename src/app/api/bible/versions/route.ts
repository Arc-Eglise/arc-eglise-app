import { NextResponse } from "next/server";

const BASE = "https://api.scripture.api.bible/v1";

export const revalidate = 86400;

export async function GET() {
  const key = process.env.BIBLE_API_KEY;
  if (!key || key === "your_api_bible_key_here") {
    return NextResponse.json({ error: "BIBLE_API_KEY non configurée" }, { status: 503 });
  }

  const res = await fetch(`${BASE}/bibles?language=fra`, {
    headers: { "api-key": key },
  });

  if (!res.ok) return NextResponse.json({ error: "Bible API error" }, { status: 500 });

  const { data } = await res.json();
  return NextResponse.json(
    (data as { id: string; name: string; abbreviationLocal: string }[]).map((b) => ({
      id: b.id,
      name: b.name,
      abbr: b.abbreviationLocal,
    }))
  );
}
