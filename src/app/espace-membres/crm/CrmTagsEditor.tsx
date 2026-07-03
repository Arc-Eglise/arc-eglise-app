"use client";

import { useState, useTransition } from "react";
import { updateCrmTags } from "@/lib/actions/membres";

const PRESET_TAGS = ["Nouveau", "Visiteur", "Leadership", "Diacre", "Suivi pastoral", "Jeunesse", "Famille", "Musicien", "Bénévole", "Donateur"];

const TAG_COLORS = [
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-pink-100 text-pink-700 border-pink-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-yellow-100 text-yellow-700 border-yellow-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

interface Props {
  memberId: string;
  initialTags: string[];
}

export default function CrmTagsEditor({ memberId, initialTags }: Props) {
  const [tags, setTags]       = useState<string[]>(initialTags);
  const [input, setInput]     = useState("");
  const [saved, setSaved]     = useState(false);
  const [, startTransition]   = useTransition();

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setInput("");
    save(next);
  }

  function removeTag(tag: string) {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    save(next);
  }

  function save(next: string[]) {
    setSaved(false);
    startTransition(async () => {
      await updateCrmTags(memberId, next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      {/* Tags actifs */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.length === 0 && <span className="text-xs text-arc-text3">Aucun tag</span>}
        {tags.map((t, i) => (
          <span key={t} className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${TAG_COLORS[i % TAG_COLORS.length]}`}>
            {t}
            <button onClick={() => removeTag(t)} className="text-[10px] hover:opacity-60 ml-0.5">✕</button>
          </span>
        ))}
        {saved && <span className="text-[11px] text-green-600 self-center">✓ Sauvegardé</span>}
      </div>

      {/* Ajouter un tag */}
      <div className="flex gap-2">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(input); } }}
          placeholder="Nouveau tag…" maxLength={30}
          className="flex-1 px-3 py-1.5 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy transition-colors"
        />
        <button
          onClick={() => addTag(input)}
          className="px-3 py-1.5 rounded-lg border border-arc-border text-xs text-arc-text2 hover:border-arc-navy hover:text-arc-navy transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Tags prédéfinis */}
      <div className="flex flex-wrap gap-1">
        {PRESET_TAGS.filter(t => !tags.includes(t)).map(t => (
          <button
            key={t}
            onClick={() => addTag(t)}
            className="text-[10px] px-2 py-0.5 rounded-full bg-arc-bg border border-arc-border text-arc-text2 hover:border-arc-navy hover:text-arc-navy transition-colors"
          >
            + {t}
          </button>
        ))}
      </div>
    </div>
  );
}
