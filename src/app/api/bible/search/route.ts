import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.BIBLE_API_BASE ?? "https://api.scripture.api.bible/v1";

export async function GET(req: NextRequest) {
  const key = (process.env.BIBLE_API_KEY ?? "").replace(/^﻿/, "").trim();
  if (!key || key === "your_api_bible_key_here") {
    return NextResponse.json({ error: "BIBLE_API_KEY non configurée" }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const bibleId = searchParams.get("bibleId") || process.env.BIBLE_DEFAULT_ID;
  const query   = searchParams.get("query")?.trim();

  if (!query) return NextResponse.json({ verses: [], total: 0 });

  const res = await fetch(
    `${BASE}/bibles/${bibleId}/search?query=${encodeURIComponent(query)}&limit=30&sort=relevance`,
    { headers: { "api-key": key } }
  );

  if (!res.ok) return NextResponse.json({ error: "Bible API error" }, { status: 500 });

  const { data } = await res.json();
  return NextResponse.json({
    verses: (data.verses ?? []).map((v: { id: string; reference: string; text: string }) => ({
      id:        v.id,
      reference: v.reference,
      text:      v.text,
    })),
    total: data.total ?? 0,
    query: data.query,
  });
}
