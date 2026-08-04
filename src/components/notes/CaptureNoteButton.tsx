"use client";

import { useState } from "react";
import { createNote, type NoteColor } from "@/lib/actions/notes";
import { createTask } from "@/lib/actions/tasks";

export type CaptureInput = {
  sourceKind: "priere_bible" | "agenda" | "streaming" | "mail" | "messagerie";
  sourceRefId?: string | null;
  /** Titre de la note créée */
  title: string;
  /** Corps de la note créée */
  body: string;
  reference?: string | null;
  color?: NoteColor;
  /** Contexte dénormalisé (survit à la suppression de la source) */
  snapshot: Record<string, unknown>;
  /** Titre de la tâche si l'utilisateur choisit « ajouter à mes tâches » (défaut = title) */
  taskTitle?: string;
};

interface Props {
  input: () => CaptureInput;      // évalué au clic (données fraîches)
  label?: string;                 // libellé du bouton
  compact?: boolean;              // rendu icône seule
  className?: string;
}

/**
 * ADR-002 Phase 2 — bouton de capture contextuelle.
 * Ouvre un mini-menu « Ajouter à mes notes / mes tâches » et persiste via les
 * server actions notes/tasks avec source_kind + snapshot.
 */
export default function CaptureNoteButton({ input, label = "Prendre une note", compact, className }: Props) {
  const [open, setOpen]   = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);

  async function toNote() {
    setBusy(true);
    const i = input();
    const res = await createNote({
      title: i.title, body: i.body, reference: i.reference ?? null,
      color: i.color ?? "yellow",
      source_kind: i.sourceKind, source_ref_id: i.sourceRefId ?? null,
      source_snapshot: i.snapshot,
    });
    setBusy(false); setOpen(false);
    setFlash("error" in res ? "Échec" : "Ajouté à mes notes 🗒️");
    setTimeout(() => setFlash(null), 2200);
  }
  async function toTask() {
    setBusy(true);
    const i = input();
    const res = await createTask({
      title: (i.taskTitle ?? i.title).slice(0, 200),
      description: i.body.slice(0, 500),
      source_kind: i.sourceKind, source_ref_id: i.sourceRefId ?? null,
      source_snapshot: i.snapshot,
    });
    setBusy(false); setOpen(false);
    setFlash("error" in res ? "Échec" : "Ajouté à mes tâches ✅");
    setTimeout(() => setFlash(null), 2200);
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }} className={className}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title="Prendre une note / créer une tâche"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
          border: "1px solid #e6e9f4", background: "#fff", color: "#5c6280",
          borderRadius: 10, padding: compact ? "5px 8px" : "6px 11px",
          fontSize: 12, fontWeight: 600, lineHeight: 1,
        }}
      >
        <span>📝</span>{!compact && <span>{label}</span>}
      </button>

      {flash && (
        <span style={{
          position: "absolute", top: "-30px", left: 0, whiteSpace: "nowrap",
          background: "#151a4a", color: "#fff", fontSize: 11, fontWeight: 600,
          padding: "4px 9px", borderRadius: 8, zIndex: 60,
        }}>{flash}</span>
      )}

      {open && (
        <>
          <span
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 55 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 56,
              background: "#fff", borderRadius: 12, border: "1px solid #e6e9f4",
              boxShadow: "0 8px 28px rgba(30,36,100,.18)", padding: 6,
              display: "flex", flexDirection: "column", gap: 2, minWidth: 200,
            }}
          >
            <button disabled={busy} onClick={toNote} style={menuItem}>🗒️ Ajouter à mes notes</button>
            <button disabled={busy} onClick={toTask} style={menuItem}>✅ Ajouter à mes tâches</button>
          </div>
        </>
      )}
    </span>
  );
}

const menuItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  textAlign: "left", padding: "9px 11px", borderRadius: 8,
  border: "none", background: "transparent", cursor: "pointer",
  fontSize: 13, fontWeight: 500, color: "#1e2464",
};
