"use client";

import { useEffect, useState } from "react";

type Provider = "claude" | "openai" | "gemini";
type Keys = Record<Provider, string | null>;

const PROVIDERS: { id: Provider; name: string; color: string; icon: string; placeholder: string }[] = [
  { id: "claude",  name: "Claude (Anthropic)", color: "#D97706", icon: "✦", placeholder: "sk-ant-api03-..." },
  { id: "openai",  name: "ChatGPT (OpenAI)",   color: "#10B981", icon: "⬡", placeholder: "sk-proj-..." },
  { id: "gemini",  name: "Google Gemini",      color: "#3B82F6", icon: "✦", placeholder: "AIzaSy..." },
];

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
    </svg>
  );
}

export default function MemberAIKeys() {
  const [keys, setKeys] = useState<Keys>({ claude: null, openai: null, gemini: null });
  const [pref, setPref] = useState<string>("auto");
  const [drafts, setDrafts] = useState<Record<Provider, string>>({ claude: "", openai: "", gemini: "" });
  const [adding, setAdding] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Provider | null>(null);
  const [deleting, setDeleting] = useState<Provider | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/member-keys")
      .then((r) => r.json())
      .then((d) => { setKeys(d.keys ?? {}); setPref(d.provider_pref ?? "auto"); })
      .finally(() => setLoading(false));
  }, []);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const saveKey = async (provider: Provider) => {
    const key = drafts[provider].trim();
    if (!key) return;
    setSaving(provider);
    try {
      const res = await fetch("/api/member-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: key }),
      });
      const data = await res.json();
      if (data.ok) {
        setKeys((k) => ({ ...k, [provider]: data.masked }));
        setDrafts((d) => ({ ...d, [provider]: "" }));
        setAdding(null);
        flash("Clé enregistrée et chiffrée ✓", true);
      } else {
        flash(data.error ?? "Erreur", false);
      }
    } catch { flash("Erreur réseau", false); }
    finally { setSaving(null); }
  };

  const deleteKey = async (provider: Provider) => {
    setDeleting(provider);
    try {
      await fetch("/api/member-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      setKeys((k) => ({ ...k, [provider]: null }));
      flash("Clé supprimée", true);
    } catch { flash("Erreur", false); }
    finally { setDeleting(null); }
  };

  const savePref = async (value: string) => {
    setPref(value);
    await fetch("/api/member-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_pref: value }),
    });
  };

  if (loading) return <div className="animate-pulse h-24 bg-slate-100 rounded-2xl" />;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-arc-blue">Clés IA personnelles</p>
          <p className="text-xs text-slate-500 mt-0.5">Connectez vos propres comptes IA pour augmenter votre quota</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <LockIcon />
          Chiffrées AES-256
        </div>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-medium ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {msg.text}
        </div>
      )}

      {/* Provider cards */}
      <div className="divide-y divide-slate-100">
        {PROVIDERS.map((p) => {
          const connected = !!keys[p.id];
          const isAdding = adding === p.id;

          return (
            <div key={p.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg w-6 text-center shrink-0" style={{ color: p.color }}>{p.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                    {connected ? (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{keys[p.id]}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">Non connecté</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {connected ? (
                    <>
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckIcon /> Actif
                      </span>
                      <button
                        onClick={() => deleteKey(p.id)}
                        disabled={deleting === p.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                        title="Supprimer cette clé"
                      >
                        <TrashIcon />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setAdding(isAdding ? null : p.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-arc-navy hover:bg-arc-navy hover:text-white transition"
                    >
                      {isAdding ? "Annuler" : "Connecter"}
                    </button>
                  )}
                </div>
              </div>

              {/* Add key form */}
              {isAdding && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="password"
                    value={drafts[p.id]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && saveKey(p.id)}
                    placeholder={p.placeholder}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-arc-blue font-mono"
                    autoFocus
                  />
                  <button
                    onClick={() => saveKey(p.id)}
                    disabled={!drafts[p.id].trim() || saving === p.id}
                    className="px-3 py-2 rounded-lg bg-arc-navy text-white text-xs font-semibold disabled:opacity-40 transition hover:bg-arc-blue"
                  >
                    {saving === p.id ? "…" : "Sauvegarder"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Provider preference */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600 font-medium">Provider préféré</p>
          <select
            value={pref}
            onChange={(e) => savePref(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-arc-blue"
          >
            <option value="auto">Automatique</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">ChatGPT (OpenAI)</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Votre clé personnelle est prioritaire. Si indisponible, le serveur ARC prend le relais.
        </p>
      </div>
    </div>
  );
}
