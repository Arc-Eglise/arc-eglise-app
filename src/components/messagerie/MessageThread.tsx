"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { reactToMessage, togglePinMessage } from "@/lib/actions/messagerie";

/* ── Types ─────────────────────────────────────────────────────── */
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  reactions: Reaction[];
}

interface Participant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface Props {
  conversationId: string;
  initialMessages: Message[];
  currentUserId: string;
  otherParticipant: Participant;
  otherLastReadAt: string | null;
  myLastReadAt: string | null;
  sendMessageAction: (content: string) => Promise<void>;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🙏", "🔥", "😮"];

/* ── Helpers ───────────────────────────────────────────────────── */
function groupReactions(reactions: Reaction[]): { emoji: string; count: number; users: string[] }[] {
  const map: Record<string, string[]> = {};
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = [];
    map[r.emoji].push(r.user_id);
  }
  return Object.entries(map).map(([emoji, users]) => ({ emoji, count: users.length, users }));
}

/* ── Component ─────────────────────────────────────────────────── */
export default function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
  otherParticipant,
  otherLastReadAt,
  sendMessageAction,
}: Props) {
  const [messages, setMessages]         = useState<Message[]>(initialMessages);
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);
  const [hoverMsg, setHoverMsg]         = useState<string | null>(null);
  const [emojiFor, setEmojiFor]         = useState<string | null>(null);
  const [otherReadAt, setOtherReadAt]   = useState<string | null>(otherLastReadAt);
  const [showPinned, setShowPinned]     = useState(false);
  const [, startTransition]             = useTransition();
  const bottomRef                       = useRef<HTMLDivElement>(null);
  const textareaRef                     = useRef<HTMLTextAreaElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /* ── Realtime ────────────────────────────────────────────────── */
  useEffect(() => {
    // Nouveaux messages
    const msgCh = supabase
      .channel(`conv:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, ({ new: n }) => {
        const msg = n as Message;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, is_pinned: false, reactions: [] }]);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, ({ new: n }) => {
        setMessages(prev => prev.map(m => m.id === n.id ? { ...m, is_pinned: (n as Message).is_pinned } : m));
      })
      .subscribe();

    // Réactions
    const reaCh = supabase
      .channel(`reactions:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" },
        ({ new: n }) => {
          const r = n as Reaction;
          setMessages(prev => prev.map(m =>
            m.id === r.message_id
              ? { ...m, reactions: [...m.reactions.filter(x => x.id !== r.id), r] }
              : m
          ));
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" },
        ({ old: o }) => {
          setMessages(prev => prev.map(m => ({
            ...m,
            reactions: m.reactions.filter(r => r.id !== (o as Reaction).id),
          })));
        })
      .subscribe();

    // L'autre participant a lu (last_read_at mis à jour)
    const readCh = supabase
      .channel(`read:${conversationId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "conversation_participants",
        filter: `conversation_id=eq.${conversationId}`,
      }, ({ new: n }) => {
        if ((n as { user_id: string }).user_id !== currentUserId) {
          setOtherReadAt((n as { last_read_at: string }).last_read_at);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgCh);
      supabase.removeChannel(reaCh);
      supabase.removeChannel(readCh);
    };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Actions ─────────────────────────────────────────────────── */
  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    await sendMessageAction(content);
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  function handleReact(messageId: string, emoji: string) {
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const exists = m.reactions.find(r => r.user_id === currentUserId && r.emoji === emoji);
      if (exists) return { ...m, reactions: m.reactions.filter(r => r.id !== exists.id) };
      const fake: Reaction = { id: `tmp-${Date.now()}`, message_id: messageId, user_id: currentUserId, emoji };
      return { ...m, reactions: [...m.reactions, fake] };
    }));
    setEmojiFor(null);
    startTransition(() => { reactToMessage(messageId, emoji); });
  }

  function handlePin(msg: Message) {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: !m.is_pinned } : m));
    setHoverMsg(null);
    startTransition(() => { togglePinMessage(msg.id, msg.is_pinned); });
  }

  /* ── Computed ────────────────────────────────────────────────── */
  const otherName     = [otherParticipant.first_name, otherParticipant.last_name].filter(Boolean).join(" ") || "Membre";
  const otherInitiale = (otherParticipant.first_name?.[0] ?? "?").toUpperCase();
  const pinnedMsgs    = messages.filter(m => m.is_pinned);

  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" });
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === date) last.msgs.push(msg);
    else groupedMessages.push({ date, msgs: [msg] });
  }

  function getReadStatus(msg: Message): "read" | "sent" {
    if (msg.sender_id !== currentUserId) return "sent";
    if (!otherReadAt) return "sent";
    return new Date(otherReadAt) >= new Date(msg.created_at) ? "read" : "sent";
  }

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-arc-border flex items-center gap-3 flex-shrink-0">
        <Link href="/espace-membres/messagerie" className="md:hidden text-arc-text3 hover:text-arc-navy mr-1">←</Link>
        <div className="w-9 h-9 rounded-full bg-arc-navy flex items-center justify-center overflow-hidden flex-shrink-0">
          {otherParticipant.avatar_url
            ? <Image src={otherParticipant.avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
            : <span className="text-xs font-bold text-white">{otherInitiale}</span>}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-arc-navy text-sm">{otherName}</div>
        </div>
        {pinnedMsgs.length > 0 && (
          <button
            onClick={() => setShowPinned(v => !v)}
            className="text-xs text-arc-blue hover:underline flex items-center gap-1"
          >
            📌 {pinnedMsgs.length} épinglé{pinnedMsgs.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Pinned messages panel */}
      {showPinned && pinnedMsgs.length > 0 && (
        <div className="border-b border-arc-border bg-arc-blueBg px-4 py-2 flex flex-col gap-1 max-h-36 overflow-y-auto">
          {pinnedMsgs.map(m => (
            <div key={m.id} className="flex items-start gap-2 text-xs text-arc-navy">
              <span className="flex-shrink-0 mt-0.5">📌</span>
              <span className="truncate flex-1">{m.content}</span>
              <button onClick={() => handlePin(m)} className="text-arc-text3 hover:text-red-500 flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 bg-arc-bg"
        onClick={() => { setHoverMsg(null); setEmojiFor(null); }}
      >
        {messages.length === 0 && (
          <div className="text-center text-sm text-arc-text3 py-12">
            Envoie le premier message à {otherName} 👋
          </div>
        )}

        {groupedMessages.map(({ date, msgs }) => (
          <div key={date}>
            <div className="text-center my-4">
              <span className="text-[10px] font-bold text-arc-text3 bg-white px-3 py-1 rounded-full border border-arc-border">
                {date}
              </span>
            </div>

            {msgs.map((msg) => {
              const isMe      = msg.sender_id === currentUserId;
              const status    = getReadStatus(msg);
              const grouped   = groupReactions(msg.reactions);
              const isHovered = hoverMsg === msg.id;
              const showEmoji = emojiFor === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}
                  onMouseEnter={() => setHoverMsg(msg.id)}
                  onMouseLeave={() => { if (!showEmoji) setHoverMsg(null); }}
                >
                  <div className="relative max-w-[75%]">
                    {/* Action bar on hover */}
                    {isHovered && (
                      <div
                        className={`absolute ${isMe ? "right-full mr-2" : "left-full ml-2"} top-0 flex items-center gap-1 z-10`}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Emoji trigger */}
                        <button
                          onClick={() => setEmojiFor(v => v === msg.id ? null : msg.id)}
                          className="w-7 h-7 rounded-full bg-white border border-arc-border text-sm flex items-center justify-center hover:bg-arc-blueBg shadow-sm"
                          title="Réagir"
                        >😊</button>
                        {/* Pin */}
                        <button
                          onClick={() => handlePin(msg)}
                          className={`w-7 h-7 rounded-full bg-white border border-arc-border text-sm flex items-center justify-center hover:bg-arc-blueBg shadow-sm ${msg.is_pinned ? "text-arc-blue" : "text-arc-text3"}`}
                          title={msg.is_pinned ? "Désépingler" : "Épingler"}
                        >📌</button>
                      </div>
                    )}

                    {/* Emoji picker */}
                    {showEmoji && (
                      <div
                        className={`absolute ${isMe ? "right-0" : "left-0"} bottom-full mb-1 bg-white border border-arc-border rounded-xl shadow-lg px-2 py-1.5 flex gap-1 z-20`}
                        onClick={e => e.stopPropagation()}
                      >
                        {QUICK_EMOJIS.map(e => (
                          <button
                            key={e}
                            onClick={() => handleReact(msg.id, e)}
                            className="text-lg hover:scale-125 transition-transform"
                          >{e}</button>
                        ))}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                        isMe
                          ? "bg-arc-navy text-white rounded-br-sm"
                          : "bg-white border border-arc-border text-arc-navy rounded-bl-sm shadow-sm"
                      } ${msg.is_pinned ? "ring-1 ring-arc-blue ring-offset-1" : ""}`}
                    >
                      {msg.content}
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-white/50" : "text-arc-text3"}`}>
                        <span className="text-[10px]">
                          {new Date(msg.created_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {/* D/R indicator */}
                        {isMe && (
                          <span className={`text-[11px] leading-none ${status === "read" ? (isMe ? "text-white/80" : "text-arc-blue") : "text-white/40"}`}>
                            {status === "read" ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reactions */}
                    {grouped.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        {grouped.map(({ emoji, count, users }) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${
                              users.includes(currentUserId)
                                ? "bg-arc-blueBg border-arc-blue text-arc-blue"
                                : "bg-white border-arc-border text-arc-text2 hover:border-arc-blue"
                            }`}
                            title={`${count} réaction${count > 1 ? "s" : ""}`}
                          >
                            {emoji} {count > 1 && <span>{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-arc-border bg-white flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écris un message… (Entrée pour envoyer)"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors disabled:opacity-40 flex-shrink-0"
          >➤</button>
        </div>
      </div>
    </div>
  );
}
