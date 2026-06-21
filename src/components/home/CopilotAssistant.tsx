"use client";

import { useRef, useState } from "react";

type Msg = { role: "assistant" | "user"; content: string };

const QUICK = [
  "Quels sont les horaires des cultes ?",
  "Comment rejoindre la communauté ARC ?",
  "Quels événements sont prévus prochainement ?",
  "Comment puis-je faire partie d'un groupe ?",
];

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function CopilotAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Bonjour ! Je suis l'assistant IA de l'église ARC. Comment puis-je vous aider ?" },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () =>
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 50);

  const send = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || loading) return;

    setDraft("");
    setLoading(true);
    setStreaming("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    scrollBottom();

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/lunziko/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, stream: true }),
      });

      if (!res.ok || !res.body) throw new Error("Réponse invalide");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "chunk" && ev.content) {
              fullContent += ev.content;
              setStreaming(fullContent);
              scrollBottom();
            }
            if (ev.type === "end") {
              setMessages((prev) => [...prev, { role: "assistant", content: fullContent || "…" }]);
              setStreaming("");
              scrollBottom();
            }
            if (ev.type === "error") throw new Error(ev.error);
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch {
      // Fallback: non-streaming call
      try {
        const res2 = await fetch("/api/lunziko/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: messages.map((m) => ({ role: m.role, content: m.content })), stream: false }),
        });
        const data = await res2.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer ?? "Je n'ai pas pu répondre." }]);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "Le service est temporairement indisponible. Merci de réessayer." }]);
      }
    } finally {
      setLoading(false);
      setStreaming("");
      scrollBottom();
    }
  };

  return (
    <section id="assistant" className="bg-white py-16">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#f7f8ff] to-white p-6 md:p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-arc-blue">Assistant IA</p>
              <h2 className="mt-2 text-2xl md:text-3xl font-serif font-semibold text-slate-900">Besoin d'aide ?</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Propulsé par Lunziko IA
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            {/* Chat window */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div ref={chatRef} className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      m.role === "assistant"
                        ? "bg-slate-50 text-slate-700"
                        : "ml-auto bg-[#1e2464] text-white"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {streaming && (
                  <div className="max-w-[90%] rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                    {streaming}
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-400" />
                  </div>
                )}
                {loading && !streaming && (
                  <div className="flex gap-1.5 px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Input panel */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    disabled={loading}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition hover:border-[#1e2464] hover:text-[#1e2464] disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={4}
                  placeholder="Posez votre question…"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e2464]"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <SparkleIcon />
                    Réponse assistée par Lunziko IA
                  </span>
                  <button
                    type="button"
                    onClick={() => send()}
                    disabled={!draft.trim() || loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1e2464] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 transition hover:bg-[#181d5a]"
                  >
                    {loading ? "…" : <><SendIcon /> Envoyer</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
