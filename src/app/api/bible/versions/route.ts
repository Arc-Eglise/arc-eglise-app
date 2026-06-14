import { NextResponse } from "next/server";

const BASE = process.env.BIBLE_API_BASE ?? "https://api.scripture.api.bible/v1";

// Priority language names shown first in selector
const PRIORITY_LANGS = ["French", "Lingala", "English", "Spanish", "Portuguese", "Arabic", "German", "Italian", "Dutch"];

export const revalidate = 86400;

export async function GET() {
  const key = process.env.BIBLE_API_KEY;
  if (!key || key === "your_api_bible_key_here") {
    return NextResponse.json({ error: "BIBLE_API_KEY non configurée" }, { status: 503 });
  }

  const res = await fetch(`${BASE}/bibles`, { headers: { "api-key": key } });
  if (!res.ok) return NextResponse.json({ error: "Bible API error" }, { status: 500 });

  const { data } = await res.json();

  type RawBible = { id: string; name: string; abbreviationLocal?: string; abbreviation?: string; language?: { name?: string } };

  const all = (data as RawBible[]).map((b) => ({
    id:       b.id,
    name:     b.name,
    abbr:     b.abbreviationLocal || b.abbreviation || "",
    language: b.language?.name ?? "Other",
  }));

  // Sort: priority languages first, then alphabetical by language + name
  all.sort((a, b) => {
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
