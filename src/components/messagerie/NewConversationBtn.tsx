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
}

export default function NewConversationBtn({ members, getOrCreateAction }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = members.filter((m) => {
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ").toLowerCase();
    return name.includes(search.toLowerCase()) || !search;
  });

  const handleSelect = (memberId: string) => {
    startTransition(async () => {
      const result = await getOrCreateAction(memberId);
      if (result.conversationId) {
        setOpen(false);
        setSearch("");
        router.push(`/espace-membres/messagerie/${result.conversationId}`);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-lg bg-arc-navy text-white flex items-center justify-center hover:bg-arc-navy2 transition-colors text-sm font-bold"
        title="Nouveau message"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => { setOpen(false); setSearch(""); }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-arc-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-arc-border flex items-center gap-3">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="flex-1 text-sm outline-none text-arc-navy placeholder-arc-text3"
              />
              <button onClick={() => { setOpen(false); setSearch(""); }} className="text-arc-text3 hover:text-arc-navy text-lg">
                ✕
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filtered.map((m) => {
                const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
                const initiale = (m.first_name?.[0] ?? "?").toUpperCase();
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-bg transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-arc-navy flex items-center justify-center overflow-hidden flex-shrink-0">
                      {m.avatar_url
                        ? <Image src={m.avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold text-white">{initiale}</span>
                      }
                    </div>
                    <span className="text-sm font-medium text-arc-navy">{name}</span>
                    {isPending && <span className="ml-auto text-xs text-arc-text3">...</span>}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-arc-text3">Aucun membre trouvé</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
