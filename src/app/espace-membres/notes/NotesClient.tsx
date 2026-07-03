"use client";

import { useState, useTransition } from "react";
import { createBiblicalNote, updateBiblicalNote, deleteBiblicalNote } from "@/lib/actions/membres";

type Note = {
  id: string;
  title: string;
  content: string;
  reference: string | null;
  created_at: string;
  updated_at: string;
};

interface Props {
  initialNotes: Note[];
}

export default function NotesClient({ initialNotes }: Props) {
  const [notes, setNotes]         = useState<Note[]>(initialNotes);
  const [selected, setSelected]   = useState<Note | null>(null);
  const [creating, setCreating]   = useState(false);
  const [editing, setEditing]     = useState(false);
  const [search, setSearch]       = useState("");
  const [, startTransition]       = useTransition();

  // Form state
  const [fTitle, setFTitle]       = useState("");
  const [fContent, setFContent]   = useState("");
  const [fRef, setFRef]           = useState("");

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    (n.reference ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setSelected(null);
    setFTitle(""); setFContent(""); setFRef("");
    setCreating(true); setEditing(false);
  }

  function openEdit(note: Note) {
    setFTitle(note.title); setFContent(note.content); setFRef(note.reference ?? "");
    setEditing(true); setCreating(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", fTitle); fd.append("content", fContent); fd.append("reference", fRef);
    const res = await createBiblicalNote(fd);
    if (!("error" in res)) {
      const newNote: Note = {
        id: res.id, title: fTitle, content: fContent,
        reference: fRef || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setNotes(prev => [newNote, ...prev]);
      setSelected(newNote);
      setCreating(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData();
    fd.append("id", selected.id); fd.append("title", fTitle);
    fd.append("content", fContent); fd.append("reference", fRef);
    const res = await updateBiblicalNote(fd);
    if (!("error" in res)) {
      const updated: Note = { ...selected, title: fTitle, content: fContent, reference: fRef || null, updated_at: new Date().toISOString() };
      setNotes(prev => prev.map(n => n.id === selected.id ? updated : n));
      setSelected(updated);
      setEditing(false);
    }
  }

  function handleDelete(note: Note) {
    if (!confirm(`Supprimer "${note.title}" ?`)) return;
    setNotes(prev => prev.filter(n => n.id !== note.id));
    if (selected?.id === note.id) setSelected(null);
    startTransition(() => { deleteBiblicalNote(note.id); });
  }

  const isFormMode = creating || (editing && selected);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 h-[calc(100vh-140px)] min-h-[500px]">

      {/* ── Liste latérale ── */}
      <div className="border-r border-arc-border flex flex-col bg-white rounded-l-2xl overflow-hidden">
        <div className="p-3 border-b border-arc-border space-y-2">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
          />
          <button
            onClick={openCreate}
            className="w-full py-2 rounded-lg bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
          >
            + Nouvelle note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-arc-text3">
              {search ? "Aucun résultat" : "Aucune note. Crée ta première →"}
            </div>
          )}
          {filtered.map(note => (
            <button
              key={note.id}
              onClick={() => { setSelected(note); setCreating(false); setEditing(false); }}
              className={`w-full text-left px-4 py-3 border-b border-arc-border last:border-b-0 transition-colors hover:bg-arc-bg ${selected?.id === note.id ? "bg-arc-blueBg border-l-2 border-l-arc-blue" : ""}`}
            >
              <div className="font-semibold text-arc-navy text-sm truncate">{note.title}</div>
              {note.reference && (
                <div className="text-[10px] text-arc-blue font-mono mt-0.5">{note.reference}</div>
              )}
              <div className="text-[10px] text-arc-text3 mt-0.5 line-clamp-1">{note.content}</div>
              <div className="text-[9px] text-arc-text3 mt-1">
                {new Date(note.updated_at).toLocaleDateString("fr-CH")}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Panneau principal ── */}
      <div className="bg-white rounded-r-2xl border border-arc-border flex flex-col overflow-hidden">

        {/* Formulaire création */}
        {creating && (
          <form onSubmit={handleCreate} className="flex flex-col h-full p-6 gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-arc-navy text-lg">Nouvelle note</h2>
              <button type="button" onClick={() => setCreating(false)} className="text-arc-text3 hover:text-arc-navy text-xl">✕</button>
            </div>
            <NoteFormFields
              title={fTitle} setTitle={setFTitle}
              content={fContent} setContent={setFContent}
              ref_={fRef} setRef={setFRef}
            />
            <div className="flex gap-2 mt-auto">
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors">
                Enregistrer
              </button>
              <button type="button" onClick={() => setCreating(false)} className="px-4 py-2.5 rounded-xl border border-arc-border text-sm text-arc-text2 hover:border-arc-navy transition-colors">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Formulaire édition */}
        {editing && selected && (
          <form onSubmit={handleUpdate} className="flex flex-col h-full p-6 gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-arc-navy text-lg">Modifier la note</h2>
              <button type="button" onClick={() => setEditing(false)} className="text-arc-text3 hover:text-arc-navy text-xl">✕</button>
            </div>
            <NoteFormFields
              title={fTitle} setTitle={setFTitle}
              content={fContent} setContent={setFContent}
              ref_={fRef} setRef={setFRef}
            />
            <div className="flex gap-2 mt-auto">
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors">
                Enregistrer
              </button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl border border-arc-border text-sm text-arc-text2 hover:border-arc-navy transition-colors">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Affichage note */}
        {!isFormMode && selected && (
          <div className="flex flex-col h-full p-6 overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h2 className="font-serif text-2xl font-bold text-arc-navy leading-tight">{selected.title}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 rounded-lg border border-arc-border text-sm text-arc-text2 hover:border-arc-navy hover:text-arc-navy transition-colors">
                  Modifier
                </button>
                <button onClick={() => handleDelete(selected)} className="px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors">
                  Supprimer
                </button>
              </div>
            </div>
            {selected.reference && (
              <div className="text-sm font-mono text-arc-blue mb-4">📖 {selected.reference}</div>
            )}
            <div className="text-xs text-arc-text3 mb-6">
              Créée le {new Date(selected.created_at).toLocaleDateString("fr-CH")}
              {selected.updated_at !== selected.created_at && ` · Modifiée le ${new Date(selected.updated_at).toLocaleDateString("fr-CH")}`}
            </div>
            <div className="em-reading-zone em-reading-text text-arc-navy whitespace-pre-wrap flex-1">
              {selected.content}
            </div>
          </div>
        )}

        {/* Vide */}
        {!isFormMode && !selected && (
          <div className="flex flex-col items-center justify-center h-full text-center p-10 text-arc-text3">
            <div className="text-5xl mb-4">📖</div>
            <div className="font-semibold text-arc-navy mb-1">Notes bibliques</div>
            <div className="text-sm">Sélectionne une note ou crée-en une nouvelle</div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteFormFields({
  title, setTitle, content, setContent, ref_, setRef,
}: {
  title: string; setTitle: (v: string) => void;
  content: string; setContent: (v: string) => void;
  ref_: string; setRef: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Titre *</label>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          required maxLength={200} placeholder="Titre de la note…"
          className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Référence biblique</label>
        <input
          value={ref_} onChange={e => setRef(e.target.value)}
          maxLength={100} placeholder="ex: Jean 3:16, Psaume 23…"
          className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy font-mono transition-colors"
        />
      </div>
      <div className="flex-1 flex flex-col">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Contenu *</label>
        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          required maxLength={5000}
          placeholder="Tes réflexions, méditations, notes de sermon…"
          className="flex-1 w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none min-h-[200px]"
        />
        <div className="text-[10px] text-arc-text3 text-right mt-1">{content.length}/5000</div>
      </div>
    </>
  );
}
