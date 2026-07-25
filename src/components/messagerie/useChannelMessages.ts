"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  getOrCreateChannel,
  sendMessage,
  reactToMessage,
  togglePinMessage,
  deleteMessage,
  markAsRead,
} from "@/lib/actions/messagerie";

export interface PanelMessage {
  id: string;
  senderId: string;
  from: string;
  text: string;
  mine: boolean;
  time: string;
  createdAt: string;
  pinned: boolean;
  deleted: boolean;
}

interface RawMsg {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  is_pinned: boolean | null;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Messagerie réelle d'un canal : résout/crée la conversation du canal, charge les
 * messages + réactions + épingles, s'abonne au temps réel (Supabase Realtime) et
 * expose send / react / togglePin / remove. Format aligné sur le panneau existant.
 */
export function useChannelMessages(opts: {
  channelKey: string;
  channelName: string;
  currentUserId: string;
  enabled?: boolean;
  /** DM / groupe existant : ouvre directement cette conversation (sinon canal par clé). */
  conversationId?: string | null;
}) {
  const { channelKey, channelName, currentUserId, enabled = true, conversationId = null } = opts;
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Réactions agrégées : { [msgId]: { [emoji]: count } } et les miennes.
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});
  const convIdRef = useRef<string | null>(null);
  const namesRef = useRef<Record<string, string>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const nameOf = (id: string) => namesRef.current[id] ?? "Membre";

  const map = (r: RawMsg): PanelMessage => ({
    id: r.id,
    senderId: r.sender_id,
    from: r.sender_id === currentUserId ? "Moi" : nameOf(r.sender_id),
    text: r.deleted_at ? "Message supprimé" : r.content,
    mine: r.sender_id === currentUserId,
    time: fmtTime(r.created_at),
    createdAt: r.created_at,
    pinned: !!r.is_pinned && !r.deleted_at,
    deleted: !!r.deleted_at,
  });

  // Charge et agrège les réactions d'un lot de messages.
  async function loadReactions(msgIds: string[]) {
    if (!msgIds.length) { setReactions({}); setMyReactions({}); return; }
    const { data } = await supabase
      .from("message_reactions")
      .select("message_id, user_id, emoji")
      .in("message_id", msgIds);
    const agg: Record<string, Record<string, number>> = {};
    const mine: Record<string, string[]> = {};
    for (const row of (data ?? []) as { message_id: string; user_id: string; emoji: string }[]) {
      (agg[row.message_id] ??= {})[row.emoji] = (agg[row.message_id]?.[row.emoji] ?? 0) + 1;
      if (row.user_id === currentUserId) (mine[row.message_id] ??= []).push(row.emoji);
    }
    setReactions(agg);
    setMyReactions(mine);
  }

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    setLoading(true);
    setMessages([]);
    setReactions({});
    setMyReactions({});

    (async () => {
      // DM/groupe existant : id direct ; sinon canal résolu/créé par clé.
      let cid: string;
      if (conversationId) {
        cid = conversationId;
      } else {
        const res = await getOrCreateChannel(channelKey, channelName);
        if (cancelled || !("conversationId" in res) || !res.conversationId) { setLoading(false); return; }
        cid = res.conversationId;
      }
      convIdRef.current = cid;
      setConvId(cid);

      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, deleted_at, is_pinned")
        .eq("conversation_id", cid)
        .order("created_at")
        .limit(300);
      if (cancelled) return;
      const raw = (data ?? []) as RawMsg[];

      // Résolution des noms des expéditeurs
      const ids = Array.from(new Set(raw.map(m => m.sender_id).filter(id => id !== currentUserId)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
        for (const p of profs ?? []) {
          namesRef.current[p.id as string] = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Membre";
        }
      }
      if (cancelled) return;
      setMessages(raw.map(map));
      setLoading(false);
      loadReactions(raw.map(m => m.id));
      markAsRead(cid);   // marque la conversation comme lue à l'ouverture

      // Temps réel — topic unique par montage pour éviter la réutilisation d'un
      // canal déjà souscrit (bug "on after subscribe"). Dédup par id.
      channel = supabase
        .channel(`chan:${cid}:${Math.random().toString(36).slice(2, 8)}`)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${cid}` },
          ({ new: n }) => {
            const m = map(n as RawMsg);
            setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          })
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${cid}` },
          ({ new: n }) => {
            const m = map(n as RawMsg);
            setMessages(prev => prev.map(x => x.id === m.id ? m : x));
          })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey, conversationId, currentUserId, enabled]);

  async function send(text: string) {
    const cid = convIdRef.current;
    const body = text.trim();
    if (!cid || !body) return;
    // Optimiste
    const tempId = `tmp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, senderId: currentUserId, from: "Moi", text: body, mine: true,
      time: fmtTime(new Date().toISOString()), createdAt: new Date().toISOString(),
      pinned: false, deleted: false,
    }]);
    const res = await sendMessage(cid, body);
    if ("error" in res && res.error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  // Réaction (toggle) — optimiste puis persistance.
  async function react(msgId: string, emoji: string) {
    if (msgId.startsWith("tmp-")) return;
    const had = (myReactions[msgId] ?? []).includes(emoji);
    setMyReactions(prev => {
      const cur = prev[msgId] ?? [];
      return { ...prev, [msgId]: had ? cur.filter(e => e !== emoji) : [...cur, emoji] };
    });
    setReactions(prev => {
      const cur = { ...(prev[msgId] ?? {}) };
      const next = (cur[emoji] ?? 0) + (had ? -1 : 1);
      if (next <= 0) delete cur[emoji]; else cur[emoji] = next;
      return { ...prev, [msgId]: cur };
    });
    await reactToMessage(msgId, emoji);
  }

  // Épingler / désépingler — optimiste puis persistance (realtime confirmera).
  async function togglePin(msgId: string) {
    if (msgId.startsWith("tmp-")) return;
    const cur = messages.find(m => m.id === msgId);
    const wasPinned = !!cur?.pinned;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pinned: !wasPinned } : m));
    await togglePinMessage(msgId, wasPinned);
  }

  // Suppression douce (expéditeur uniquement) — optimiste puis persistance.
  async function remove(msgId: string) {
    if (msgId.startsWith("tmp-")) return;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: "Message supprimé", deleted: true, pinned: false } : m));
    await deleteMessage(msgId);
  }

  return { messages, send, react, togglePin, remove, reactions, myReactions, loading, convId };
}
