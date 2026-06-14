"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
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
  sendMessageAction: (content: string) => Promise<void>;
}

export default function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
  otherParticipant,
  sendMessageAction,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherName     = [otherParticipant.first_name, otherParticipant.last_name].filter(Boolean).join(" ") || "Membre";
  const otherInitiale = (otherParticipant.first_name?.[0] ?? "?").toUpperCase();

  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("fr-CH", { day: "2-digit", month: "long", year: "numeric" });
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === date) last.msgs.push(msg);
    else groupedMessages.push({ date, msgs: [msg] });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-arc-border flex items-center gap-3 flex-shrink-0">
        <Link href="/espace-membres/messagerie" className="md:hidden text-arc-text3 hover:text-arc-navy mr-1">←</Link>
        <div className="w-9 h-9 rounded-full bg-arc-navy flex items-center justify-center overflow-hidden flex-shrink-0">
          {otherParticipant.avatar_url
            ? <Image src={otherParticipant.avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
            : <span className="text-xs font-bold text-white">{otherInitiale}</span>
          }
        </div>
        <div className="font-semibold text-arc-navy text-sm">{otherName}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-arc-bg">
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
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                      isMe
                        ? "bg-arc-navy text-white rounded-br-sm"
                        : "bg-white border border-arc-border text-arc-navy rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                    <div className={`text-[10px] mt-1 ${isMe ? "text-white/50" : "text-arc-text3"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
                    </div>
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
            placeholder="Écris un message... (Entrée pour envoyer)"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
