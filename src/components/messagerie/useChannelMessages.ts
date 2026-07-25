"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { getOrCreateChannel, sendMessage } from "@/lib/actions/messagerie";

export interface PanelMessage {
  id: string;
  senderId: string;
  from: string;
  text: string;
  mine: boolean;
  time: string;
  createdAt: string;
}

interface RawMsg {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Messagerie réelle d'un canal : résout/crée la conversation du canal, charge les
 * messages, s'abonne au temps réel (Supabase Realtime) et expose `send`.
 * Format aligné sur le panneau existant (from/text/mine/time).
 */
export function useChannelMessages(opts: {
  channelKey: string;
  channelName: string;
  currentUserId: string;
  enabled?: boolean;
}) {
  const { channelKey, channelName, currentUserId, enabled = true } = opts;
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    setLoading(true);
    setMessages([]);

    (async () => {
      const res = await getOrCreateChannel(channelKey, channelName);
      if (cancelled || !("conversationId" in res) || !res.conversationId) { setLoading(false); return; }
      const cid = res.conversationId;
      convIdRef.current = cid;
      setConvId(cid);

      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at, deleted_at")
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
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey, currentUserId, enabled]);

  async function send(text: string) {
    const cid = convIdRef.current;
    const body = text.trim();
    if (!cid || !body) return;
    // Optimiste
    const tempId = `tmp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, senderId: currentUserId, from: "Moi", text: body, mine: true,
      time: fmtTime(new Date().toISOString()), createdAt: new Date().toISOString(),
    }]);
    const res = await sendMessage(cid, body);
    if ("error" in res && res.error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  return { messages, send, loading, convId };
}
