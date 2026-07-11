"use client";

import { useState, useEffect, useCallback } from "react";
import { getMailboxLabel, FUNCTION_MAILBOXES, CONTACT_MAILBOX, isGrievanceEmail } from "@/lib/mail/mailbox-config";
import Icon from "@/components/ui/Icon";

type GMsg = {
  id: string;
  subject: string;
  from: { emailAddress: { name: string; address: string } };
  toRecipients?: { emailAddress: { name: string; address: string } }[];
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  body?: { contentType: string; content: string };
  hasAttachments: boolean;
  importance: string;
};

const ALL_DESTINATIONS = [CONTACT_MAILBOX, ...Object.values(FUNCTION_MAILBOXES)];

function fmt(dt: string) {
  const d = new Date(dt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400_000);
  if (diffDays === 0) return d.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7)   return d.toLocaleDateString("fr-CH", { weekday: "short" });
  return d.toLocaleDateString("fr-CH", { day: "2-digit", month: "short" });
}

interface MailPanelProps {
  authorizedMailboxes: string[];
}

export default function MailPanel({ authorizedMailboxes }: MailPanelProps) {
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [messages,    setMessages]    = useState<GMsg[]>([]);
  const [msgLoading,  setMsgLoading]  = useState(false);
  const [selected,    setSelected]    = useState<GMsg | null>(null);
  const [detail,      setDetail]      = useState<GMsg | null>(null);
  const [detLoading,  setDetLoading]  = useState(false);

  const [replyOpen,   setReplyOpen]   = useState(false);
  const [replyText,   setReplyText]   = useState("");
  const [replySending, setReplySending] = useState(false);

  const [fwdOpen,     setFwdOpen]     = useState(false);
  const [fwdTo,       setFwdTo]       = useState("");
  const [fwdText,     setFwdText]     = useState("");
  const [fwdSending,  setFwdSending]  = useState(false);

  const [newOpen,     setNewOpen]     = useState(false);
  const [newTo,       setNewTo]       = useState("");
  const [newSubject,  setNewSubject]  = useState("");
  const [newBody,     setNewBody]     = useState("");
  const [newSending,  setNewSending]  = useState(false);

  const [toast,       setToast]       = useState<string | null>(null);
  const [mobileView, setMobileView]  = useState<"boxes"|"list"|"reader">("boxes");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Sélectionner la première boîte au chargement
  useEffect(() => {
    if (!selectedBox && authorizedMailboxes.length > 0) {
      setSelectedBox(authorizedMailboxes[0]);
    }
  }, [authorizedMailboxes, selectedBox]);

  // Charger les messages quand la boîte change
  const loadMessages = useCallback(async (box: string) => {
    setMsgLoading(true);
    setMessages([]);
    setSelected(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/mail/messages?box=${encodeURIComponent(box)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.detail ?? "Erreur de chargement");
      setMessages(data.value ?? []);
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : "Erreur de chargement"}`);
    } finally {
      setMsgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBox) loadMessages(selectedBox);
  }, [selectedBox, loadMessages]);

  // Ouvrir un message
  async function openMessage(msg: GMsg) {
    setSelected(msg);
    setDetail(null);
    setReplyOpen(false);
    setFwdOpen(false);
    setMobileView("reader");
    setDetLoading(true);
    try {
      const res = await fetch(`/api/mail/message?box=${encodeURIComponent(selectedBox!)}&id=${msg.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.detail ?? "Erreur de chargement");
      setDetail(data);
      // Marquer comme lu localement
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setDetLoading(false);
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !selected || !selectedBox) return;
    setReplySending(true);
    try {
      const res = await fetch("/api/mail/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ box: selectedBox, id: selected.id, comment: replyText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setReplyText("");
      setReplyOpen(false);
      showToast("✅ Réponse envoyée");
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setReplySending(false);
    }
  }

  async function sendForward() {
    if (!fwdTo || !selected || !selectedBox) return;
    setFwdSending(true);
    try {
      const res = await fetch("/api/mail/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ box: selectedBox, id: selected.id, toAddresses: [fwdTo], comment: fwdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setFwdTo(""); setFwdText(""); setFwdOpen(false);
      showToast("✅ Message transféré");
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setFwdSending(false);
    }
  }

  async function sendNew() {
    if (!newTo || !newSubject || !newBody || !selectedBox) return;
    setNewSending(true);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: selectedBox, to: newTo, subject: newSubject, message: newBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setNewTo(""); setNewSubject(""); setNewBody(""); setNewOpen(false);
      showToast("✅ Message envoyé");
    } catch (e) {
      showToast(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setNewSending(false);
    }
  }

  if (authorizedMailboxes.length === 0) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,color:"#8890aa",fontSize:14,textAlign:"center",gap:8,flexDirection:"column"}}>
        <div style={{fontSize:32}}>📭</div>
        <div>Aucune boîte de messagerie disponible.<br/>Contactez un administrateur pour accéder aux boîtes de votre fonction.</div>
      </div>
    );
  }

  // ── Styles inline (cohérents avec le reste de l'app) ──────────────────────
  const navy   = "#2B3475";
  const blue   = "#8495C1";
  const border = "#e8eaf2";
  const bg     = "#f5f6fb";
  const red    = "#c53030";

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:500,fontFamily:"Outfit,sans-serif"}}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{position:"fixed",top:16,right:16,zIndex:9999,background:toast.startsWith("✅")?"#276749":"#c53030",color:"white",padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,.2)"}}>
          {toast}
        </div>
      )}

      {/* ── En-tête ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:navy,fontFamily:"Playfair Display,serif",display:"flex",alignItems:"center",gap:8}}><Icon name="mail" size={22} /> Messagerie interne</div>
          <div style={{fontSize:12,color:blue,marginTop:2}}>Boîtes Microsoft 365 · arc-eglise.ch</div>
        </div>
        <button
          onClick={()=>setNewOpen(true)}
          style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:navy,color:"white",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"}}
        >
          ✏️ Nouveau message
        </button>
      </div>

      {/* ── Onglets de navigation mobile ── */}
      <div style={{display:"flex",gap:0,background:bg,borderRadius:10,padding:3,marginBottom:10,border:`1px solid ${border}`}} className="mail-mobile-nav">
        {(["boxes","list","reader"] as const).map(v => (
          <button key={v} onClick={()=>setMobileView(v)} style={{flex:1,padding:"6px 8px",borderRadius:8,border:"none",background:mobileView===v?white:transparent,color:mobileView===v?navy:blue,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>
            {v==="boxes"?"📂 Boîtes":v==="list"?"📋 Messages":"📖 Lecture"}
          </button>
        ))}
      </div>

      {/* ── Layout 3 colonnes ── */}
      <div style={{display:"flex",flex:1,gap:0,border:`1px solid ${border}`,borderRadius:14,overflow:"hidden",background:"white",minHeight:450}}>

        {/* ── COLONNE GAUCHE : Boîtes ── */}
        <div style={{width:200,minWidth:160,borderRight:`1px solid ${border}`,background:bg,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 14px",fontSize:11,fontWeight:800,color:blue,textTransform:"uppercase",letterSpacing:".06em",borderBottom:`1px solid ${border}`}}>
            Boîtes
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {authorizedMailboxes.map(box => (
              <button
                key={box}
                onClick={() => { setSelectedBox(box); setMobileView("list"); }}
                style={{
                  display:"block",width:"100%",textAlign:"left",
                  padding:"10px 14px",border:"none",cursor:"pointer",
                  background: selectedBox===box ? "white" : "transparent",
                  borderLeft: selectedBox===box ? `3px solid ${navy}` : "3px solid transparent",
                  color: selectedBox===box ? navy : "#5a6080",
                  fontSize:12,fontWeight: selectedBox===box ? 700 : 500,
                  transition:"all .15s",
                }}
              >
                {getMailboxLabel(box)}
              </button>
            ))}
          </div>
        </div>

        {/* ── COLONNE CENTRE : Liste messages ── */}
        <div style={{width:280,minWidth:220,borderRight:`1px solid ${border}`,display:"flex",flexDirection:"column",background:"white"}}>
          <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${border}`}}>
            <span style={{fontSize:12,fontWeight:700,color:navy}}>
              {selectedBox ? getMailboxLabel(selectedBox) : "—"}
            </span>
            {selectedBox && (
              <button
                onClick={() => loadMessages(selectedBox)}
                style={{border:"none",background:"none",cursor:"pointer",color:blue,fontSize:13}}
                title="Actualiser"
              >⟳</button>
            )}
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {msgLoading && (
              <div style={{padding:20,textAlign:"center",color:blue,fontSize:13}}>Chargement…</div>
            )}
            {!msgLoading && messages.length === 0 && (
              <div style={{padding:20,textAlign:"center",color:"#aaa",fontSize:13}}>Aucun message</div>
            )}
            {!msgLoading && messages.map(msg => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg)}
                style={{
                  display:"block",width:"100%",textAlign:"left",padding:"10px 14px",
                  border:"none",borderBottom:`1px solid ${border}`,cursor:"pointer",
                  background: selected?.id===msg.id ? "#eef1fc" : "white",
                  transition:"background .1s",
                }}
              >
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:4,marginBottom:3}}>
                  <span style={{fontSize:11,fontWeight: msg.isRead?500:700,color: msg.isRead?"#5a6080":navy,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",flex:1}}>
                    {msg.from.emailAddress.name || msg.from.emailAddress.address}
                  </span>
                  <span style={{fontSize:10,color:"#aaa",whiteSpace:"nowrap",flexShrink:0}}>{fmt(msg.receivedDateTime)}</span>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  {!msg.isRead && <span style={{width:6,height:6,borderRadius:"50%",background:navy,display:"inline-block",flexShrink:0}} />}
                  {isGrievanceEmail(msg.subject) && (
                    <span style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:"#fff3cd",color:"#856404",fontWeight:700,border:"1px solid #ffc107",flexShrink:0}}>Doléance</span>
                  )}
                  <span style={{fontSize:11,color:"#5a6080",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",fontWeight: msg.isRead?400:600}}>
                    {msg.subject || "(sans objet)"}
                  </span>
                </div>
                <div style={{fontSize:10,color:"#aaa",marginTop:2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                  {msg.bodyPreview}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── COLONNE DROITE : Lecteur ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          {!selected && (
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#aaa",flexDirection:"column",gap:10}}>
              <div style={{fontSize:40}}>✉️</div>
              <div style={{fontSize:13}}>Sélectionnez un message</div>
            </div>
          )}
          {selected && (
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* En-tête message */}
              <div style={{padding:"14px 18px",borderBottom:`1px solid ${border}`,background:bg}}>
                <div style={{fontWeight:800,color:navy,fontSize:15,marginBottom:6,lineHeight:1.3}}>
                  {detail?.subject || selected.subject || "(sans objet)"}
                  {isGrievanceEmail(detail?.subject ?? selected.subject) && (
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:"#fff3cd",color:"#856404",fontWeight:700,border:"1px solid #ffc107",marginLeft:8,verticalAlign:"middle"}}>Doléance</span>
                  )}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",fontSize:12}}>
                  <div style={{color:"#5a6080"}}>
                    De : <strong style={{color:navy}}>{(detail??selected).from.emailAddress.name || (detail??selected).from.emailAddress.address}</strong>
                    {" "}<span style={{color:"#aaa"}}>{"<"}{(detail??selected).from.emailAddress.address}{">"}</span>
                  </div>
                  <div style={{color:"#aaa",marginLeft:"auto"}}>{fmt(selected.receivedDateTime)}</div>
                </div>
                {/* Actions */}
                <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                  <button onClick={() => { setReplyOpen(r=>!r); setFwdOpen(false); }} style={btnSm(navy)}>
                    ↩ Répondre
                  </button>
                  <button onClick={() => { setFwdOpen(r=>!r); setReplyOpen(false); }} style={btnSm(blue)}>
                    → Transférer
                  </button>
                  {selected.hasAttachments && (
                    <span style={{fontSize:11,color:"#aaa",alignSelf:"center"}}>📎 Pièces jointes</span>
                  )}
                </div>
              </div>

              {/* Corps */}
              <div className="em-reading-zone" style={{flex:1,overflowY:"auto",padding:"18px"}}>
                {detLoading && <div style={{color:blue,fontSize:13}}>Chargement du message…</div>}
                {!detLoading && detail?.body && (
                  detail.body.contentType === "HTML"
                    ? <div className="em-reading-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(detail.body.content) }} style={{lineHeight:1.65,color:"#2d3748",maxWidth:680}} />
                    : <pre className="em-reading-text" style={{fontFamily:"inherit",whiteSpace:"pre-wrap",color:"#2d3748"}}>{detail.body.content}</pre>
                )}
                {!detLoading && !detail && (
                  <div className="em-reading-text" style={{color:"#aaa"}}>{selected.bodyPreview}</div>
                )}
              </div>

              {/* Répondre */}
              {replyOpen && (
                <div style={{borderTop:`1px solid ${border}`,padding:14,background:bg}}>
                  <div style={{fontSize:12,fontWeight:700,color:navy,marginBottom:6}}>↩ Répondre</div>
                  <textarea
                    rows={4} value={replyText} onChange={e=>setReplyText(e.target.value)}
                    placeholder="Votre réponse…"
                    style={{width:"100%",borderRadius:8,border:`1px solid ${border}`,padding:"8px 10px",fontSize:13,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                  />
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <button onClick={sendReply} disabled={replySending||!replyText.trim()} style={btnPrimary(replySending)}>
                      {replySending?"Envoi…":"Envoyer"}
                    </button>
                    <button onClick={()=>{setReplyOpen(false);setReplyText("");}} style={btnGhost()}>Annuler</button>
                  </div>
                </div>
              )}

              {/* Transférer */}
              {fwdOpen && (
                <div style={{borderTop:`1px solid ${border}`,padding:14,background:bg}}>
                  <div style={{fontSize:12,fontWeight:700,color:navy,marginBottom:6}}>→ Transférer vers une boîte ARC</div>
                  <select
                    value={fwdTo} onChange={e=>setFwdTo(e.target.value)}
                    style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${border}`,fontSize:13,marginBottom:8,fontFamily:"inherit",outline:"none"}}
                  >
                    <option value="">— Choisir une boîte —</option>
                    {ALL_DESTINATIONS.filter(d => d !== selectedBox).map(d => (
                      <option key={d} value={d}>{getMailboxLabel(d)}</option>
                    ))}
                  </select>
                  <textarea
                    rows={2} value={fwdText} onChange={e=>setFwdText(e.target.value)}
                    placeholder="Note de transfert (facultatif)"
                    style={{width:"100%",borderRadius:8,border:`1px solid ${border}`,padding:"8px 10px",fontSize:13,resize:"none",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                  />
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <button onClick={sendForward} disabled={fwdSending||!fwdTo} style={btnPrimary(fwdSending)}>
                      {fwdSending?"Transfert…":"Transférer"}
                    </button>
                    <button onClick={()=>{setFwdOpen(false);setFwdTo("");setFwdText("");}} style={btnGhost()}>Annuler</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal nouveau message ── */}
      {newOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:16,padding:24,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{fontWeight:800,color:navy,fontSize:15,marginBottom:16,fontFamily:"Playfair Display,serif"}}>✏️ Nouveau message</div>

            <label style={labelSt}>De (boîte expéditrice)</label>
            <select value={selectedBox??""} onChange={e=>setSelectedBox(e.target.value)} style={inputSt}>
              {authorizedMailboxes.map(b => <option key={b} value={b}>{getMailboxLabel(b)}</option>)}
            </select>

            <label style={labelSt}>À (destinataire)</label>
            <input type="email" value={newTo} onChange={e=>setNewTo(e.target.value)} placeholder="email@exemple.com" style={inputSt} />

            <label style={labelSt}>Objet</label>
            <input type="text" value={newSubject} onChange={e=>setNewSubject(e.target.value)} placeholder="Objet du message" style={inputSt} />

            <label style={labelSt}>Message</label>
            <textarea rows={5} value={newBody} onChange={e=>setNewBody(e.target.value)} placeholder="Votre message…"
              style={{...inputSt,resize:"vertical" as const,height:120}} />

            <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
              <button onClick={()=>{setNewOpen(false);setNewTo("");setNewSubject("");setNewBody("");}} style={btnGhost()}>Annuler</button>
              <button onClick={sendNew} disabled={newSending||!newTo||!newSubject||!newBody} style={btnPrimary(newSending)}>
                {newSending?"Envoi…":"Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────
const white = "white";
const transparent = "transparent";

function btnSm(color: string): React.CSSProperties {
  return {padding:"5px 12px",borderRadius:7,border:`1.5px solid ${color}`,background:"white",color,fontSize:12,fontWeight:700,cursor:"pointer"};
}
function btnPrimary(disabled: boolean): React.CSSProperties {
  return {padding:"7px 18px",borderRadius:8,border:"none",background:disabled?"#ccc":"#2B3475",color:"white",fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer"};
}
function btnGhost(): React.CSSProperties {
  return {padding:"7px 14px",borderRadius:8,border:"1px solid #e8eaf2",background:"white",color:"#5a6080",fontSize:13,fontWeight:600,cursor:"pointer"};
}
const labelSt: React.CSSProperties = {display:"block",fontSize:11,fontWeight:700,color:"#5a6080",marginBottom:4,marginTop:10};
const inputSt: React.CSSProperties = {display:"block",width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #e8eaf2",fontSize:13,fontFamily:"Outfit,sans-serif",outline:"none",boxSizing:"border-box"};

// Nettoie le HTML des emails (retire scripts/objets dangereux)
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
