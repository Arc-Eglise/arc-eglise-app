import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.scripture.api.bible/v1";

export async function GET(req: NextRequest) {
  const key = process.env.BIBLE_API_KEY;
  if (!key || key === "your_api_bible_key_here") {
    return NextResponse.json({ error: "BIBLE_API_KEY non configurée" }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const bibleId   = searchParams.get("bibleId") || process.env.BIBLE_DEFAULT_ID;
  const chapterId = searchParams.get("chapterId");
  if (!chapterId) return NextResponse.json({ error: "chapterId requis" }, { status: 400 });

  const url =
    `${BASE}/bibles/${bibleId}/chapters/${chapterId}` +
    `?content-type=html&include-notes=false&include-titles=true` +
    `&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true`;

  const res = await fetch(url, {
    headers: { "api-key": key },
    next: { revalidate: 86400 },
  });

  if (!res.ok) return NextResponse.json({ error: "Bible API error" }, { status: 500 });

  const { data } = await res.json();
  return NextResponse.json({
    id:        data.id,
    bibleId:   data.bibleId,
    reference: data.reference,
    content:   data.content,
    next:      data.next ?? null,
    previous:  data.previous ?? null,
  });
}
