"use client"
import React, { useState, useEffect, useCallback } from "react"

/* ── Types ── */
interface SermonItem {
  id: string; title: string; pastor: string | null; date: string; has_summary: boolean
  pastor_member_id?: string | null; pastor_visitor_id?: string | null
}
interface SummaryForm {
  summary: string; key_verses: string[]; themes: string[]
}
interface ArcPastor {
  id: string; first_name: string | null; last_name: string | null; role: string
}
interface VisitingPastor {
  id: string; name: string; title: string; church?: string; city?: string; country?: string; notes?: string
}

type PastorSource = "arc" | "visitor" | "manual"

export function SermonSummariesManager() {
  /* ── Sermons ── */
  const [sermons, setSermons]         = useState<SermonItem[]>([])
  const [loading, setLoading]         = useState(false)
  const [selected, setSelected]       = useState<SermonItem | null>(null)
  const [form, setForm]               = useState<SummaryForm>({ summary: "", key_verses: [], themes: [] })
  const [editing, setEditing]         = useState(false)
  const [genLoading, setGenLoading]   = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [msg, setMsg]                 = useState<{ text: string; ok: boolean } | null>(null)
  const [newVerse, setNewVerse]       = useState("")
  const [newTheme, setNewTheme]       = useState("")

  /* ── Pasteurs ── */
  const [arcPastors, setArcPastors]     = useState<ArcPastor[]>([])
  const [visitors, setVisitors]         = useState<VisitingPastor[]>([])
  const [pastorsLoaded, setPastorsLoaded] = useState(false)
  const [pastorSource, setPastorSource] = useState<PastorSource>("manual")
  const [pastorMemberId, setPastorMemberId]   = useState<string>("")
  const [pastorVisitorId, setPastorVisitorId] = useState<string>("")
  const [pastorManual, setPastorManual]       = useState<string>("")
  const [pastorSaving, setPastorSaving] = useState(false)
  const [pastorMsg, setPastorMsg]       = useState<{ text: string; ok: boolean } | null>(null)

  /* ── Table pasteurs visiteurs ── */
  const [showVisitorPanel, setShowVisitorPanel] = useState(false)
  const [editingVisitor, setEditingVisitor] = useState<VisitingPastor | null>(null)
  const [newVisitor, setNewVisitor] = useState(false)
  const [visitorForm, setVisitorForm] = useState<Omit<VisitingPastor, "id">>({
    name: "", title: "Pasteur", church: "", city: "", country: "Suisse", notes: "",
  })
  const [visitorSaving, setVisitorSaving] = useState(false)

  /* ── API helper ── */
  const api = (action: string, extra: object = {}) =>
    fetch("/api/bible-ai/sermons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    }).then(r => r.json())

  /* ── Chargements ── */
  const loadSermons = useCallback(async () => {
    setLoading(true)
    const data = await api("list_sermons")
    setSermons(data.sermons ?? [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPastors = useCallback(async () => {
    if (pastorsLoaded) return
    const data = await api("list_pastors")
    setArcPastors(data.arc_pastors ?? [])
    setVisitors(data.visitors ?? [])
    setPastorsLoaded(true)
  }, [pastorsLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSermons() }, [loadSermons])

  /* ── Ouvrir un sermon ── */
  const openSermon = async (s: SermonItem) => {
    setSelected(s); setEditing(false); setMsg(null); setPastorMsg(null)
    setForm({ summary: "", key_verses: [], themes: [] })
    // Initialiser le panneau pasteur depuis le sermon
    if (s.pastor_member_id) { setPastorSource("arc"); setPastorMemberId(s.pastor_member_id); setPastorVisitorId(""); setPastorManual("") }
    else if (s.pastor_visitor_id) { setPastorSource("visitor"); setPastorVisitorId(s.pastor_visitor_id); setPastorMemberId(""); setPastorManual("") }
    else { setPastorSource("manual"); setPastorManual(s.pastor ?? ""); setPastorMemberId(""); setPastorVisitorId("") }
    loadPastors()
    if (s.has_summary) {
      const data = await api("get_summary", { sermon_id: s.id })
      if (data.summary) setForm({ summary: data.summary, key_verses: data.key_verses ?? [], themes: data.themes ?? [] })
    }
  }

  /* ── Résumé ── */
  const generate = async () => {
    if (!selected) return
    setGenLoading(true); setMsg(null)
    const r = await api("summarize", { sermon_id: selected.id, title: selected.title, pastor: selected.pastor })
    if (r.summary) {
      setForm({ summary: r.summary, key_verses: r.key_verses ?? [], themes: r.themes ?? [] })
      setEditing(true)
      setSermons(prev => prev.map(s => s.id === selected.id ? { ...s, has_summary: true } : s))
      setMsg({ text: "Résumé généré — vérifiez et sauvegardez", ok: true })
    } else {
      setMsg({ text: "Erreur : " + (r.error ?? "Génération échouée"), ok: false })
    }
    setGenLoading(false)
  }

  const save = async () => {
    if (!selected) return
    setSaveLoading(true); setMsg(null)
    const r = await api("update_summary", { sermon_id: selected.id, ...form })
    if (r.ok) {
      setEditing(false)
      setSermons(prev => prev.map(s => s.id === selected.id ? { ...s, has_summary: true } : s))
      setMsg({ text: "Sauvegardé ✓", ok: true })
    } else {
      setMsg({ text: "Erreur : " + (r.error ?? "inconnue"), ok: false })
    }
    setSaveLoading(false)
  }

  const deleteSummary = async () => {
    if (!selected || !window.confirm("Supprimer ce résumé ?")) return
    await api("delete_summary", { sermon_id: selected.id })
    setForm({ summary: "", key_verses: [], themes: [] })
    setEditing(false)
    setSermons(prev => prev.map(s => s.id === selected.id ? { ...s, has_summary: false } : s))
    setMsg({ text: "Résumé supprimé", ok: true })
  }

  /* ── Pasteur — assigner ── */
  const savePastor = async () => {
    if (!selected) return
    setPastorSaving(true); setPastorMsg(null)
    let pastor_name = ""
    let pastor_member_id: string | null = null
    let pastor_visitor_id: string | null = null

    if (pastorSource === "arc" && pastorMemberId) {
      const found = arcPastors.find(p => p.id === pastorMemberId)
      if (found) pastor_name = `Past. ${found.first_name ?? ""} ${found.last_name ?? ""}`.trim()
      pastor_member_id = pastorMemberId
    } else if (pastorSource === "visitor" && pastorVisitorId) {
      const found = visitors.find(v => v.id === pastorVisitorId)
      if (found) pastor_name = `${found.title} ${found.name}`.trim()
      pastor_visitor_id = pastorVisitorId
    } else {
      pastor_name = pastorManual.trim()
    }

    if (!pastor_name) { setPastorMsg({ text: "Veuillez sélectionner ou saisir un pasteur", ok: false }); setPastorSaving(false); return }

    const r = await api("assign_pastor", { sermon_id: selected.id, pastor_name, pastor_member_id, pastor_visitor_id })
    if (r.ok) {
      setSermons(prev => prev.map(s => s.id === selected.id ? { ...s, pastor: pastor_name, pastor_member_id, pastor_visitor_id } : s))
      setSelected(prev => prev ? { ...prev, pastor: pastor_name, pastor_member_id, pastor_visitor_id } : prev)
      setPastorMsg({ text: "Pasteur mis à jour ✓", ok: true })
    } else {
      setPastorMsg({ text: "Erreur : " + (r.error ?? "inconnue"), ok: false })
    }
    setPastorSaving(false)
  }

  /* ── Pasteurs visiteurs CRUD ── */
  const startAddVisitor = () => {
    setEditingVisitor(null)
    setVisitorForm({ name: "", title: "Pasteur", church: "", city: "", country: "Suisse", notes: "" })
    setNewVisitor(true)
  }
  const startEditVisitor = (v: VisitingPastor) => {
    setEditingVisitor(v)
    setVisitorForm({ name: v.name, title: v.title, church: v.church ?? "", city: v.city ?? "", country: v.country ?? "Suisse", notes: v.notes ?? "" })
    setNewVisitor(false)
  }
  const saveVisitor = async () => {
    setVisitorSaving(true)
    if (editingVisitor) {
      const r = await api("update_visiting_pastor", { id: editingVisitor.id, ...visitorForm })
      if (r.ok) {
        setVisitors(prev => prev.map(v => v.id === editingVisitor.id ? { ...v, ...visitorForm } : v))
        setEditingVisitor(null)
      }
    } else {
      const r = await api("add_visiting_pastor", visitorForm)
      if (r.pastor) {
        setVisitors(prev => [...prev, r.pastor])
        setNewVisitor(false)
        setVisitorForm({ name: "", title: "Pasteur", church: "", city: "", country: "Suisse", notes: "" })
      }
    }
    setVisitorSaving(false)
  }
  const deleteVisitor = async (id: string) => {
    if (!window.confirm("Supprimer ce pasteur visiteur ?")) return
    await api("delete_visiting_pastor", { id })
    setVisitors(prev => prev.filter(v => v.id !== id))
    if (pastorVisitorId === id) { setPastorVisitorId(""); setPastorSource("manual") }
  }

  /* ── Helpers tags ── */
  const addVerse  = () => { if (!newVerse.trim()) return; setForm(f => ({ ...f, key_verses: [...f.key_verses, newVerse.trim()] })); setNewVerse("") }
  const rmVerse   = (i: number) => setForm(f => ({ ...f, key_verses: f.key_verses.filter((_, j) => j !== i) }))
  const addTheme  = () => { if (!newTheme.trim()) return; setForm(f => ({ ...f, themes: [...f.themes, newTheme.trim()] })); setNewTheme("") }
  const rmTheme   = (i: number) => setForm(f => ({ ...f, themes: f.themes.filter((_, j) => j !== i) }))

  const hasSummary = selected && form.summary !== ""

  /* ══ RENDER ══════════════════════════════════════════════════ */
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#1e2464", marginBottom: 16 }}>📝 Gestion des Résumés IA</div>

      {loading && <div style={{ fontSize: 13, color: "#8899cc", marginBottom: 12 }}>Chargement…</div>}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

        {/* ── Liste sermons ── */}
        <div style={{ minWidth: 200, maxWidth: 240, flexShrink: 0 }}>
          {sermons.length === 0 && !loading && <p style={{ fontSize: 12, color: "#8899cc" }}>Aucun sermon publié</p>}
          {sermons.map(s => (
            <div key={s.id} onClick={() => openSermon(s)} style={{
              cursor: "pointer", padding: "9px 12px", borderRadius: 10, marginBottom: 6,
              background: selected?.id === s.id ? "#e8ecff" : "#f5f7ff",
              border: `1px solid ${selected?.id === s.id ? "#8899cc" : "#e0e4f0"}`,
            }}>
              <div style={{ fontWeight: 600, color: "#1e2464", fontSize: 12, marginBottom: 3, lineHeight: 1.3 }}>{s.title}</div>
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                {s.pastor && <span style={{ fontSize: 11, color: "#8899cc" }}>{s.pastor}</span>}
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: s.has_summary ? "#dcfce7" : "#fff3cd", color: s.has_summary ? "#15803d" : "#92400e", fontWeight: 600 }}>
                  {s.has_summary ? "✓" : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Panneau détail ── */}
        {selected && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "#1e2464", fontSize: 14, marginBottom: 2 }}>{selected.title}</div>
            <div style={{ fontSize: 12, color: "#8899cc", marginBottom: 14 }}>
              {new Date(selected.date).toLocaleDateString("fr-CH")}
            </div>

            {/* ── Section Pasteur ── */}
            <div style={{ background: "#f5f7ff", borderRadius: 10, padding: "14px 14px", border: "1px solid #e0e4f0", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#1e2464", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                👤 Pasteur du sermon
              </div>

              {selected.pastor && (
                <div style={{ fontSize: 12, color: "#1e2464", marginBottom: 10, padding: "6px 10px", background: "#e8ecff", borderRadius: 8, fontWeight: 600 }}>
                  Actuel : {selected.pastor}
                  {selected.pastor_member_id && <span style={{ fontSize: 10, color: "#8899cc", marginLeft: 6 }}>· Membre ARC</span>}
                  {selected.pastor_visitor_id && <span style={{ fontSize: 10, color: "#8899cc", marginLeft: 6 }}>· Visiteur</span>}
                </div>
              )}

              {/* Source toggle */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {(["arc", "visitor", "manual"] as PastorSource[]).map(src => (
                  <button key={src} onClick={() => setPastorSource(src)} style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600,
                    background: pastorSource === src ? "#1e2464" : "#e8ecff",
                    color: pastorSource === src ? "#fff" : "#1e2464",
                  }}>
                    {src === "arc" ? "🏛 Membre ARC" : src === "visitor" ? "✈️ Visiteur" : "✏️ Manuel"}
                  </button>
                ))}
              </div>

              {pastorSource === "arc" && (
                <select value={pastorMemberId} onChange={e => setPastorMemberId(e.target.value)} style={selectStyle}>
                  <option value="">— Choisir un pasteur ARC —</option>
                  {arcPastors.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}{p.role === "pasteur" ? " (Pasteur)" : " (Fonction)"}
                    </option>
                  ))}
                  {arcPastors.length === 0 && <option disabled>Aucun pasteur trouvé</option>}
                </select>
              )}

              {pastorSource === "visitor" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <select value={pastorVisitorId} onChange={e => setPastorVisitorId(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                    <option value="">— Choisir un pasteur visiteur —</option>
                    {visitors.map(v => (
                      <option key={v.id} value={v.id}>{v.title} {v.name}{v.church ? ` · ${v.church}` : ""}</option>
                    ))}
                    {visitors.length === 0 && <option disabled>Aucun visiteur enregistré</option>}
                  </select>
                  <button onClick={() => { setShowVisitorPanel(true); startAddVisitor() }} className="em-btn em-btn-outline em-btn-xs">
                    + Ajouter
                  </button>
                </div>
              )}

              {pastorSource === "manual" && (
                <input value={pastorManual} onChange={e => setPastorManual(e.target.value)} placeholder="Ex : Past. Pedro Obova"
                  style={inputStyle} />
              )}

              {pastorMsg && (
                <div style={{ fontSize: 11, color: pastorMsg.ok ? "#15803d" : "#dc2626", marginTop: 8 }}>{pastorMsg.text}</div>
              )}

              <button onClick={savePastor} disabled={pastorSaving} className="em-btn em-btn-sm" style={{ marginTop: 10 }}>
                {pastorSaving ? "Sauvegarde…" : "💾 Mettre à jour le pasteur"}
              </button>
            </div>

            {/* ── Messages statut ── */}
            {msg && (
              <div style={{ fontSize: 12, color: msg.ok ? "#15803d" : "#dc2626", marginBottom: 12, padding: "6px 10px", borderRadius: 8, background: msg.ok ? "#f0fdf4" : "#fef2f2" }}>
                {msg.text}
              </div>
            )}

            {/* ── Actions résumé ── */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {!editing && !hasSummary && (
                <button onClick={generate} className="em-btn em-btn-primary em-btn-sm" disabled={genLoading}>
                  {genLoading ? "Génération…" : "✦ Générer avec l'IA"}
                </button>
              )}
              {!editing && hasSummary && (
                <>
                  <button onClick={() => setEditing(true)} className="em-btn em-btn-sm">✏️ Modifier</button>
                  <button onClick={generate} className="em-btn em-btn-outline em-btn-sm" disabled={genLoading}>
                    {genLoading ? "…" : "↺ Régénérer"}
                  </button>
                  <button onClick={deleteSummary} className="em-btn em-btn-ghost em-btn-sm" style={{ color: "#dc2626" }}>🗑 Supprimer</button>
                </>
              )}
            </div>

            {/* ── Vue lecture résumé ── */}
            {!editing && hasSummary && (
              <div style={{ fontSize: 13 }}>
                <Label>Résumé</Label>
                <p style={{ color: "#334155", lineHeight: 1.65, marginBottom: 16, whiteSpace: "pre-line" }}>{form.summary}</p>

                {form.key_verses.length > 0 && (<>
                  <Label>Versets clés</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {form.key_verses.map((v, i) => <span key={i} style={tagStyle("#fef9ed", "#e8d5a3", "#1e2464")}>📖 {v}</span>)}
                  </div>
                </>)}

                {form.themes.length > 0 && (<>
                  <Label>Thèmes</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {form.themes.map((t, i) => <span key={i} style={tagStyle("#e8ecff", "#c7d0f0", "#1e2464")}>{t}</span>)}
                  </div>
                </>)}
              </div>
            )}

            {/* ── Mode édition résumé ── */}
            {editing && (
              <div style={{ fontSize: 13 }}>
                <div style={{ marginBottom: 16 }}>
                  <Label>Résumé</Label>
                  <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                    rows={6} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0d7e8", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Label>Versets clés</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {form.key_verses.map((v, i) => (
                      <span key={i} style={{ ...tagStyle("#fef9ed", "#e8d5a3", "#1e2464"), display: "flex", alignItems: "center", gap: 5 }}>
                        📖 {v} <button onClick={() => rmVerse(i)} style={rmBtnStyle}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newVerse} onChange={e => setNewVerse(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addVerse())}
                      placeholder="Ex : Jean 3:16" style={inputStyle} />
                    <button onClick={addVerse} className="em-btn em-btn-sm" style={{ padding: "4px 12px" }}>+</button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <Label>Thèmes</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {form.themes.map((t, i) => (
                      <span key={i} style={{ ...tagStyle("#e8ecff", "#c7d0f0", "#1e2464"), display: "flex", alignItems: "center", gap: 5 }}>
                        {t} <button onClick={() => rmTheme(i)} style={rmBtnStyle}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newTheme} onChange={e => setNewTheme(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTheme())}
                      placeholder="Ex : Grâce de Dieu" style={inputStyle} />
                    <button onClick={addTheme} className="em-btn em-btn-sm" style={{ padding: "4px 12px" }}>+</button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={save} className="em-btn em-btn-primary em-btn-sm" disabled={saveLoading}>
                    {saveLoading ? "Sauvegarde…" : "💾 Sauvegarder"}
                  </button>
                  <button onClick={() => setEditing(false)} className="em-btn em-btn-ghost em-btn-sm">Annuler</button>
                </div>
              </div>
            )}

            {!editing && !hasSummary && !genLoading && (
              <p style={{ fontSize: 13, color: "#8899cc" }}>Aucun résumé pour ce sermon. Cliquez &quot;Générer avec l&apos;IA&quot;.</p>
            )}
          </div>
        )}

        {!selected && !loading && sermons.length > 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120, color: "#8899cc", fontSize: 13 }}>
            ← Sélectionnez un sermon
          </div>
        )}
      </div>

      {/* ══ TABLE DES PASTEURS VISITEURS ══════════════════════ */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #e0e4f0" }}>
        <button onClick={() => { setShowVisitorPanel(v => !v); loadPastors() }}
          className="em-btn em-btn-ghost" style={{ color: "var(--navy,#1e2464)", fontWeight: 700, padding: 0, marginBottom: showVisitorPanel ? 14 : 0, fontSize: 13 }}>
          ✈️ Pasteurs visiteurs
          <span style={{ fontSize: 11, color: "#8899cc", fontWeight: 400 }}>({visitors.length} enregistré{visitors.length !== 1 ? "s" : ""})</span>
          <span style={{ fontSize: 12, color: "#8899cc" }}>{showVisitorPanel ? "▲" : "▼"}</span>
        </button>

        {showVisitorPanel && (
          <div>
            {/* Liste */}
            {visitors.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "4px 8px", fontSize: 11, fontWeight: 700, color: "#8899cc", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, padding: "0 8px" }}>
                  <span>Nom</span><span>Église</span><span>Ville / Pays</span><span></span>
                </div>
                {visitors.map(v => (
                  <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "4px 8px", fontSize: 12, padding: "9px 8px", borderRadius: 8, marginBottom: 4, background: editingVisitor?.id === v.id ? "#e8ecff" : "#f5f7ff", border: "1px solid #e0e4f0", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "#1e2464" }}>{v.title} {v.name}</span>
                    <span style={{ color: "#8899cc" }}>{v.church ?? "—"}</span>
                    <span style={{ color: "#8899cc" }}>{[v.city, v.country].filter(Boolean).join(", ") || "—"}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => startEditVisitor(v)} className="em-btn em-btn-outline em-btn-xs">✏️</button>
                      <button onClick={() => deleteVisitor(v.id)} className="em-btn em-btn-danger em-btn-xs">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulaire ajout / édition */}
            {(newVisitor || editingVisitor) && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: "#15803d", fontSize: 12, marginBottom: 12 }}>
                  {editingVisitor ? "✏️ Modifier le pasteur visiteur" : "➕ Nouveau pasteur visiteur"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <Label>Titre</Label>
                    <select value={visitorForm.title} onChange={e => setVisitorForm(f => ({ ...f, title: e.target.value }))} style={selectStyle}>
                      {["Pasteur", "Évangéliste", "Apôtre", "Prophète", "Docteur", "Évêque", "Diacre", "Frère"].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Nom complet *</Label>
                    <input value={visitorForm.name} onChange={e => setVisitorForm(f => ({ ...f, name: e.target.value }))} placeholder="Prénom Nom" style={inputStyle} />
                  </div>
                  <div>
                    <Label>Église / Ministère</Label>
                    <input value={visitorForm.church ?? ""} onChange={e => setVisitorForm(f => ({ ...f, church: e.target.value }))} placeholder="Nom de l'église" style={inputStyle} />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <input value={visitorForm.city ?? ""} onChange={e => setVisitorForm(f => ({ ...f, city: e.target.value }))} placeholder="Ville" style={inputStyle} />
                  </div>
                  <div>
                    <Label>Pays</Label>
                    <input value={visitorForm.country ?? ""} onChange={e => setVisitorForm(f => ({ ...f, country: e.target.value }))} placeholder="Pays" style={inputStyle} />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <input value={visitorForm.notes ?? ""} onChange={e => setVisitorForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (facultatif)" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveVisitor} className="em-btn em-btn-primary em-btn-sm" disabled={visitorSaving || !visitorForm.name.trim()}>
                    {visitorSaving ? "Sauvegarde…" : "💾 Sauvegarder"}
                  </button>
                  <button onClick={() => { setEditingVisitor(null); setNewVisitor(false) }} className="em-btn em-btn-ghost em-btn-sm">Annuler</button>
                </div>
              </div>
            )}

            {!newVisitor && !editingVisitor && (
              <button onClick={startAddVisitor} className="em-btn em-btn-outline em-btn-sm">
                + Ajouter un pasteur visiteur
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Helpers styles ── */
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 700, color: "var(--navy,#1e2464)", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 5 }}>{children}</div>
}
function tagStyle(bg: string, border: string, color: string): React.CSSProperties {
  return { fontSize: 12, background: bg, border: `1px solid ${border}`, color, padding: "3px 10px", borderRadius: 999 }
}
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #d0d7e8", fontSize: 12, outline: "none", boxSizing: "border-box",
}
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #d0d7e8", fontSize: 12, outline: "none", background: "#fff",
}
const rmBtnStyle: React.CSSProperties = {
  border: "none", background: "none", cursor: "pointer", color: "#dc2626", fontSize: 13, lineHeight: 1, padding: 0,
}
