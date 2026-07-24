"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { contactPastor } from "@/lib/actions/messagerie";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Quels sont les prochains cultes ?",
  "Peux-tu prier avec moi ?",
  "Comment m'impliquer dans l'église ?",
  "Explique-moi un verset biblique",
];

export default function ArcIaChat({ firstName }: { firstName: string }) {
  const [messages, setMessages] = useState<Msg[]>([{
    role: "assistant",
    content: `Bonjour ${firstName || ""} 👋 Je suis ARC IA, ton assistant pastoral. Comment puis-je t'accompagner aujourd'hui ?`,
  }]);
  const [input, setInput]       = useState("");
  const [streaming, setStreaming] = useState(false);
  const [handoff, startHandoff] = useTransition();
  const bottomRef               = useRef<HTMLDivElement>(null);
  const router                  = useRouter();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setInput("");
    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/messagerie/arc-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Le flux est du SSE : `data: {"type":"chunk","content":"…"}\n\n`
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload) as { type: string; content?: string };
            if (evt.type === "chunk" && evt.content) {
              acc += evt.content;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: acc };
                return next;
              });
            }
          } catch { /* ligne SSE partielle : on attend la suite */ }
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "Désolé, une erreur est survenue. Réessaie dans un instant." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  function toHuman() {
    startHandoff(async () => {
      const res = await contactPastor();
      if ("conversationId" in res && res.conversationId) {
        router.push(`/espace-membres/messagerie/${res.conversationId}`);
      }
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-arc-border flex items-center gap-3 flex-shrink-0">
        <Link href="/espace-membres/messagerie" className="md:hidden text-arc-text3 hover:text-arc-navy mr-1">←</Link>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-arc-blue to-arc-navy flex items-center justify-center flex-shrink-0 text-lg">🤖</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-arc-navy text-sm">ARC IA</div>
          <div className="text-[11px] text-arc-blue">Assistant pastoral · toujours disponible</div>
        </div>
        <button
          onClick={toHuman}
          disabled={handoff}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-arc-navy text-arc-navy hover:bg-arc-navy hover:text-white transition-colors disabled:opacity-50"
        >
          {handoff ? "…" : "🙋 Parler à un responsable"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 msg-canvas" role="log" aria-live="polite" aria-label="Conversation avec ARC IA">
        {messages.map((m, i) => (
          <div key={i} className={`flex mb-2.5 animate-msg-in ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
              m.role === "user"
                ? "bg-gradient-to-br from-arc-navy to-arc-blue text-white rounded-br-md"
                : "bg-white border border-arc-border text-arc-navy rounded-bl-md"
            }`}>
              {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}

        {/* Suggestions au démarrage */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-arc-border text-arc-navy hover:border-arc-navy transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-arc-border bg-white flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Pose ta question à ARC IA…"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none max-h-32"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            aria-label="Envoyer"
            className="w-11 h-11 rounded-full bg-gradient-to-br from-arc-navy to-arc-blue text-white flex items-center justify-center hover:shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex-shrink-0"
          >➤</button>
        </div>
        <p className="text-[10px] text-arc-text3 mt-1.5 text-center">ARC IA peut se tromper. Pour un vrai accompagnement, parle à un responsable.</p>
      </div>
    </div>
  );
}
