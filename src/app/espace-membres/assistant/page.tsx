"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

const SUGGESTIONS = [
  { icon: "📖", label: "Étude biblique", text: "Explique-moi le sens de Jean 3:16 dans son contexte." },
  { icon: "🙏", label: "Prière", text: "Guide-moi dans une prière pour la paix et la sagesse." },
  { icon: "📣", label: "Sermon", text: "Quelles sont les grandes thématiques des prédications de Paul ?" },
  { icon: "🏠", label: "Groupes", text: "Comment rejoindre un groupe de cellule à ARC ?" },
  { icon: "✝️", label: "Foi", text: "Comment approfondir ma relation avec Dieu au quotidien ?" },
  { icon: "📅", label: "Agenda", text: "Quels événements sont prévus prochainement à l'église ARC ?" },
];

function uid() {
  return Math.random().toString(36).slice(2);
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);

  useEffect(() => { scrollBottom(); }, [messages]);

  const sendMessage = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || loading) return;

    setDraft("");
    setLoading(true);
    textareaRef.current?.focus();

    const userMsg: Msg = { id: uid(), role: "user", content: text };
    const aiId = uid();

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: aiId, role: "assistant", content: "", streaming: true },
    ]);
    scrollBottom();

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/lunziko/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, stream: true }),
      });

      if (!res.ok || !res.body) throw new Error("stream error");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "chunk" && ev.content) {
              full += ev.content;
              setMessages((prev) =>
                prev.map((m) => (m.id === aiId ? { ...m, content: full } : m))
              );
            }
            if (ev.type === "end") {
              setMessages((prev) =>
                prev.map((m) => (m.id === aiId ? { ...m, content: full || "…", streaming: false } : m))
              );
            }
            if (ev.type === "error") throw new Error(ev.error);
          } catch { /* skip */ }
        }
      }
    } catch {
      // Fallback: non-streaming
      try {
        const r2 = await fetch("/api/lunziko/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
            stream: false,
          }),
        });
        const data = await r2.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, content: data.answer ?? "Je n'ai pas pu répondre.", streaming: false } : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, content: "Le service IA est temporairement indisponible. Merci de réessayer.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
      scrollBottom();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setDraft("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-arc-navy/10 bg-white/80 backdrop-blur shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-arc-blue">Lunziko IA</p>
          <h1 className="text-base font-serif font-semibold text-arc-navy leading-tight">Assistant IA</h1>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={clearChat}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <ClearIcon />
            Effacer
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-6 pb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-arc-blue to-arc-navy flex items-center justify-center text-2xl shadow-lg">
              ✨
            </div>
            <div>
              <p className="font-serif text-lg font-semibold text-arc-navy">Assistant IA de l'église ARC</p>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                Posez vos questions sur la foi, la Bible, les événements ou la communauté.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => sendMessage(s.text)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-700 hover:border-arc-blue hover:text-arc-navy transition shadow-sm"
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-arc-blue to-arc-navy flex items-center justify-center text-white text-xs font-bold mr-2 mt-0.5 shrink-0">
                  IA
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-arc-navy text-white rounded-br-sm"
                    : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-sm"
                }`}
              >
                {m.content || (m.streaming && (
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </span>
                ))}
                {m.streaming && m.content && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-arc-blue align-middle" />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-arc-navy/10 bg-white px-4 md:px-6 py-3">
        {/* Quick suggestions when not empty */}
        {!isEmpty && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s.text}
                type="button"
                onClick={() => sendMessage(s.text)}
                disabled={loading}
                className="shrink-0 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-arc-blue hover:text-arc-navy transition disabled:opacity-40"
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={2}
            placeholder="Posez votre question… (Entrée pour envoyer)"
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-arc-blue focus:bg-white transition"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!draft.trim() || loading}
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-arc-navy text-white transition hover:bg-arc-blue disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendIcon />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-400">
          Propulsé par Lunziko IA · Les réponses sont générées par IA et peuvent contenir des inexactitudes.
        </p>
      </div>
    </div>
  );
}
