import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.BIBLE_API_BASE ?? "https://api.scripture.api.bible/v1";

export async function GET(req: NextRequest) {
  const key = (process.env.BIBLE_API_KEY ?? "").replace(/^﻿/, "").trim();
  if (!key || key === "your_api_bible_key_here") {
    return NextResponse.json({ error: "BIBLE_API_KEY non configurée" }, { status: 503 });
  }

  const bibleId = req.nextUrl.searchParams.get("bibleId") || process.env.BIBLE_DEFAULT_ID;

  try {
    const res = await fetch(`${BASE}/bibles/${bibleId}/books?include-chapters=true`, {
      headers: { "api-key": key },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Bible API ${res.status}`, detail: text }, { status: 500 });
    }

    const json = await res.json();
    return NextResponse.json(json?.data ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Exception", detail: msg }, { status: 500 });
  }
}
