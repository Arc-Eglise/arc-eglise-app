import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link             from "next/link";
import BibleReader      from "@/components/bible/BibleReader";

export default async function BiblePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const defaultBibleId = process.env.BIBLE_DEFAULT_ID ?? "61fd76eafa1ef5f7-01";
  const apiKey         = process.env.BIBLE_API_KEY;
  const configured     = !!(apiKey && apiKey !== "your_api_bible_key_here");

  const BASE = "https://api.scripture.api.bible/v1";
  const headers = { "api-key": apiKey ?? "" };

  // Fetch user's last chapter read
  const { data: progress } = await supabase
    .from("bible_progress")
    .select("bible_id, chapter_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const activeBibleId = progress?.bible_id ?? defaultBibleId;
  const activeChapter = progress?.chapter_id ?? "GEN.1";

  const [versionsRes, booksRes, chapterRes, notesRes, bookmarksRes] = await Promise.all([
    // All available Bible versions (sorted by priority language)
    configured
      ? fetch(`${BASE}/bibles`, { headers, next: { revalidate: 86400 } }).then(r => r.ok ? r.json() : { data: [] })
      : Promise.resolve({ data: [] }),

    // Books list
    configured
      ? fetch(`${BASE}/bibles/${activeBibleId}/books?include-chapters=true`, { headers, next: { revalidate: 86400 } }).then(r => r.ok ? r.json() : { data: [] })
      : Promise.resolve({ data: [] }),

    // Initial chapter
    configured
      ? fetch(`${BASE}/bibles/${activeBibleId}/chapters/${activeChapter}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=true`,
          { headers, next: { revalidate: 86400 } }
        ).then(r => r.ok ? r.json() : { data: null })
      : Promise.resolve({ data: null }),

    // User notes
    supabase.from("bible_notes")
      .select("id, verse_ref, verse_text, note, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),

    // User bookmarks
    supabase.from("bible_bookmarks")
      .select("verse_ref, label")
      .eq("user_id", user.id),
  ]);

  const PRIORITY_LANGS = ["French", "Lingala", "English", "Spanish", "Portuguese", "Arabic", "German", "Italian", "Dutch"];

  const versions = (versionsRes.data ?? [])
    .map((b: { id: string; name: string; abbreviationLocal?: string; abbreviation?: string; language?: { name?: string } }) => ({
      id:       b.id,
      name:     b.name,
      abbr:     b.abbreviationLocal || b.abbreviation || "",
      language: b.language?.name ?? "Other",
    }))
    .sort((a: { language: string; name: string }, b: { language: string; name: string }) => {
      const ai = PRIORITY_LANGS.findIndex(l => a.language.toLowerCase().includes(l.toLowerCase()));
      const bi = PRIORITY_LANGS.findIndex(l => b.language.toLowerCase().includes(l.toLowerCase()));
      const ap = ai === -1 ? 99 : ai;
      const bp = bi === -1 ? 99 : bi;
      if (ap !== bp) return ap - bp;
      return a.name.localeCompare(b.name);
    });

  const books    = booksRes.data    ?? [];
  const chapter  = chapterRes.data  ?? null;

  const chapterMapped = chapter ? {
    id:        chapter.id,
    bibleId:   chapter.bibleId,
    reference: chapter.reference,
    content:   chapter.content,
    next:      chapter.next     ?? null,
    previous:  chapter.previous ?? null,
  } : null;

  return (
    <div>
      <Link href="/espace-membres/ai-biblique" className="inline-flex items-center gap-1.5 text-sm text-arc-blue hover:text-arc-navy mb-5 transition-colors">
        ← ARC Église AI
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-arc-navy">📖 Bible</h1>
          <p className="text-sm text-arc-text2 mt-0.5">Lecture · Étude · Références croisées · Mes notes</p>
        </div>
        {!configured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 font-medium">
            ⚠️ BIBLE_API_KEY non configurée
          </div>
        )}
      </div>

      <BibleReader
        defaultBibleId={activeBibleId}
        versions={versions}
        books={books}
        initialChapter={chapterMapped}
        notes={notesRes.data ?? []}
        bookmarks={bookmarksRes.data ?? []}
      />
    </div>
  );
}
