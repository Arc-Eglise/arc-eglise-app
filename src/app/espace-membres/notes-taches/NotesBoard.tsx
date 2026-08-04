"use client";

import { useRef, useState } from "react";
import {
  createNote, updateNote, deleteNote, NOTE_COLORS, type NoteRow, type NoteColor,
} from "@/lib/actions/notes";
import ShareModal from "./ShareModal";

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

export default function NotesBoard({ initialNotes }: { initialNotes: NoteRow[] }) {
  const [notes, setNotes]   = useState<NoteRow[]>(initialNotes);
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
    const res = await createNote(draft);
    if ("data" in res && res.data) setNotes(prev => [res.data!, ...prev]);
    closeForm();
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

      {/* Formulaire (création / édition) */}
      {isForm && (
        <div className="mb-5 rounded-2xl border border-arc-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-arc-navy">{creating ? "Nouvelle note" : "Modifier la note"}</h3>
            <button onClick={closeForm} className="text-arc-text3 hover:text-arc-navy text-lg">✕</button>
          </div>
          <input
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="Titre (facultatif)"
            maxLength={200}
            className="w-full px-3 py-2 mb-2 rounded-lg border border-arc-border text-sm font-semibold outline-none focus:border-arc-navy"
          />
          <input
            value={draft.reference}
            onChange={e => setDraft(d => ({ ...d, reference: e.target.value }))}
            placeholder="Référence biblique (ex. Jean 3:16) — facultatif"
            maxLength={100}
            className="w-full px-3 py-2 mb-2 rounded-lg border border-arc-border text-xs font-mono outline-none focus:border-arc-navy"
          />
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
            rows={5}
            className="w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy resize-y"
          />
          {/* Couleurs */}
          <div className="flex items-center gap-2 mt-3">
            {NOTE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setDraft(d => ({ ...d, color: c }))}
                title={c}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${draft.color === c ? "scale-110 border-arc-navy" : "border-white"}`}
                style={{ background: colorOf(c).dot }}
              />
            ))}
            <div className="ml-auto flex gap-2">
              <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-arc-border text-sm text-arc-text2 hover:border-arc-navy">Annuler</button>
              <button onClick={creating ? saveCreate : saveEdit} className="px-5 py-2 rounded-lg bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Grille de notes */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-arc-text3">
          <div className="text-5xl mb-3">🗒️</div>
          <div className="font-semibold text-arc-navy mb-1">Aucune note</div>
          <div className="text-sm">{search ? "Aucun résultat pour cette recherche." : "Crée ton premier pense-bête ci-dessus."}</div>
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {filtered.map(n => {
            const col = colorOf(n.color);
            return (
              <div
                key={n.id}
                className="group relative rounded-2xl p-4 flex flex-col min-h-[140px] shadow-sm transition-shadow hover:shadow-md"
                style={{ background: col.bg, border: `1px solid ${col.border}` }}
              >
                {/* Actions flottantes */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => togglePin(n)} title={n.is_pinned ? "Désépingler" : "Épingler"} className="text-sm">{n.is_pinned ? "📌" : "📍"}</button>
                  <button onClick={() => setSharing(n)} title="Partager" className="text-sm">📤</button>
                  <button onClick={() => openEdit(n)} title="Modifier" className="text-sm">✏️</button>
                  <button onClick={() => remove(n)} title="Supprimer" className="text-sm">🗑️</button>
                </div>
                {n.is_pinned && <div className="absolute top-2 left-3 text-xs">📌</div>}

                {n.title && <div className="font-bold text-arc-navy text-sm mb-1 pr-14 mt-1">{n.title}</div>}
                {n.reference && <div className="text-[10px] font-mono text-arc-navy/70 mb-1">📖 {n.reference}</div>}
                <div
                  className="text-[13px] text-arc-navy/90 leading-snug flex-1 whitespace-pre-wrap break-words [&_ul]:list-disc [&_ul]:pl-4"
                  dangerouslySetInnerHTML={{ __html: renderRich(n.body) }}
                />
                {/* Sélecteur couleur rapide */}
                <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {NOTE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => changeColor(n, c)}
                      title={c}
                      className="w-3.5 h-3.5 rounded-full border border-white/70"
                      style={{ background: colorOf(c).dot }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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
