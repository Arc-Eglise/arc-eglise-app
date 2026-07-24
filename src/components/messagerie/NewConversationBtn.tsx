"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface Props {
  members: Member[];
  getOrCreateAction: (otherUserId: string) => Promise<{ conversationId?: string; error?: string }>;
  createGroupAction: (name: string, memberIds: string[]) => Promise<{ conversationId?: string; error?: string }>;
}

export default function NewConversationBtn({ members, getOrCreateAction, createGroupAction }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"dm" | "group">("dm");
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = members.filter((m) => {
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ").toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  function close() {
    setOpen(false); setSearch(""); setGroupName(""); setSelected(new Set()); setMode("dm");
  }

  const handleSelect = (memberId: string) => {
    startTransition(async () => {
      const result = await getOrCreateAction(memberId);
      if (result.conversationId) { close(); router.push(`/espace-membres/messagerie/${result.conversationId}`); }
    });
  };

  const toggleMember = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selected.size < 2) return;
    startTransition(async () => {
      const result = await createGroupAction(groupName.trim(), Array.from(selected));
      if (result.conversationId) { close(); router.push(`/espace-membres/messagerie/${result.conversationId}`); }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-lg bg-arc-navy text-white flex items-center justify-center hover:bg-arc-navy2 transition-colors text-sm font-bold"
        title="Nouveau message"
      >+</button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-arc-dark" onClick={(e) => e.stopPropagation()}>

            {/* Onglets DM / Groupe */}
            <div className="flex border-b border-arc-border">
              {(["dm", "group"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === m ? "text-arc-navy border-b-2 border-arc-navy" : "text-arc-text3 hover:text-arc-navy"}`}>
                  {m === "dm" ? "💬 Message" : "👥 Groupe"}
                </button>
              ))}
              <button onClick={close} className="px-3 text-arc-text3 hover:text-arc-navy text-lg">✕</button>
            </div>

            {mode === "group" && (
              <div className="px-4 pt-3">
                <input
                  value={groupName} onChange={e => setGroupName(e.target.value)} maxLength={60}
                  placeholder="Nom du groupe (ex : Équipe louange)"
                  className="w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
                />
              </div>
            )}

            <div className="px-4 py-2 border-b border-arc-border">
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un membre…"
                className="w-full text-sm outline-none text-arc-navy placeholder-arc-text3"
              />
            </div>

            <div className="max-h-60 overflow-y-auto">
              {filtered.map((m) => {
                const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
                const initiale = (m.first_name?.[0] ?? "?").toUpperCase();
                const isSel = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => mode === "dm" ? handleSelect(m.id) : toggleMember(m.id)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-arc-bg transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-arc-navy flex items-center justify-center overflow-hidden flex-shrink-0">
                      {m.avatar_url
                        ? <Image src={m.avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold text-white">{initiale}</span>}
                    </div>
                    <span className="text-sm font-medium text-arc-navy flex-1">{name}</span>
                    {mode === "group" && (
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${isSel ? "bg-arc-navy border-arc-navy text-white" : "border-arc-border"}`}>
                        {isSel ? "✓" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-arc-text3">Aucun membre trouvé</div>
              )}
            </div>

            {mode === "group" && (
              <div className="px-4 py-3 border-t border-arc-border flex items-center justify-between gap-2">
                <span className="text-xs text-arc-text3">{selected.size} sélectionné{selected.size !== 1 ? "s" : ""}</span>
                <button
                  onClick={handleCreateGroup}
                  disabled={isPending || !groupName.trim() || selected.size < 2}
                  className="px-4 py-2 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors disabled:opacity-40"
                >
                  {isPending ? "…" : "Créer le groupe"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
