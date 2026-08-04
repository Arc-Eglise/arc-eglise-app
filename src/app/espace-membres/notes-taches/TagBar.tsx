"use client";

import { useState } from "react";
import { attachTag, detachTag, createTag } from "@/lib/actions/tags";
import type { TagRow } from "@/lib/notes-taches/types";

export const TAG_STYLE: Record<string, { bg: string; fg: string }> = {
  gray:   { bg: "#eef1f8", fg: "#5c6280" },
  blue:   { bg: "#dde9ff", fg: "#1e6bff" },
  green:  { bg: "#dcfce7", fg: "#15803d" },
  pink:   { bg: "#ffe0ec", fg: "#be2f63" },
  purple: { bg: "#ece4ff", fg: "#7b3fe4" },
  orange: { bg: "#ffe9db", fg: "#c2410c" },
};
const tagStyle = (c: string) => TAG_STYLE[c] ?? TAG_STYLE.gray;

interface Props {
  kind: "note" | "task";
  resourceId: string;
  allTags: TagRow[];
  tagIds: string[];
  onChange: (ids: string[]) => void;
  onCreated: (tag: TagRow) => void;
}

export default function TagBar({ kind, resourceId, allTags, tagIds, onChange, onCreated }: Props) {
  const [open, setOpen]     = useState(false);
  const [newLabel, setNew]  = useState("");
  const current = allTags.filter(t => tagIds.includes(t.id));

  async function toggle(tag: TagRow) {
    const has = tagIds.includes(tag.id);
    onChange(has ? tagIds.filter(id => id !== tag.id) : [...tagIds, tag.id]);
    if (has) await detachTag(kind, resourceId, tag.id);
    else     await attachTag(kind, resourceId, tag.id);
  }
  async function addNew() {
    const label = newLabel.trim();
    if (!label) return;
    const res = await createTag(label);
    if ("data" in res && res.data) {
      onCreated(res.data);
      onChange([...tagIds, res.data.id]);
      await attachTag(kind, resourceId, res.data.id);
      setNew("");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", position: "relative" }}>
      {current.map(t => {
        const s = tagStyle(t.color);
        return (
          <span key={t.id} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: s.bg, color: s.fg }}>
            #{t.label}
          </span>
        );
      })}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title="Étiquettes"
        style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#fff", color: "#8b91b0", border: "1px dashed #cbd2de", cursor: "pointer" }}
      >
        ＋ tag
      </button>

      {open && (
        <>
          <span onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 41, background: "#fff", border: "1px solid #e6e9f4", borderRadius: 12, boxShadow: "0 8px 24px rgba(30,36,100,.16)", padding: 8, width: 200, maxHeight: 240, overflowY: "auto" }}>
            {allTags.length === 0 && <div style={{ fontSize: 11, color: "#8b91b0", padding: "2px 4px 6px" }}>Aucune étiquette. Crée-en une :</div>}
            {allTags.map(t => {
              const s = tagStyle(t.color); const has = tagIds.includes(t.id);
              return (
                <button key={t.id} onClick={() => toggle(t)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "5px 6px", borderRadius: 7, border: "none", background: has ? "#f1f3fb" : "transparent", cursor: "pointer", marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: s.bg, color: s.fg }}>#{t.label}</span>
                  <span style={{ fontSize: 11, color: has ? "#15803d" : "#cbd2de" }}>{has ? "✓" : "+"}</span>
                </button>
              );
            })}
            <div style={{ display: "flex", gap: 4, marginTop: 6, borderTop: "1px solid #eef1f8", paddingTop: 6 }}>
              <input value={newLabel} onChange={e => setNew(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addNew(); }}
                placeholder="Nouvelle…" maxLength={40}
                style={{ flex: 1, minWidth: 0, fontSize: 12, padding: "4px 7px", borderRadius: 7, border: "1px solid #e6e9f4", outline: "none" }} />
              <button onClick={addNew} style={{ fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 7, border: "none", background: "#151a4a", color: "#fff", cursor: "pointer" }}>+</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
