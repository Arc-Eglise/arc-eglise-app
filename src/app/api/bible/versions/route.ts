import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = process.env.BIBLE_API_BASE ?? "https://api.scripture.api.bible/v1";

const PRIORITY_LANGS = ["French", "Lingala", "English", "Spanish", "Portuguese", "Arabic", "German", "Italian", "Dutch"];

export async function GET() {
  const raw = process.env.BIBLE_API_KEY ?? "";
  const key = raw.replace(/^﻿/, "").trim();

  if (!key || key === "your_api_bible_key_here") {
    return NextResponse.json({ error: "BIBLE_API_KEY non configurée" }, { status: 503 });
  }

  const res = await fetch(`${BASE}/bibles`, {
    headers: { "api-key": key },
    next: { revalidate: 86400 },
  });

  if (!res.ok) return NextResponse.json({ error: "Bible API error" }, { status: 500 });

  const { data } = await res.json();

  type RawBible = { id: string; name: string; abbreviationLocal?: string; abbreviation?: string; language?: { name?: string } };

  const all = (data as RawBible[])
    .map((b) => ({
      id:       b.id,
      name:     b.name,
      abbr:     b.abbreviationLocal || b.abbreviation || "",
      language: b.language?.name ?? "Other",
    }))
    .sort((a, b) => {
      const ai = PRIORITY_LANGS.findIndex(l => a.language.toLowerCase().includes(l.toLowerCase()));
      const bi = PRIORITY_LANGS.findIndex(l => b.language.toLowerCase().includes(l.toLowerCase()));
      const ap = ai === -1 ? 99 : ai;
      const bp = bi === -1 ? 99 : bi;
      if (ap !== bp) return ap - bp;
      if (a.language !== b.language) return a.language.localeCompare(b.language);
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json(all);
}
