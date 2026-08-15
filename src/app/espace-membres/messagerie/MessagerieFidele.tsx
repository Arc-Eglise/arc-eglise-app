"use client";

/**
 * Messagerie fidèle à la maquette Stitch `messagerie_arc_extension_v3.4_1`.
 * Layout 3 colonnes (Conversations · Chat · Details) branché sur les VRAIES
 * données : useChannelMessages (realtime Supabase) + listMyConversations.
 * Rendu en pleine page par la route /espace-membres/messagerie.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useChannelMessages } from "@/components/messagerie/useChannelMessages";
import {
  listMyConversations, getOrCreateConversation, createGroupConversation,
  messageFunction, searchMyMessages, type DmSummary,
} from "@/lib/actions/messagerie";

type MemberLite = { id: string; first_name: string | null; last_name: string | null };
// 13 fonctions ARC (slug → libellé) pour « écrire à une fonction »
const FUNCTIONS: { slug: string; label: string }[] = [
  { slug: "pasteur", label: "Pasteur" }, { slug: "chorale", label: "Chorale" },
  { slug: "media", label: "Équipe Média" }, { slug: "social", label: "Social" },
  { slug: "hospitalite", label: "Hospitalité" }, { slug: "sanitaire", label: "Sanitaire" },
  { slug: "finance", label: "Finance" }, { slug: "support", label: "Support" },
  { slug: "jeunesse", label: "Jeunesse" }, { slug: "femmes", label: "Femmes" },
  { slug: "ecodim", label: "Écodim" }, { slug: "suivi", label: "Suivi d'âmes" },
  { slug: "communication", label: "Communication" },
];

const ICON = "material-symbols-outlined";
const QUICK_EMOJIS = ["🙏", "❤️", "🙌", "😊", "🔥", "✅"];

// Canaux publics (clé realtime = libellé). Fidèle à la liste maquette.
const CHANNELS: { key: string; label: string }[] = [
  { key: "Pasteur",              label: "Pasteur" },
  { key: "Équipe Média",         label: "Équipe Média" },
  { key: "Chorale",              label: "Chorale" },
  { key: "La Jeunesse",          label: "La Jeunesse" },
  { key: "Groupe des Femmes",    label: "Groupe des Femmes" },
  { key: "Social & Hospitalité", label: "Social & Hospitalité" },
  { key: "Sanitaire & Propreté", label: "Sanitaire & Propreté" },
  { key: "Écodim",               label: "Écodim" },
  { key: "Suivi d'âmes",         label: "Suivi d'âmes" },
  { key: "Communication",        label: "Communication" },
  { key: "Support",              label: "Support" },
];

// Nav latérale : fidèle à la maquette, liens réels (aucune navigation perdue).
const NAV = [
  { label: "CRM",         icon: "groups",        href: "/espace-membres/crm" },
  { label: "Messagerie",  icon: "chat_bubble",   href: "/espace-membres/messagerie", active: true },
  { label: "Présence",    icon: "how_to_reg",    href: "/espace-membres/presences" },
  { label: "Médiathèque", icon: "library_books", href: "/espace-membres/streaming" },
  { label: "Notes",       icon: "assignment",    href: "/espace-membres/notes-taches" },
];

export default function MessagerieFidele({
  currentUserId, displayName,
}: { currentUserId: string; displayName: string }) {
  const [sel, setSel] = useState<{ kind: "channel" | "dm"; key: string; label: string }>(
    { kind: "channel", key: CHANNELS[0].key, label: CHANNELS[0].label }
  );
  const [dmList, setDmList] = useState<DmSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  // Nouveau message
  const [newOpen, setNewOpen] = useState(false);
  const [newTab, setNewTab] = useState<"dm" | "group" | "fonction">("dm");
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [mSearch, setMSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupSel, setGroupSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // Recherche de messages
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ conversationId: string; label: string; isGroup: boolean; excerpt: string; date: string }[] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => { listMyConversations().then(setDmList).catch(() => {}); }, []);

  // Pièce jointe réelle : upload Storage puis envoi (même bucket que l'ancien code).
  async function uploadAndSend(file: File) {
    setAttachBusy(true);
    try {
      const path = `${currentUserId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("message-attachments")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (!error) {
        const { data: pub } = supabase.storage.from("message-attachments").getPublicUrl(path);
        await chan.send(draft.trim(), { url: pub.publicUrl, type: file.type || "", name: file.name });
        setDraft("");
      }
    } finally { setAttachBusy(false); }
  }

  const chan = useChannelMessages({
    channelKey: sel.key,
    channelName: sel.label,
    currentUserId,
    conversationId: sel.kind === "dm" ? sel.key : null,
    enabled: true,
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chan.messages.length]);

  const pinned = useMemo(() => chan.messages.filter(m => m.pinned), [chan.messages]);

  function submit() {
    const t = draft.trim();
    if (!t) return;
    chan.send(t);
    setDraft("");
  }

  async function openNew() {
    setNewOpen(true);
    if (members.length === 0) {
      const { data } = await supabase.from("profiles")
        .select("id, first_name, last_name").eq("validated", true).order("first_name").limit(500);
      setMembers(((data ?? []) as MemberLite[]).filter(m => m.id !== currentUserId));
    }
  }
  async function refreshDms() { setDmList(await listMyConversations().catch(() => [])); }
  async function startDm(id: string) {
    setBusy(true);
    const res = await getOrCreateConversation(id);
    setBusy(false);
    if ("conversationId" in res && res.conversationId) {
      await refreshDms(); setSel({ kind: "dm", key: res.conversationId, label: memberName(id) });
      setNewOpen(false);
    }
  }
  async function makeGroup() {
    if (!groupName.trim() || groupSel.length < 2) return;
    setBusy(true);
    const res = await createGroupConversation(groupName.trim(), groupSel);
    setBusy(false);
    if ("conversationId" in res && res.conversationId) {
      await refreshDms(); setSel({ kind: "dm", key: res.conversationId, label: groupName.trim() });
      setNewOpen(false); setGroupName(""); setGroupSel([]);
    }
  }
  async function openFunction(slug: string, label: string) {
    setBusy(true);
    const res = await messageFunction(slug, label);
    setBusy(false);
    if ("conversationId" in res && res.conversationId) {
      await refreshDms(); setSel({ kind: "dm", key: res.conversationId, label });
      setNewOpen(false);
    }
  }
  function memberName(id: string) {
    const m = members.find(x => x.id === id);
    return m ? ([m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre") : "Conversation";
  }
  async function runSearch() {
    const q = search.trim();
    if (!q) { setResults(null); return; }
    const hits = await searchMyMessages(q).catch(() => []);
    setResults(hits);
  }

  const initials = (s: string) => s.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "•";

  // ── Regroupe les messages par jour pour les séparateurs de date ──
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date(); const y = new Date(); y.setDate(y.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === y.toDateString()) return "Hier";
    return d.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8f9fc", color: "#191c1e", fontFamily: '"DM Sans", system-ui, sans-serif' }}>

      {/* ── Nav latérale (maquette) ── */}
      <nav className="w-64 shrink-0 flex flex-col text-white" style={{ background: "#1a237e" }}>
        <div className="p-6 border-b border-white/10">
          <a href="/espace-membres" className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors mb-3 font-medium">← Espace membre</a>
          <div className="font-bold text-lg" style={{ fontFamily: '"Playfair Display", serif' }}>ARC Église</div>
        </div>
        <div className="p-4">
          <button onClick={openNew} className="w-full bg-white py-3 rounded-full text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm" style={{ color: "#1a237e" }}>
            <span className={ICON} style={{ fontSize: 20 }}>edit</span> Nouveau message
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
          {NAV.map(n => (
            <a key={n.label} href={n.href}
              className={`flex items-center gap-3 px-6 py-3 rounded-r-full mr-2 transition-all ${n.active ? "bg-white/20 text-white font-bold border-r-4 border-white" : "text-white/80 hover:bg-white/10"}`}>
              <span className={ICON} style={{ fontSize: 22, fontVariationSettings: n.active ? "'FILL' 1" : undefined }}>{n.icon}</span>
              <span className="text-sm">{n.label}</span>
            </a>
          ))}
        </div>
        <div className="p-2 border-t border-white/10">
          <a href="/espace-membres/profil" className="flex items-center gap-3 px-6 py-3 rounded-r-full mr-2 text-white/80 hover:bg-white/10 transition-all">
            <span className={ICON} style={{ fontSize: 22 }}>settings</span><span className="text-sm">Paramètres</span>
          </a>
        </div>
      </nav>

      {/* ── Colonne Conversations ── */}
      <aside className="w-80 shrink-0 border-r flex flex-col" style={{ borderColor: "#c7c5d2", background: "#f8f9fc" }}>
        <div className="p-6 border-b" style={{ borderColor: "#c7c5d2" }}>
          <h2 className="text-2xl mb-3" style={{ fontFamily: '"Playfair Display", serif', color: "#060b50", fontWeight: 600 }}>Conversations</h2>
          <div className="relative">
            <span className={ICON} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#464650", fontSize: 20 }}>search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") runSearch(); if (e.key === "Escape") { setSearch(""); setResults(null); } }}
              placeholder="Rechercher un message" className="w-full rounded-full py-2 pl-10 pr-4 text-sm outline-none transition-all" style={{ background: "#edeef1", border: "1px solid #c7c5d2", color: "#191c1e" }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          {/* Canaux */}
          <div className="px-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center justify-between" style={{ color: "#464650" }}>
              Canaux <button className="hover:opacity-70"><span className={ICON} style={{ fontSize: 18 }}>add</span></button>
            </h3>
            <ul className="flex flex-col gap-1">
              {CHANNELS.map(c => {
                const on = sel.kind === "channel" && sel.key === c.key;
                return (
                  <li key={c.key}>
                    <button onClick={() => setSel({ kind: "channel", key: c.key, label: c.label })}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                      style={on ? { background: "#1e2464", color: "#fff", fontWeight: 700 } : { color: "#191c1e" }}>
                      <span className={ICON} style={{ fontSize: 20, color: on ? "#fff" : "#464650" }}>tag</span>
                      <span className="text-sm truncate">{c.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {/* Messages directs */}
          <div className="px-6 mt-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center justify-between" style={{ color: "#464650" }}>
              Messages directs <button onClick={openNew} className="hover:opacity-70"><span className={ICON} style={{ fontSize: 18 }}>add</span></button>
            </h3>
            <ul className="flex flex-col gap-1">
              {dmList.length === 0 && <li className="text-xs px-3 py-2" style={{ color: "#777681" }}>Aucune conversation.</li>}
              {dmList.map(d => {
                const on = sel.kind === "dm" && sel.key === d.id;
                return (
                  <li key={d.id}>
                    <button onClick={() => setSel({ kind: "dm", key: d.id, label: d.name })}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                      style={on ? { background: "#1e2464", color: "#fff" } : { color: "#191c1e" }}>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm shrink-0" style={{ background: d.isGroup ? "#d2d4ff" : "#e0e0ff", color: "#585a7f" }}>{d.initial}</span>
                      <span className="text-sm truncate flex-1">{d.name}</span>
                      {d.hasUnread && <span className="w-2 h-2 rounded-full" style={{ background: "#1e2464" }} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>

      {/* ── Chat principal ── */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: "#f8f9fc" }}>
        {/* En-tête */}
        <header className="h-20 px-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: "#c7c5d2", background: "rgba(248,249,252,.8)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className={ICON} style={{ fontSize: 28, color: "#1e2464" }}>{sel.kind === "channel" ? "tag" : "person"}</span>
            <div className="min-w-0">
              <h2 className="text-xl truncate" style={{ fontFamily: '"Playfair Display", serif', color: "#060b50" }}>{sel.label}</h2>
              <div className="flex items-center gap-2 text-xs" style={{ color: "#464650" }}>
                <span className="flex items-center gap-1"><span className={ICON} style={{ fontSize: 14 }}>group</span> {sel.kind === "channel" ? "Canal de fonction" : "Message direct"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1" style={{ color: "#464650" }}>
            <button className="p-2 rounded-full hover:bg-black/5 transition-colors"><span className={ICON}>call</span></button>
            <button className="p-2 rounded-full hover:bg-black/5 transition-colors"><span className={ICON}>videocam</span></button>
            <div className="w-px h-6 mx-2" style={{ background: "#c7c5d2" }} />
            <button onClick={() => setShowDetails(s => !s)} className="p-2 rounded-full transition-colors" style={{ background: showDetails ? "#edeef1" : "transparent" }}><span className={ICON} style={{ color: "#1e2464" }}>info</span></button>
          </div>
        </header>

        {/* Historique */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {chan.loading && <div className="text-center text-sm" style={{ color: "#777681" }}>Chargement…</div>}
          {!chan.loading && chan.messages.length === 0 && (
            <div className="text-center text-sm" style={{ color: "#777681" }}>Aucun message. Écris le premier 👋</div>
          )}
          {chan.messages.map((m, i) => {
            const prev = chan.messages[i - 1];
            const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const rxns = chan.reactions[m.id];
            return (
              <div key={m.id} className="flex flex-col gap-6">
                {showDay && (
                  <div className="flex items-center justify-center relative my-1">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: "rgba(199,197,210,.5)" }} /></div>
                    <span className="relative px-4 text-[11px] uppercase tracking-widest" style={{ background: "#f8f9fc", color: "#464650" }}>{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <div className={`flex gap-4 max-w-3xl ${m.mine ? "ml-auto flex-row-reverse" : ""}`}
                  onMouseEnter={() => setHover(m.id)} onMouseLeave={() => { setHover(null); setEmojiFor(null); }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 mt-1"
                    style={{ background: m.mine ? "#1e2464" : "#d2d4ff", color: m.mine ? "#fff" : "#585a7f" }}>
                    {m.mine ? "Moi" : initials(m.from)}
                  </div>
                  <div className={`flex flex-col gap-1 min-w-0 ${m.mine ? "items-end" : ""}`}>
                    <div className={`flex items-baseline gap-2 ${m.mine ? "flex-row-reverse" : ""}`}>
                      <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, lineHeight: 1.15, color: "#060b50" }}>{m.from}</span>
                      <span className="text-xs" style={{ color: "#464650" }}>{m.time}</span>
                    </div>
                    <div className="relative">
                      {(m.text || !m.attachmentUrl) && (
                        <div className="px-4 py-3 shadow-sm leading-relaxed text-[15px]"
                          style={m.mine
                            ? { background: "#1e2464", color: "#fff", borderRadius: 18, borderTopRightRadius: 4 }
                            : { background: "#fff", color: "#191c1e", border: "1px solid rgba(199,197,210,.4)", borderRadius: 18, borderTopLeftRadius: 4 }}>
                          {m.pinned && <span style={{ marginRight: 6, opacity: .6 }}>📌</span>}
                          {m.text || <span style={{ opacity: .6 }}>—</span>}
                        </div>
                      )}
                      {/* Actions au survol : réagir / épingler / supprimer */}
                      {hover === m.id && !m.id.startsWith("tmp-") && (
                        <div className={`absolute -top-4 ${m.mine ? "left-0" : "right-0"} flex items-center gap-0.5 bg-white rounded-full shadow-md border px-1 py-0.5`} style={{ borderColor: "rgba(199,197,210,.5)", zIndex: 5 }}>
                          {QUICK_EMOJIS.slice(0, 3).map(e => (
                            <button key={e} onClick={() => chan.react(m.id, e)} className="text-sm px-1 hover:scale-110 transition-transform">{e}</button>
                          ))}
                          <button onClick={() => setEmojiFor(emojiFor === m.id ? null : m.id)} title="Réagir" className="px-1"><span className={ICON} style={{ fontSize: 16, color: "#464650" }}>add_reaction</span></button>
                          <button onClick={() => chan.togglePin(m.id)} title={m.pinned ? "Désépingler" : "Épingler"} className="px-1"><span className={ICON} style={{ fontSize: 16, color: m.pinned ? "#1e2464" : "#464650" }}>push_pin</span></button>
                          {m.mine && <button onClick={() => chan.remove(m.id)} title="Supprimer" className="px-1"><span className={ICON} style={{ fontSize: 16, color: "#ba1a1a" }}>delete</span></button>}
                        </div>
                      )}
                      {emojiFor === m.id && (
                        <div className={`absolute top-8 ${m.mine ? "left-0" : "right-0"} flex gap-1 bg-white rounded-xl shadow-lg border p-2`} style={{ borderColor: "rgba(199,197,210,.5)", zIndex: 6 }}>
                          {QUICK_EMOJIS.map(e => <button key={e} onClick={() => { chan.react(m.id, e); setEmojiFor(null); }} className="text-lg hover:scale-125 transition-transform">{e}</button>)}
                        </div>
                      )}
                    </div>
                    {/* Pièce jointe */}
                    {m.attachmentUrl && (
                      m.attachmentType?.startsWith("image/") ? (
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.attachmentUrl} alt={m.attachmentName ?? "image"} style={{ maxWidth: 240, maxHeight: 220, borderRadius: 14, border: "1px solid rgba(199,197,210,.5)" }} />
                        </a>
                      ) : (
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-3 p-3 rounded-lg mt-1 shadow-sm max-w-xs" style={{ background: "#fff", border: "1px solid #c7c5d2" }}>
                          <span className={ICON} style={{ fontSize: 28, color: "#ba1a1a" }}>description</span>
                          <span className="text-sm truncate flex-1" style={{ color: "#191c1e" }}>{m.attachmentName ?? "fichier"}</span>
                          <span className={ICON} style={{ fontSize: 18, color: "#777681" }}>download</span>
                        </a>
                      )
                    )}
                    {rxns && Object.keys(rxns).length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {Object.entries(rxns).map(([e, n]) => {
                          const mine = (chan.myReactions[m.id] ?? []).includes(e);
                          return (
                            <button key={e} onClick={() => chan.react(m.id, e)} className="px-2 py-1 rounded-full text-xs border shadow-sm flex items-center gap-1" style={{ background: mine ? "#e0e0ff" : "#edeef1", borderColor: mine ? "#1e2464" : "rgba(199,197,210,.5)" }}>
                              {e} <span className="font-bold">{n}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Zone de saisie */}
        <div className="p-6 border-t shrink-0" style={{ borderColor: "#c7c5d2", background: "#f8f9fc" }}>
          <div className="rounded-xl p-1 shadow-sm flex flex-col" style={{ background: "#fff", border: "1px solid #c7c5d2" }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder={`Message ${sel.kind === "channel" ? "#" + sel.label : sel.label}…`} rows={1}
              className="w-full bg-transparent border-none resize-none focus:outline-none text-[15px] p-3" style={{ minHeight: 48, color: "#191c1e" }} />
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex items-center gap-1" style={{ color: "#464650" }}>
                <label className="p-2 rounded-full hover:bg-black/5 cursor-pointer" title="Joindre un fichier">
                  <span className={ICON}>{attachBusy ? "hourglass_top" : "attach_file"}</span>
                  <input type="file" className="hidden" disabled={attachBusy}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.currentTarget.value = ""; }} />
                </label>
                <button className="p-2 rounded-full hover:bg-black/5" title="Gras" onClick={() => setDraft(d => d + "**gras**")}><span className={ICON}>format_bold</span></button>
                <button className="p-2 rounded-full hover:bg-black/5" title="Emoji" onClick={() => setDraft(d => d + "😊")}><span className={ICON}>mood</span></button>
              </div>
              <button onClick={submit} className="p-2 rounded-full hover:opacity-90 shadow-sm flex items-center justify-center" style={{ background: "#1e2464", color: "#fff" }}>
                <span className={ICON} style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
          </div>
          <div className="text-center mt-2 text-xs" style={{ color: "#464650" }}><strong>Entrée</strong> pour envoyer, <strong>Maj + Entrée</strong> pour un retour ligne</div>
        </div>
      </main>

      {/* ── Panneau Details ── */}
      {showDetails && (
        <aside className="w-80 shrink-0 border-l overflow-y-auto flex flex-col" style={{ borderColor: "#c7c5d2", background: "#f8f9fc" }}>
          <div className="p-6 border-b flex items-center justify-between sticky top-0 z-10" style={{ borderColor: "#c7c5d2", background: "rgba(248,249,252,.9)", backdropFilter: "blur(6px)" }}>
            <h3 className="text-xl" style={{ fontFamily: '"Playfair Display", serif', color: "#060b50" }}>Détails</h3>
            <button onClick={() => setShowDetails(false)}><span className={ICON} style={{ color: "#464650" }}>close</span></button>
          </div>
          <div className="p-6 flex flex-col gap-8">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#464650" }}>À propos</h4>
              <div className="p-4 rounded-lg shadow-sm" style={{ background: "#fff", border: "1px solid rgba(199,197,210,.3)" }}>
                <p className="text-[15px] leading-relaxed" style={{ color: "#191c1e" }}>
                  {sel.kind === "channel" ? `Canal « ${sel.label} » — échanges de la fonction.` : `Conversation directe avec ${sel.label}.`}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center justify-between" style={{ color: "#464650" }}>
                Messages épinglés <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "#edeef1", color: "#060b50" }}>{pinned.length}</span>
              </h4>
              {pinned.length === 0 ? (
                <p className="text-sm" style={{ color: "#777681" }}>Aucun message épinglé.</p>
              ) : pinned.map(p => (
                <div key={p.id} className="p-3 rounded-lg mb-2 shadow-sm" style={{ background: "#f2f3f6", borderLeft: "2px solid #060b50" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm" style={{ fontFamily: '"Playfair Display", serif', color: "#060b50" }}>{p.from}</span>
                    <span className="text-[10px]" style={{ color: "#464650" }}>{p.time}</span>
                  </div>
                  <p className="text-sm line-clamp-2" style={{ color: "#464650" }}>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* ── Résultats de recherche (overlay) ── */}
      {results && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-24" onClick={() => setResults(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg" style={{ fontFamily: '"Playfair Display", serif', color: "#060b50" }}>Résultats — « {search} »</h3>
              <button onClick={() => setResults(null)}><span className={ICON} style={{ color: "#464650" }}>close</span></button>
            </div>
            {results.length === 0 ? <p className="text-sm" style={{ color: "#777681" }}>Aucun message trouvé.</p> : results.map((r, i) => (
              <button key={i} onClick={() => { setSel({ kind: "dm", key: r.conversationId, label: r.label }); setResults(null); setSearch(""); }}
                className="w-full text-left p-3 rounded-lg mb-1 hover:bg-[#f2f3f6] transition-colors">
                <div className="text-sm font-semibold" style={{ color: "#060b50" }}>{r.label}{r.isGroup ? " (groupe)" : ""}</div>
                <div className="text-sm truncate" style={{ color: "#464650" }}>{r.excerpt}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal Nouveau message ── */}
      {newOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setNewOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl" style={{ fontFamily: '"Playfair Display", serif', color: "#060b50" }}>Nouveau message</h3>
              <button onClick={() => setNewOpen(false)}><span className={ICON} style={{ color: "#464650" }}>close</span></button>
            </div>
            <div className="flex gap-1 mb-4 rounded-full p-1" style={{ background: "#edeef1" }}>
              {([["dm", "Membre"], ["group", "Groupe"], ["fonction", "Fonction"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setNewTab(k)} className="flex-1 py-1.5 rounded-full text-xs font-bold transition-colors"
                  style={newTab === k ? { background: "#1e2464", color: "#fff" } : { color: "#464650" }}>{l}</button>
              ))}
            </div>

            {newTab === "fonction" ? (
              <div className="grid grid-cols-2 gap-2 overflow-y-auto">
                {FUNCTIONS.map(f => (
                  <button key={f.slug} disabled={busy} onClick={() => openFunction(f.slug, f.label)}
                    className="p-3 rounded-lg text-sm text-left hover:bg-[#f2f3f6] transition-colors" style={{ border: "1px solid #c7c5d2", color: "#191c1e" }}>
                    {f.label}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {newTab === "group" && (
                  <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Nom du groupe…"
                    className="w-full mb-3 px-3 py-2 rounded-lg text-sm outline-none" style={{ border: "1px solid #c7c5d2" }} />
                )}
                <input value={mSearch} onChange={e => setMSearch(e.target.value)} placeholder="Rechercher un membre…"
                  className="w-full mb-3 px-3 py-2 rounded-lg text-sm outline-none" style={{ border: "1px solid #c7c5d2" }} />
                <div className="flex-1 overflow-y-auto flex flex-col gap-1">
                  {members.filter(m => memberName(m.id).toLowerCase().includes(mSearch.toLowerCase())).map(m => {
                    const nm = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
                    const checked = groupSel.includes(m.id);
                    return (
                      <button key={m.id} disabled={busy}
                        onClick={() => newTab === "dm" ? startDm(m.id) : setGroupSel(prev => checked ? prev.filter(i => i !== m.id) : [...prev, m.id])}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f2f3f6] transition-colors text-left">
                        {newTab === "group" && (
                          <span className="w-4 h-4 rounded flex items-center justify-center text-[10px]" style={{ border: checked ? "none" : "1.5px solid #c7c5d2", background: checked ? "#1e2464" : "transparent", color: "#fff" }}>{checked ? "✓" : ""}</span>
                        )}
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#e0e0ff", color: "#585a7f" }}>{(m.first_name?.[0] ?? "?").toUpperCase()}</span>
                        <span className="text-sm truncate">{nm}</span>
                      </button>
                    );
                  })}
                </div>
                {newTab === "group" && (
                  <button onClick={makeGroup} disabled={busy || !groupName.trim() || groupSel.length < 2}
                    className="mt-3 w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{ background: "#1e2464" }}>
                    {busy ? "Création…" : `Créer le groupe${groupSel.length ? ` (${groupSel.length})` : ""}`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
