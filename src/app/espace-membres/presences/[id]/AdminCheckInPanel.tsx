"use client";

import { useState, useTransition } from "react";
import { checkInEvent, cancelCheckIn } from "@/lib/actions/membres";

interface Member { id: string; name: string; checked: boolean }

export default function AdminCheckInPanel({ eventId, allMembers }: {
  eventId: string;
  allMembers: Member[];
}) {
  const [open, setOpen]       = useState(false);
  const [members, setMembers] = useState<Member[]>(allMembers);
  const [search, setSearch]   = useState("");
  const [, startTransition]   = useTransition();

  function toggle(memberId: string) {
    const m = members.find(x => x.id === memberId);
    if (!m) return;
    const wasChecked = m.checked;
    setMembers(ms => ms.map(x => x.id === memberId ? { ...x, checked: !wasChecked } : x));
    startTransition(async () => {
      if (wasChecked) {
        // On doit passer l'eventId pour annuler la présence d'un autre membre
        // La fonction cancelCheckIn prend seulement eventId — pour admin on appelle directement supabase
        // On utilise checkInEvent avec targetUserId
        await cancelCheckIn(eventId, memberId);
      } else {
        await checkInEvent(eventId, memberId);
      }
    });
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );
  const checkedCount = members.filter(m => m.checked).length;

  return (
    <div className="bg-white border border-arc-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-arc-bg transition-colors text-left"
      >
        <span className="font-bold text-arc-navy text-sm">⚙️ Gestion des présences (Admin)</span>
        <span className="text-[11px] text-arc-text3 ml-auto">
          {checkedCount} / {members.length} présents
        </span>
        <span className="text-arc-text3 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-arc-border p-4">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un membre…"
            className="w-full mb-3 px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
          />
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {filtered.map(m => (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all ${
                  m.checked
                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    : "bg-white border-arc-border text-arc-text2 hover:border-arc-navy"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                  m.checked ? "bg-green-500 border-green-500 text-white" : "border-arc-border"
                }`}>
                  {m.checked ? "✓" : ""}
                </div>
                <span className="font-medium flex-1 text-left">{m.name}</span>
                <span className={`text-[10px] font-bold ${m.checked ? "text-green-600" : "text-arc-text3"}`}>
                  {m.checked ? "Présent" : "Absent"}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-arc-text3 text-center py-4">Aucun résultat.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
