"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { reactToMessage, togglePinMessage, editMessage, deleteMessage } from "@/lib/actions/messagerie";

/* ── Types ─────────────────────────────────────────────────────── */
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  reply_to_id: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
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
  sendMessageAction: (content: string, replyToId?: string | null, attachment?: { url: string; type: string; name: string } | null) => Promise<void>;
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
  const [replyTo, setReplyTo]           = useState<Message | null>(null);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editText, setEditText]         = useState("");
  const [attaching, setAttaching]       = useState(false);
  const [pendingAtt, setPendingAtt]     = useState<{ url: string; type: string; name: string } | null>(null);
  const [showSearch, setShowSearch]     = useState(false);
  const [msgSearch, setMsgSearch]       = useState("");
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [otherReadAt, setOtherReadAt]   = useState<string | null>(otherLastReadAt);
  const [showPinned, setShowPinned]     = useState(false);
  const [otherOnline, setOtherOnline]   = useState(false);
  const [otherTyping, setOtherTyping]   = useState(false);
  const [, startTransition]             = useTransition();
  const bottomRef                       = useRef<HTMLDivElement>(null);
  const textareaRef                     = useRef<HTMLTextAreaElement>(null);
  const roomRef                         = useRef<RealtimeChannel | null>(null);
  const typingSentRef                   = useRef<number>(0);

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
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, {
          ...msg,
          is_pinned: msg.is_pinned ?? false,
          edited_at: msg.edited_at ?? null,
          deleted_at: msg.deleted_at ?? null,
          reply_to_id: msg.reply_to_id ?? null,
          reactions: [],
        }]);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, ({ new: n }) => {
        const u = n as Message;
        setMessages(prev => prev.map(m => m.id === u.id
          ? { ...m, content: u.content, is_pinned: u.is_pinned, edited_at: u.edited_at, deleted_at: u.deleted_at }
          : m));
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

  /* ── Présence en ligne + frappe (Realtime presence/broadcast) ──── */
  useEffect(() => {
    let typingTimer: ReturnType<typeof setTimeout>;
    const room = supabase.channel(`room:${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });
    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState();
        setOtherOnline(Object.keys(state).some(k => k !== currentUserId));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if ((payload as { userId?: string })?.userId !== currentUserId) {
          setOtherTyping(true);
          clearTimeout(typingTimer);
          typingTimer = setTimeout(() => setOtherTyping(false), 3500);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await room.track({ online: true, at: Date.now() });
      });
    roomRef.current = room;

    return () => {
      clearTimeout(typingTimer);
      supabase.removeChannel(room);
      roomRef.current = null;
    };
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Émet un événement de frappe (throttlé à 2 s)
  function emitTyping() {
    const now = Date.now();
    if (now - typingSentRef.current < 2000) return;
    typingSentRef.current = now;
    roomRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } });
  }

  /* ── Actions ─────────────────────────────────────────────────── */
  const handleSend = async () => {
    const content = input.trim();
    if ((!content && !pendingAtt) || sending) return;
    setSending(true);
    setInput("");
    const rid = replyTo?.id ?? null;
    const att = pendingAtt;
    setReplyTo(null);
    setPendingAtt(null);
    await sendMessageAction(content, rid, att);
    setSending(false);
    textareaRef.current?.focus();
  };

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return;   // 10 Mo max
    setAttaching(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("message-attachments").upload(path, file, { contentType: file.type, upsert: false });
    if (!error) {
      const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
      setPendingAtt({ url: data.publicUrl, type: file.type.startsWith("image/") ? "image" : "file", name: file.name });
    } else {
      console.warn("[messagerie] upload échoué:", error.message);
    }
    setAttaching(false);
  }

  function startEdit(msg: Message) {
    setEditingId(msg.id);
    setEditText(msg.content);
    setHoverMsg(null);
  }

  async function saveEdit(msg: Message) {
    const content = editText.trim();
    setEditingId(null);
    if (!content || content === msg.content) return;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content, edited_at: new Date().toISOString() } : m));
    startTransition(() => { editMessage(msg.id, content); });
  }

  function handleDelete(msg: Message) {
    setHoverMsg(null);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted_at: new Date().toISOString(), is_pinned: false } : m));
    startTransition(() => { deleteMessage(msg.id); });
  }

  function startReply(msg: Message) {
    setReplyTo(msg);
    setHoverMsg(null);
    textareaRef.current?.focus();
  }

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
  const pinnedMsgs    = messages.filter(m => m.is_pinned && !m.deleted_at);
  const msgById       = new Map(messages.map(m => [m.id, m]));
  const snippet       = (m?: Message) => m ? (m.deleted_at ? "Message supprimé" : m.content.slice(0, 60)) : "";

  const mq = msgSearch.trim().toLowerCase();
  const visibleMessages = mq
    ? messages.filter(m => !m.deleted_at && m.content.toLowerCase().includes(mq))
    : messages;

  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  for (const msg of visibleMessages) {
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
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-arc-navy flex items-center justify-center overflow-hidden">
            {otherParticipant.avatar_url
              ? <Image src={otherParticipant.avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-white">{otherInitiale}</span>}
          </div>
          {otherOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-white" title="En ligne" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-arc-navy text-sm">{otherName}</div>
          <div className="text-[11px] h-3.5 leading-none">
            {otherTyping ? (
              <span className="text-arc-blue font-medium">écrit…</span>
            ) : otherOnline ? (
              <span className="text-green-600">En ligne</span>
            ) : null}
          </div>
        </div>
        {pinnedMsgs.length > 0 && (
          <button
            onClick={() => setShowPinned(v => !v)}
            className="text-xs text-arc-blue hover:underline flex items-center gap-1"
          >
            📌 {pinnedMsgs.length} épinglé{pinnedMsgs.length > 1 ? "s" : ""}
          </button>
        )}
        <button
          onClick={() => { setShowSearch(v => !v); if (showSearch) setMsgSearch(""); }}
          className="w-8 h-8 rounded-full text-arc-text3 hover:text-arc-navy hover:bg-arc-bg flex items-center justify-center transition-colors"
          title="Rechercher dans la conversation"
        >🔍</button>
      </div>

      {/* Barre de recherche dans le fil */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-arc-border bg-white flex-shrink-0 flex items-center gap-2">
          <input
            autoFocus value={msgSearch}
            onChange={e => setMsgSearch(e.target.value)}
            placeholder="Rechercher dans les messages…"
            className="flex-1 px-3 py-1.5 rounded-lg bg-arc-bg text-sm outline-none focus:ring-1 focus:ring-arc-navy"
          />
          {msgSearch && <span className="text-[11px] text-arc-text3 flex-shrink-0">{visibleMessages.length} résultat{visibleMessages.length !== 1 ? "s" : ""}</span>}
        </div>
      )}

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
                    {isHovered && !msg.deleted_at && editingId !== msg.id && (
                      <div
                        className={`absolute ${isMe ? "right-full mr-2" : "left-full ml-2"} top-0 flex items-center gap-1 z-10`}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setEmojiFor(v => v === msg.id ? null : msg.id)}
                          className="w-7 h-7 rounded-full bg-white border border-arc-border text-sm flex items-center justify-center hover:bg-arc-blueBg shadow-sm"
                          title="Réagir"
                        >😊</button>
                        <button
                          onClick={() => startReply(msg)}
                          className="w-7 h-7 rounded-full bg-white border border-arc-border text-sm flex items-center justify-center hover:bg-arc-blueBg shadow-sm text-arc-text3"
                          title="Répondre"
                        >↩</button>
                        <button
                          onClick={() => handlePin(msg)}
                          className={`w-7 h-7 rounded-full bg-white border border-arc-border text-sm flex items-center justify-center hover:bg-arc-blueBg shadow-sm ${msg.is_pinned ? "text-arc-blue" : "text-arc-text3"}`}
                          title={msg.is_pinned ? "Désépingler" : "Épingler"}
                        >📌</button>
                        {isMe && (
                          <>
                            <button
                              onClick={() => startEdit(msg)}
                              className="w-7 h-7 rounded-full bg-white border border-arc-border text-xs flex items-center justify-center hover:bg-arc-blueBg shadow-sm text-arc-text3"
                              title="Modifier"
                            >✏️</button>
                            <button
                              onClick={() => handleDelete(msg)}
                              className="w-7 h-7 rounded-full bg-white border border-arc-border text-xs flex items-center justify-center hover:bg-red-50 hover:text-red-500 shadow-sm text-arc-text3"
                              title="Supprimer"
                            >🗑</button>
                          </>
                        )}
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
                    {msg.deleted_at ? (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm italic ${isMe ? "bg-arc-navy/40 text-white/70 rounded-br-sm" : "bg-white border border-arc-border text-arc-text3 rounded-bl-sm"}`}>
                        🚫 Message supprimé
                      </div>
                    ) : editingId === msg.id ? (
                      <div className="bg-white border border-arc-blue rounded-2xl p-2 shadow-sm min-w-[220px]" onClick={e => e.stopPropagation()}>
                        <textarea
                          autoFocus value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(msg); }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          rows={2}
                          className="w-full px-2 py-1 text-sm outline-none resize-none text-arc-navy"
                        />
                        <div className="flex justify-end gap-2 mt-1">
                          <button onClick={() => setEditingId(null)} className="text-[11px] text-arc-text3 hover:text-arc-navy">Annuler</button>
                          <button onClick={() => saveEdit(msg)} className="text-[11px] font-bold text-arc-blue hover:underline">Enregistrer</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                          isMe
                            ? "bg-arc-navy text-white rounded-br-sm"
                            : "bg-white border border-arc-border text-arc-navy rounded-bl-sm shadow-sm"
                        } ${msg.is_pinned ? "ring-1 ring-arc-blue ring-offset-1" : ""}`}
                      >
                        {/* Citation */}
                        {msg.reply_to_id && (
                          <div className={`text-[11px] mb-1 pl-2 border-l-2 rounded-sm ${isMe ? "border-white/40 text-white/70" : "border-arc-blue/40 text-arc-text3"}`}>
                            ↩ {snippet(msgById.get(msg.reply_to_id))}
                          </div>
                        )}
                        {msg.attachment_url && (
                          msg.attachment_type === "image" ? (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                              <Image src={msg.attachment_url} alt={msg.attachment_name ?? ""} width={240} height={240}
                                className="rounded-lg max-w-full h-auto max-h-64 w-auto object-cover" />
                            </a>
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                              className={`flex items-center gap-2 mb-1 p-2 rounded-lg ${isMe ? "bg-white/10 hover:bg-white/20" : "bg-arc-bg hover:bg-arc-blueBg"}`}>
                              <span className="text-lg flex-shrink-0">📎</span>
                              <span className="text-xs underline truncate">{msg.attachment_name ?? "Fichier"}</span>
                            </a>
                          )
                        )}
                        {msg.content}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-white/50" : "text-arc-text3"}`}>
                          {msg.edited_at && <span className="text-[10px] italic">modifié</span>}
                          <span className="text-[10px]">
                            {new Date(msg.created_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMe && (
                            <span className={`text-[11px] leading-none ${status === "read" ? "text-white/80" : "text-white/40"}`}>
                              {status === "read" ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

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
        {otherTyping && (
          <div className="flex justify-start mb-2">
            <div className="bg-white border border-arc-border rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-arc-text3 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-arc-text3 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-arc-text3 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-arc-border bg-white flex-shrink-0">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 pl-3 py-1.5 border-l-2 border-arc-blue bg-arc-blueBg rounded-r-lg">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-arc-blue">Réponse à {replyTo.sender_id === currentUserId ? "toi" : otherName}</div>
              <div className="text-xs text-arc-text3 truncate">{snippet(replyTo)}</div>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-arc-text3 hover:text-red-500 flex-shrink-0 px-1">✕</button>
          </div>
        )}
        {pendingAtt && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-arc-bg border border-arc-border rounded-lg">
            {pendingAtt.type === "image"
              ? <Image src={pendingAtt.url} alt="" width={40} height={40} className="w-10 h-10 rounded object-cover flex-shrink-0" />
              : <span className="w-10 h-10 rounded bg-arc-blueBg flex items-center justify-center flex-shrink-0">📎</span>}
            <span className="text-xs text-arc-navy flex-1 truncate">{pendingAtt.name}</span>
            <button onClick={() => setPendingAtt(null)} className="text-arc-text3 hover:text-red-500 flex-shrink-0 px-1">✕</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick}
            accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.zip" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={attaching || !!pendingAtt}
            title="Joindre un fichier"
            className="w-10 h-10 rounded-xl border border-arc-border text-arc-text3 hover:text-arc-navy hover:border-arc-navy transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          >{attaching ? "⏳" : "📎"}</button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); emitTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Écris un message… (Entrée pour envoyer)"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !pendingAtt) || sending}
            className="px-4 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors disabled:opacity-40 flex-shrink-0"
          >➤</button>
        </div>
      </div>
    </div>
  );
}
