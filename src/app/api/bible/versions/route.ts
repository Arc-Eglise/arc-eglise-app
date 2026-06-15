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

  try {
    const res = await fetch(`${BASE}/bibles`, {
      headers: { "api-key": key },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Bible API ${res.status}`, detail: text }, { status: 500 });
    }

    const json = await res.json();
    const data = json?.data;

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Réponse inattendue de l'API Bible", raw: JSON.stringify(json).slice(0,200) }, { status: 500 });
    }

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Exception", detail: msg }, { status: 500 });
  }
}
