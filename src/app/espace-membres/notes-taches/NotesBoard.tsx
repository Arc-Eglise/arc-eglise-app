"use client";

import { useRef, useState } from "react";
import { createNote, updateNote, deleteNote, listNotes } from "@/lib/actions/notes";
import { NOTE_COLORS, type NoteRow, type NoteColor, type TagRow } from "@/lib/notes-taches/types";
import ShareModal from "./ShareModal";
import TagBar from "./TagBar";

/* ── Palette Sticky Notes ─────────────────────────────────────────────────── */
const COLOR_STYLE: Record<string, { bg: string; border: string; dot: string }> = {
  yellow: { bg: "#fff8c4", border: "#f2e27a", dot: "#f6d743" },
  green:  { bg: "#d7f5d3", border: "#a6e09e", dot: "#5fce54" },
  pink:   { bg: "#ffdbe7", border: "#f7aac2", dot: "#f56a9a" },
  blue:   { bg: "#d6ecff", border: "#a6cdf5", dot: "#4d9df0" },
  purple: { bg: "#e7dcff", border: "#c3aef2", dot: "#9268e8" },
  orange: { bg: "#ffe4cc", border: "#f7c091", dot: "#f59042" },
  gray:   { bg: "#e9ecf2", border: "#cbd2de", dot: "#9aa4b6" },
  white:  { bg: "#ffffff", border: "#e6e9f4", dot: "#c8cee0" },
};
const colorOf = (c: string) => COLOR_STYLE[c] ?? COLOR_STYLE.yellow;

/* ── Mini-formatage (façon Sticky Notes) → HTML sûr ───────────────────────── */
function renderRich(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/, "<ul>$1</ul>")
    .replace(/\n/g, "<br/>");
}

type Draft = { title: string; body: string; color: NoteColor; reference: string };

export default function NotesBoard({
  initialNotes, allTags, initialTagMap, onTagCreated,
}: {
  initialNotes: NoteRow[];
  allTags: TagRow[];
  initialTagMap: Record<string, string[]>;
  onTagCreated: (t: TagRow) => void;
}) {
  const [notes, setNotes]   = useState<NoteRow[]>(initialNotes);
  const [tagMap, setTagMap] = useState<Record<string, string[]>>(initialTagMap);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);   // note id en édition
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>({ title: "", body: "", color: "yellow", reference: "" });
  const [sharing, setSharing] = useState<NoteRow | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return !q ||
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      (n.reference ?? "").toLowerCase().includes(q);
  });

  /* ── Actions ── */
  function openCreate() {
    setDraft({ title: "", body: "", color: "yellow", reference: "" });
    setCreating(true); setEditing(null);
  }
  function openEdit(n: NoteRow) {
    setDraft({ title: n.title, body: n.body, color: n.color as NoteColor, reference: n.reference ?? "" });
    setEditing(n.id); setCreating(false);
  }
  function closeForm() { setCreating(false); setEditing(null); }

  async function saveCreate() {
    if (!draft.title.trim() && !draft.body.trim()) { closeForm(); return; }
    const payload = draft;
    closeForm();
    try {
      const res = await createNote(payload);
      if ("data" in res && res.data) { setNotes(prev => [res.data!, ...prev]); return; }
    } catch { /* cold-start 503 : l'insert a souvent réussi malgré l'erreur réseau */ }
    const fresh = await listNotes().catch(() => null);
    if (fresh && "data" in fresh && fresh.data) setNotes(fresh.data);
  }
  async function saveEdit() {
    if (!editing) return;
    const id = editing;
    setNotes(prev => prev.map(n => n.id === id
      ? { ...n, ...draft, reference: draft.reference || null, updated_at: new Date().toISOString() }
      : n));
    closeForm();
    await updateNote(id, {
      title: draft.title, body: draft.body, color: draft.color,
      reference: draft.reference || null,
    });
  }
  async function togglePin(n: NoteRow) {
    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, is_pinned: !x.is_pinned } : x));
    await updateNote(n.id, { is_pinned: !n.is_pinned });
  }
  async function changeColor(n: NoteRow, color: NoteColor) {
    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, color } : x));
    await updateNote(n.id, { color });
  }
  async function remove(n: NoteRow) {
    if (!confirm("Supprimer cette note ?")) return;
    setNotes(prev => prev.filter(x => x.id !== n.id));
    await deleteNote(n.id);
  }

  /* ── Barre de formatage (wrap sélection) ── */
  function wrap(before: string, after = before) {
    const ta = bodyRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const val = draft.body;
    const sel = val.slice(s, e) || "texte";
    const next = val.slice(0, s) + before + sel + after + val.slice(e);
    setDraft(d => ({ ...d, body: next }));
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length); });
  }
  function prefixLine(prefix: string) {
    const ta = bodyRef.current; if (!ta) return;
    const s = ta.selectionStart;
    const val = draft.body;
    const lineStart = val.lastIndexOf("\n", s - 1) + 1;
    const next = val.slice(0, lineStart) + prefix + val.slice(lineStart);
    setDraft(d => ({ ...d, body: next }));
    requestAnimationFrame(() => ta.focus());
  }

  const isForm = creating || editing !== null;

  return (
    <div>
      {/* Barre du haut */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher dans mes notes…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
        />
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
        >
          + Nouvelle note
        </button>
      </div>

      {/* Panneau latéral « Mode Édition » (création / édition) — charte Sacred Modernity */}
      {isForm && (
        <>
          <div className="fixed inset-0 z-40 bg-arc-navy/30 backdrop-blur-[2px]" onClick={closeForm} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
            {/* En-tête */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-arc-border">
              <h3 className="font-serif text-2xl text-arc-navy">{creating ? "Mode Édition" : "Mode Édition"}</h3>
              <div className="flex items-center gap-2">
                {!creating && editing && (
                  <button
                    onClick={() => { const n = notes.find(x => x.id === editing); if (n) setSharing(n); }}
                    title="Partager" aria-label="Partager la note"
                    className="w-8 h-8 rounded-lg text-arc-text2 hover:text-arc-navy hover:bg-arc-blueBg flex items-center justify-center transition-colors"
                  >📤</button>
                )}
                <button onClick={closeForm} aria-label="Fermer" className="w-8 h-8 rounded-lg text-arc-text3 hover:text-arc-navy hover:bg-arc-blueBg flex items-center justify-center transition-colors text-lg">✕</button>
              </div>
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-arc-blue mb-1.5">Titre</label>
              <input
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="Titre (facultatif)"
                maxLength={200}
                className="w-full px-3 py-2.5 mb-4 rounded-lg border border-arc-border text-sm font-semibold outline-none focus:border-arc-navy focus:ring-1 focus:ring-arc-navy"
              />
              <label className="block text-[11px] font-bold uppercase tracking-wider text-arc-blue mb-1.5">Référence biblique</label>
              <input
                value={draft.reference}
                onChange={e => setDraft(d => ({ ...d, reference: e.target.value }))}
                placeholder="ex. Jean 3:16 — facultatif"
                maxLength={100}
                className="w-full px-3 py-2.5 mb-4 rounded-lg border border-arc-border text-xs font-mono outline-none focus:border-arc-navy focus:ring-1 focus:ring-arc-navy"
              />
              <label className="block text-[11px] font-bold uppercase tracking-wider text-arc-blue mb-1.5">Contenu</label>
              {/* Barre de mise en forme */}
              <div className="flex items-center gap-1 mb-2">
                <FmtBtn label="G" title="Gras"      onClick={() => wrap("**")} className="font-bold" />
                <FmtBtn label="I" title="Italique"  onClick={() => wrap("*")}  className="italic" />
                <FmtBtn label="S" title="Souligné"  onClick={() => wrap("__")} className="underline" />
                <FmtBtn label="B" title="Barré"     onClick={() => wrap("~~")} className="line-through" />
                <FmtBtn label="•"  title="Liste"     onClick={() => prefixLine("- ")} />
              </div>
              <textarea
                ref={bodyRef}
                value={draft.body}
                onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                placeholder="Ta note…"
                maxLength={10000}
                rows={10}
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy focus:ring-1 focus:ring-arc-navy resize-y"
              />
              {/* Couleurs */}
              <label className="block text-[11px] font-bold uppercase tracking-wider text-arc-blue mt-4 mb-2">Couleur</label>
              <div className="flex items-center gap-2">
                {NOTE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setDraft(d => ({ ...d, color: c }))}
                    title={c}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${draft.color === c ? "scale-110 border-arc-navy" : "border-white"}`}
                    style={{ background: colorOf(c).dot }}
                  />
                ))}
              </div>
            </div>

            {/* Pied */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-arc-border">
              <button onClick={creating ? saveCreate : saveEdit} className="px-5 py-2.5 rounded-lg bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors">Enregistrer</button>
              <button onClick={closeForm} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-arc-text2 hover:text-arc-navy transition-colors">Annuler</button>
            </div>
          </aside>
        </>
      )}

      {/* Grille de notes — reproduction maquette Stitch */}
      {(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(n => {
            const dateLabel = new Date(n.updated_at).toLocaleDateString("fr-CH", { day: "2-digit", month: "short" });
            return (
              <article
                key={n.id}
                onClick={() => openEdit(n)}
                className="bg-white rounded-xl p-6 shadow-[0_4px_20px_rgba(26,35,126,0.05)] border border-transparent hover:border-[#c6c5d4] transition-all cursor-pointer group flex flex-col min-h-[190px]"
              >
                {/* Ligne méta : catégorie + date + actions (Material Symbols) */}
                <div className="flex justify-between items-start mb-4 gap-2">
                  <span className="bg-[#edeeef] text-[#191c1d] px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 min-w-0">
                    {n.is_pinned && <span className="material-symbols-outlined text-[14px] text-[#775a19]">push_pin</span>}
                    <span className="truncate">{n.reference ? n.reference : "Note"}</span>
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[#454652] text-sm">{dateLabel}</span>
                    <button onClick={(e) => { e.stopPropagation(); togglePin(n); }} title={n.is_pinned ? "Désépingler" : "Épingler"} className="text-[#454652] hover:text-[#1a237e] transition-colors flex"><span className="material-symbols-outlined text-[18px]">push_pin</span></button>
                    <button onClick={(e) => { e.stopPropagation(); setSharing(n); }} title="Partager" className="text-[#454652] hover:text-[#1a237e] transition-colors flex"><span className="material-symbols-outlined text-[18px]">share</span></button>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(n); }} title="Éditer" className="text-[#454652] hover:text-[#1a237e] transition-colors flex"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                    <button onClick={(e) => { e.stopPropagation(); remove(n); }} title="Supprimer" className="text-[#454652] hover:text-[#ba1a1a] transition-colors flex"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </div>
                </div>

                {n.title && (
                  <h3 className="text-[20px] leading-[28px] text-[#1a237e] mb-3 group-hover:text-[#775a19] transition-colors" style={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>
                    {n.title}
                  </h3>
                )}
                <div
                  className="text-[#454652] text-[15px] leading-[24px] flex-1 line-clamp-4 whitespace-pre-wrap break-words [&_ul]:list-disc [&_ul]:pl-4"
                  dangerouslySetInnerHTML={{ __html: renderRich(n.body) }}
                />

                {/* Étiquettes + couleur rapide */}
                <div className="mt-4 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <TagBar
                    kind="note" resourceId={n.id} allTags={allTags}
                    tagIds={tagMap[n.id] ?? []}
                    onChange={(ids) => setTagMap(m => ({ ...m, [n.id]: ids }))}
                    onCreated={onTagCreated}
                  />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {NOTE_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => changeColor(n, c)}
                        title={c}
                        className={`w-3.5 h-3.5 rounded-full border ${n.color === c ? "border-[#1a237e]" : "border-[#c6c5d4]"}`}
                        style={{ background: colorOf(c).dot }}
                      />
                    ))}
                  </div>
                </div>
              </article>
            );
          })}

          {/* Tuile « Créer une note » (bento, style maquette) */}
          <button
            onClick={openCreate}
            className="bg-[#f3f4f5] rounded-xl p-6 border-2 border-dashed border-[#c6c5d4] hover:border-[#1a237e] hover:bg-[#edeeef] transition-all flex flex-col items-center justify-center text-[#454652] hover:text-[#1a237e] min-h-[190px]"
          >
            <span className="material-symbols-outlined text-[32px] mb-2">add_circle</span>
            <span className="text-xs font-semibold uppercase tracking-wider">Créer une note</span>
          </button>
        </div>
      )}

      {sharing && (
        <ShareModal
          resourceType="note"
          resourceId={sharing.id}
          title={sharing.title || "(note sans titre)"}
          onClose={() => setSharing(null)}
        />
      )}
    </div>
  );
}

function FmtBtn({ label, title, onClick, className = "" }: {
  label: string; title: string; onClick: () => void; className?: string;
}) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      className={`w-8 h-8 rounded-md border border-arc-border text-sm text-arc-text2 hover:border-arc-navy hover:text-arc-navy transition-colors ${className}`}
    >
      {label}
    </button>
  );
}
