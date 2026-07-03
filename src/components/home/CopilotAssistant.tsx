"use client";

import { useRef, useState } from "react";

type Msg = { role: "assistant" | "user"; content: string };

const QUICK = [
  "Horaires des cultes ?",
  "Comment rejoindre ARC ?",
  "Prochains événements ?",
  "Rejoindre un groupe ?",
];

export default function CopilotAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Bonjour ! Je suis l'assistant IA de l'église ARC. Comment puis-je vous aider ?" },
  ]);
  const [draft, setDraft]       = useState("");
  const [loading, setLoading]   = useState(false);
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
            if (ev.type === "chunk" && ev.content) { fullContent += ev.content; setStreaming(fullContent); scrollBottom(); }
            if (ev.type === "end") { setMessages((prev) => [...prev, { role: "assistant", content: fullContent || "…" }]); setStreaming(""); scrollBottom(); }
            if (ev.type === "error") throw new Error(ev.error);
          } catch { /* ignore malformed */ }
        }
      }
    } catch {
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
    <section id="assistant" style={{ background: "#141738", padding: "90px 0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: 48, alignItems: "center" }} className="arc-two">

          {/* Left — description */}
          <div>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                padding: "7px 15px", border: "1px solid rgba(255,255,255,.18)",
                borderRadius: 999, fontSize: 12, letterSpacing: ".06em",
                color: "#E6C763", fontWeight: 700, marginBottom: 20,
              }}
            >
              ✦ Assistant IA
            </div>
            <h2 className="font-serif" style={{ fontWeight: 600, fontSize: "clamp(32px,4vw,48px)", lineHeight: 1.07, color: "#fff", marginBottom: 16 }}>
              Besoin d'aide ?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.65)", lineHeight: 1.7, marginBottom: 14 }}>
              Posez votre question — horaires, événements, comment nous rejoindre. Notre assistant vous répond instantanément.
            </p>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
              Propulsé par <span style={{ color: "#E6C763", fontWeight: 700 }}>Lunziko IA</span>
            </div>
          </div>

          {/* Right — chat UI */}
          <div
            style={{
              background: "#fff",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 30px 70px rgba(0,0,0,.4)",
              display: "flex",
              flexDirection: "column",
              height: 480,
            }}
          >
            {/* Chat header */}
            <div style={{ background: "#1e2464", color: "#fff", padding: "18px 22px", display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  width: 40, height: 40, borderRadius: 11,
                  background: "#C9A227", color: "#141738",
                  display: "grid", placeItems: "center",
                  fontSize: 20,
                }}
              >✦</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Assistant ARC</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  En ligne · Lunziko IA
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={chatRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: "linear-gradient(180deg,#fff,#FAF7F0)",
              }}
            >
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "12px 16px",
                      borderRadius: 16,
                      fontSize: 14,
                      lineHeight: 1.55,
                      background: m.role === "user" ? "#1e2464" : "#f0f2f9",
                      color: m.role === "user" ? "#fff" : "#1a1c2e",
                      borderBottomRightRadius: m.role === "user" ? 4 : 16,
                      borderBottomLeftRadius: m.role === "assistant" ? 4 : 16,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {streaming && (
                <div style={{ display: "flex" }}>
                  <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: "16px 16px 16px 4px", fontSize: 14, lineHeight: 1.55, background: "#f0f2f9", color: "#1a1c2e" }}>
                    {streaming}
                    <span style={{ marginLeft: 2, display: "inline-block", width: 2, height: 14, background: "#C9A227", animation: "blink 1.2s infinite" }} />
                  </div>
                </div>
              )}
              {loading && !streaming && (
                <div style={{ display: "flex", gap: 6, padding: "12px 16px" }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#b8c4e0", display: "inline-block", animation: `bounce .9s ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Input area */}
            <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(30,36,100,.12)", background: "#fff" }}>
              {/* Suggestions */}
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={loading}
                    style={{
                      background: "rgba(30,36,100,.06)",
                      border: "1px solid rgba(30,36,100,.12)",
                      color: "#1e2464",
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "7px 12px",
                      borderRadius: 999,
                      cursor: "pointer",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              {/* Input + send */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Écrivez votre message…"
                  style={{ flex: 1, padding: "13px 16px", border: "1.5px solid rgba(30,36,100,.12)", borderRadius: 12, fontSize: 14, color: "#1a1c2e", outline: "none" }}
                />
                <button
                  onClick={() => send()}
                  disabled={!draft.trim() || loading}
                  style={{
                    background: "#1e2464", color: "#fff",
                    border: "none", borderRadius: 12,
                    padding: "0 20px",
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                    opacity: !draft.trim() || loading ? 0.5 : 1,
                  }}
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @media (max-width: 820px) {
          .arc-two { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
