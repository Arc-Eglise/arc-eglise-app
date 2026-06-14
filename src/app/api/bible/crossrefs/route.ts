import { NextRequest, NextResponse } from "next/server";

// OpenBible.info — gratuit, sans clé API
// Format passage: "John 3:16" ou "Gen 1:1"
export async function GET(req: NextRequest) {
  const passage = req.nextUrl.searchParams.get("passage");
  if (!passage) return NextResponse.json({ refs: [] });

  const res = await fetch(
    `https://api.openbible.info/api/refs?p=${encodeURIComponent(passage)}`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) return NextResponse.json({ refs: [] });

  const data = await res.json();

  // OpenBible returns { start_verse: "...", end_verse: "...", sv: [...], ev: [...], refs: [{p, v, a},...] }
  const refs = (data.refs ?? [])
    .slice(0, 15)
    .map((r: { p: string; v: number; a: number }) => ({
      passage: r.p,
      votes:   r.v,
      agree:   r.a,
    }));

  return NextResponse.json({ refs });
}
