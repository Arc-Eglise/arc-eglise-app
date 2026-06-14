"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveBibleNote, deleteBibleNote, saveBookmark, removeBookmark, saveProgress } from "@/lib/actions/bible";

type Version  = { id: string; name: string; abbr: string; language?: string };
type Book     = { id: string; name: string; chapters?: { id: string; number: string }[] };
type Chapter  = { id: string; reference: string; content: string; bibleId: string; next?: { id: string } | null; previous?: { id: string } | null };
type Note     = { id: string; verse_ref: string; verse_text: string | null; note: string; updated_at: string };
type Bookmark = { verse_ref: string; label: string | null };
type CrossRef = { passage: string; votes: number };

interface Props {
  defaultBibleId: string;
  versions:       Version[];
  books:          Book[];
  initialChapter: Chapter | null;
  notes:          Note[];
  bookmarks:      Bookmark[];
}

type Tab = "lecture" | "recherche" | "references" | "notes";

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "bg-yellow-100 border-yellow-300",
  blue:   "bg-blue-100 border-blue-300",
  green:  "bg-green-100 border-green-300",
  pink:   "bg-pink-100 border-pink-300",
};

export default function BibleReader({ defaultBibleId, versions, books, initialChapter, notes: initNotes, bookmarks: initBookmarks }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // State
  const [bibleId,     setBibleId]     = useState(defaultBibleId);
  const [currentBook, setCurrentBook] = useState<Book>(books[0] ?? { id: "GEN", name: "Genèse" });
  const [chapter,     setChapter]     = useState<Chapter | null>(initialChapter);
  const [loading,     setLoading]     = useState(false);
  const [tab,         setTab]         = useState<Tab>("lecture");
  const [notes,       setNotes]       = useState<Note[]>(initNotes);
  const [bookmarks,   setBookmarks]   = useState<Bookmark[]>(initBookmarks);

  // Search
  const [searchQ,       setSearchQ]       = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; reference: string; text: string }[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [searchDone,    setSearchDone]    = useState(false);

  // Cross-references
  const [crossRefs,    setCrossRefs]    = useState<CrossRef[]>([]);
  const [loadingRefs,  setLoadingRefs]  = useState(false);

  // Note modal
  const [noteModal, setNoteModal] = useState<{ ref: string; text: string } | null>(null);
  const [noteText,  setNoteText]  = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const chapterRef = useRef<HTMLDivElement>(null);

  // Attach click handlers to verse numbers in rendered HTML
  useEffect(() => {
    const el = chapterRef.current;
    if (!el || !chapter) return;
    const handler = (e: MouseEvent) => {
      const span = (e.target as HTMLElement).closest<HTMLElement>("[data-number]");
      if (!span) return;
      const num  = span.dataset.number;
      const para = span.closest("p");
      const text = para?.textContent?.replace(/^\d+\s*/, "").trim() ?? "";
      const bookId = chapter.id.split(".")[0];
      const chapNum = chapter.id.split(".")[1];
      const ref = `${bookId}.${chapNum}.${num}`;
      const existing = notes.find(n => n.verse_ref === ref);
      setNoteModal({ ref, text });
      setNoteText(existing?.note ?? "");
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [chapter, notes]);

  async function loadChapter(chapterId: string, newBibleId?: string) {
    setLoading(true);
    try {
      const bid = newBibleId ?? bibleId;
      const res = await fetch(`/api/bible/chapter?bibleId=${bid}&chapterId=${chapterId}`);
      if (!res.ok) throw new Error();
      const data: Chapter = await res.json();
      setChapter(data);
      const bookId = chapterId.split(".")[0];
      const book   = books.find(b => b.id === bookId);
      if (book) setCurrentBook(book);
      startTransition(() => { saveProgress(bid, chapterId); });
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }

  async function handleVersionChange(newId: string) {
    setBibleId(newId);
    if (chapter) await loadChapter(chapter.id, newId);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true);
    setSearchDone(false);
    try {
      const res = await fetch(`/api/bible/search?bibleId=${bibleId}&query=${encodeURIComponent(searchQ)}`);
      const data = await res.json();
      setSearchResults(data.verses ?? []);
      setSearchDone(true);
    } finally {
      setSearching(false);
    }
  }

  const loadCrossRefs = useCallback(async () => {
    if (!chapter) return;
    setLoadingRefs(true);
    try {
      // Convert API.Bible ref to readable format for OpenBible (e.g. "JHN.3" → "John 3")
      const res = await fetch(`/api/bible/crossrefs?passage=${encodeURIComponent(chapter.reference)}`);
      const data = await res.json();
      setCrossRefs(data.refs ?? []);
    } finally {
      setLoadingRefs(false);
    }
  }, [chapter]);

  useEffect(() => {
    if (tab === "references" && crossRefs.length === 0) loadCrossRefs();
  }, [tab, crossRefs.length, loadCrossRefs]);

  async function handleSaveNote() {
    if (!noteModal || !noteText.trim()) return;
    setSavingNote(true);
    const fd = new FormData();
    fd.set("verse_ref", noteModal.ref);
    fd.set("verse_text", noteModal.text);
    fd.set("note", noteText);
    fd.set("bible_id", bibleId);
    const result = await saveBibleNote(fd);
    if (!result.error) {
      const idx = notes.findIndex(n => n.verse_ref === noteModal.ref);
      const updated: Note = { id: idx >= 0 ? notes[idx].id : Date.now().toString(), verse_ref: noteModal.ref, verse_text: noteModal.text, note: noteText, updated_at: new Date().toISOString() };
      if (idx >= 0) { const arr = [...notes]; arr[idx] = updated; setNotes(arr); }
      else setNotes([updated, ...notes]);
      setNoteModal(null);
    }
    setSavingNote(false);
  }

  async function handleDeleteNote(id: string, ref: string) {
    await deleteBibleNote(id);
    setNotes(notes.filter(n => n.verse_ref !== ref));
  }

  async function handleBookmark(ref: string) {
    const exists = bookmarks.find(b => b.verse_ref === ref);
    if (exists) {
      await removeBookmark(ref);
      setBookmarks(bookmarks.filter(b => b.verse_ref !== ref));
    } else {
      await saveBookmark(ref);
      setBookmarks([...bookmarks, { verse_ref: ref, label: null }]);
    }
  }

  const chaptersForBook = currentBook.chapters ?? [];

  return (
    <div className="flex flex-col gap-0">

      {/* ── Top navigation ──────────────────────────────────────── */}
      <div className="bg-white border border-arc-border rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center">

        {/* Bible version */}
        {versions.length > 0 && (
          <select
            value={bibleId}
            onChange={e => handleVersionChange(e.target.value)}
            className="text-xs font-bold text-arc-navy border border-arc-border rounded-lg px-2 py-1.5 bg-arc-bg focus:outline-none max-w-[160px]"
          >
            {Object.entries(
              versions.reduce((acc, v) => {
                const lang = v.language ?? "Autre";
                if (!acc[lang]) acc[lang] = [];
                acc[lang].push(v);
                return acc;
              }, {} as Record<string, Version[]>)
            ).map(([lang, vs]) => (
              <optgroup key={lang} label={lang}>
                {vs.map(v => <option key={v.id} value={v.id}>{v.abbr} — {v.name.slice(0, 30)}</option>)}
              </optgroup>
            ))}
          </select>
        )}

        {/* Book selector */}
        <select
          value={currentBook.id}
          onChange={e => {
            const b = books.find(x => x.id === e.target.value);
            if (b) { setCurrentBook(b); loadChapter(`${b.id}.1`); }
          }}
          className="flex-1 min-w-[140px] text-sm font-semibold text-arc-navy border border-arc-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-arc-blue"
        >
          <optgroup label="Ancien Testament">
            {books.slice(0, 39).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </optgroup>
          <optgroup label="Nouveau Testament">
            {books.slice(39).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </optgroup>
        </select>

        {/* Chapter selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => chapter?.previous && loadChapter(chapter.previous.id)}
            disabled={!chapter?.previous || loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-arc-border text-arc-navy hover:bg-arc-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >‹</button>

          <select
            value={chapter?.id ?? ""}
            onChange={e => loadChapter(e.target.value)}
            className="text-sm font-semibold text-arc-navy border border-arc-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-arc-blue"
          >
            {chaptersForBook.map(c => (
              <option key={c.id} value={c.id}>Ch. {c.number}</option>
            ))}
          </select>

          <button
            onClick={() => chapter?.next && loadChapter(chapter.next.id)}
            disabled={!chapter?.next || loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-arc-border text-arc-navy hover:bg-arc-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >›</button>
        </div>

        {/* Reference display */}
        <span className="text-xs text-arc-text3 font-medium hidden sm:inline">{chapter?.reference}</span>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-4 bg-white border border-arc-border rounded-2xl p-1">
        {([ ["lecture", "📖", "Lecture"], ["recherche", "🔍", "Recherche"], ["references", "✝️", "Références"], ["notes", "📝", "Notes"] ] as [Tab, string, string][]).map(([t, icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-colors ${
              tab === t ? "bg-arc-navy text-white" : "text-arc-text3 hover:text-arc-navy hover:bg-arc-bg"
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
            {t === "notes" && notes.length > 0 && (
              <span className={`rounded-full text-[9px] px-1.5 py-0 font-bold ${tab === "notes" ? "bg-arc-gold text-arc-navy" : "bg-arc-blueBg text-arc-navy"}`}>
                {notes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}

      {/* LECTURE TAB */}
      {tab === "lecture" && (
        <div className="bg-white border border-arc-border rounded-2xl p-5 md:p-8 relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-arc-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chapter ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-bold text-arc-navy">{chapter.reference}</h2>
                <span className="text-[10px] text-arc-text3 font-bold uppercase tracking-widest">
                  Cliquer sur un verset → ajouter une note
                </span>
              </div>
              <div
                ref={chapterRef}
                className="bible-content font-serif text-lg leading-8 text-arc-navy cursor-pointer"
                dangerouslySetInnerHTML={{ __html: chapter.content }}
              />
              <style>{`
                .bible-content .v {
                  font-size: 0.6em;
                  font-weight: 700;
                  color: #3b82f6;
                  vertical-align: super;
                  margin-right: 2px;
                  cursor: pointer;
                  font-family: sans-serif;
                  padding: 0 2px;
                  border-radius: 3px;
                  transition: background 0.15s;
                }
                .bible-content .v:hover {
                  background: #dbeafe;
                }
                .bible-content p { margin-bottom: 0.75rem; }
                .bible-content .b { }
                .bible-content .nd { font-variant: small-caps; }
                .bible-content .wj { color: #b91c1c; }
              `}</style>
            </>
          ) : (
            <div className="text-center py-16 text-arc-text3">
              <div className="text-4xl mb-3">📖</div>
              <p className="font-medium">Clé API Bible non configurée</p>
              <p className="text-sm mt-1">Configure BIBLE_API_KEY dans .env.local</p>
            </div>
          )}
        </div>
      )}

      {/* RECHERCHE TAB */}
      {tab === "recherche" && (
        <div className="bg-white border border-arc-border rounded-2xl p-5">
          <form onSubmit={handleSearch} className="flex gap-2 mb-5">
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Chercher un mot, une expression…"
              className="flex-1 border border-arc-border rounded-xl px-4 py-2.5 text-sm text-arc-navy focus:outline-none focus:border-arc-blue"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2.5 bg-arc-navy text-white text-sm font-bold rounded-xl hover:bg-arc-blue transition-colors disabled:opacity-50"
            >
              {searching ? "…" : "Chercher"}
            </button>
          </form>

          {searchDone && searchResults.length === 0 && (
            <p className="text-center text-arc-text3 py-8">Aucun résultat pour « {searchQ} »</p>
          )}

          <div className="space-y-3">
            {searchResults.map(v => (
              <div
                key={v.id}
                onClick={() => {
                  const [bookId, chapNum] = v.id.split(".");
                  loadChapter(`${bookId}.${chapNum}`);
                  setTab("lecture");
                }}
                className="p-4 border border-arc-border rounded-xl hover:border-arc-blue hover:bg-arc-bg transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-arc-blue mb-1">{v.reference}</div>
                <div className="text-sm text-arc-navy leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: v.text }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RÉFÉRENCES TAB */}
      {tab === "references" && (
        <div className="bg-white border border-arc-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-arc-navy">Références croisées — {chapter?.reference}</h3>
            <button
              onClick={loadCrossRefs}
              className="text-xs text-arc-blue hover:underline"
            >↺ Actualiser</button>
          </div>

          {loadingRefs ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-arc-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : crossRefs.length === 0 ? (
            <div className="text-center py-8 text-arc-text3">
              <div className="text-3xl mb-2">✝️</div>
              <p className="text-sm">Aucune référence croisée trouvée pour ce passage.</p>
              <p className="text-xs mt-1 text-arc-text3">Source : OpenBible.info (gratuit)</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-arc-text3 mb-4">Source : OpenBible.info · {crossRefs.length} références trouvées</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {crossRefs.map((ref, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      // Try to navigate to this passage
                      setSearchQ(ref.passage);
                      setTab("recherche");
                    }}
                    className="flex items-center gap-3 p-3 border border-arc-border rounded-xl hover:border-arc-blue hover:bg-arc-bg transition-colors text-left"
                  >
                    <div className="text-sm font-semibold text-arc-navy flex-1">{ref.passage}</div>
                    <div className="text-[10px] text-arc-text3 font-bold">{ref.votes} votes</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* NOTES TAB */}
      {tab === "notes" && (
        <div className="bg-white border border-arc-border rounded-2xl p-5">
          <h3 className="font-bold text-arc-navy mb-4">Mes notes d'étude ({notes.length})</h3>

          {notes.length === 0 ? (
            <div className="text-center py-12 text-arc-text3">
              <div className="text-4xl mb-3">📝</div>
              <p className="font-medium">Aucune note pour l'instant</p>
              <p className="text-sm mt-1">Clique sur un numéro de verset dans l'onglet Lecture</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(n => (
                <div key={n.id} className="border border-arc-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <button
                      onClick={() => {
                        const [bookId, chapNum] = n.verse_ref.split(".");
                        loadChapter(`${bookId}.${chapNum}`);
                        setTab("lecture");
                      }}
                      className="text-xs font-bold text-arc-blue hover:underline"
                    >{n.verse_ref.replace(/\./g, " ")}</button>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setNoteModal({ ref: n.verse_ref, text: n.verse_text ?? "" }); setNoteText(n.note); }}
                        className="text-xs text-arc-text3 hover:text-arc-navy"
                      >✏️</button>
                      <button
                        onClick={() => handleDeleteNote(n.id, n.verse_ref)}
                        className="text-xs text-arc-text3 hover:text-red-500"
                      >✕</button>
                    </div>
                  </div>
                  {n.verse_text && (
                    <p className="text-xs text-arc-text3 italic mb-2 leading-relaxed border-l-2 border-arc-gold pl-3">
                      {n.verse_text}
                    </p>
                  )}
                  <p className="text-sm text-arc-navy leading-relaxed whitespace-pre-wrap">{n.note}</p>
                  <div className="text-[10px] text-arc-text3 mt-2">
                    {new Date(n.updated_at).toLocaleDateString("fr-CH")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Note modal ──────────────────────────────────────────── */}
      {noteModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setNoteModal(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-arc-navy">
                Note — {noteModal.ref.replace(/\./g, " ")}
              </h3>
              <button onClick={() => setNoteModal(null)} className="text-arc-text3 hover:text-arc-navy">✕</button>
            </div>

            {noteModal.text && (
              <blockquote className="text-sm text-arc-text2 italic border-l-3 border-arc-gold pl-3 mb-4 leading-relaxed">
                {noteModal.text}
              </blockquote>
            )}

            <div className="flex gap-2 mb-3">
              <button onClick={() => handleBookmark(noteModal.ref)} className="text-xs text-arc-text3 hover:text-arc-gold">
                {bookmarks.find(b => b.verse_ref === noteModal.ref) ? "⭐ Retiré" : "☆ Marque-page"}
              </button>
            </div>

            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Commentaire, réflexion théologique, application…"
              rows={5}
              className="w-full border border-arc-border rounded-xl px-4 py-3 text-sm text-arc-navy focus:outline-none focus:border-arc-blue resize-none"
              autoFocus
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSaveNote}
                disabled={savingNote || !noteText.trim()}
                className="flex-1 py-2.5 bg-arc-navy text-white text-sm font-bold rounded-xl hover:bg-arc-blue transition-colors disabled:opacity-50"
              >
                {savingNote ? "Enregistrement…" : "Enregistrer la note"}
              </button>
              <button
                onClick={() => setNoteModal(null)}
                className="px-4 py-2.5 border border-arc-border text-sm rounded-xl text-arc-text3 hover:text-arc-navy"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
