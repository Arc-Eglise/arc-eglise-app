"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createFormation, updateFormation, enrollMembers, unenrollMember, deleteFormation,
  setFormationDaysCompleted,
} from "@/lib/actions/formations";
import { WEEKDAYS, formationLocation, type Formation, type FormationStatus } from "@/lib/formations-constants";

type Member = { id: string; name: string; avatarUrl: string | null };

const fmtDate = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" }) : "—";
const DAY_LABEL: Record<string, string> = { lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim" };
const STATUS_LABEL: Record<FormationStatus, string> = { sera_present: "Sera présent", present: "Présent", sera_absent: "Sera absent", absent: "Absent" };
const STATUS_CLS: Record<FormationStatus, string> = {
  sera_present: "bg-[#dde9ff] text-[#000666]", present: "bg-[#dcfce7] text-green-700",
  sera_absent: "bg-[#fef3c7] text-[#b45309]", absent: "bg-[#fee2e2] text-red-600",
};
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export default function FormationsClient({
  initialFormations, initialEnrollments, initialCompleted, initialAttendance, members, canWrite, currentUserId,
}: {
  initialFormations: Formation[];
  initialEnrollments: Record<string, string[]>;
  initialCompleted: Record<string, Record<string, number>>;
  initialAttendance: Record<string, Record<string, FormationStatus>>;
  members: Member[];
  canWrite: boolean;
  currentUserId: string;
}) {
  const [, startT] = useTransition();
  const [formations, setFormations] = useState<Formation[]>(initialFormations);
  const [enroll, setEnroll] = useState<Record<string, string[]>>(initialEnrollments);
  const [completed, setCompleted] = useState<Record<string, Record<string, number>>>(initialCompleted);
  const attendance = initialAttendance;
  const memberMap = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);
  const memberName = (id: string) => memberMap[id]?.name ?? "Membre";

  // ── Formulaire de création ──
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [tStart, setTStart] = useState("");
  const [tEnd, setTEnd] = useState("");
  const [fMember, setFMember] = useState("");
  const [fExterne, setFExterne] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [totalDays, setTotalDays] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleDay = (d: string) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await createFormation({
      title, start_date: start || null, end_date: end || null,
      days, time_start: tStart || null, time_end: tEnd || null,
      formateur_member_id: fMember || null, formateur_externe: fExterne || null,
      recurring, total_days: totalDays ? Number(totalDays) : null, location: location || null,
    });
    setBusy(false);
    if ("data" in res && res.data) {
      setFormations(prev => [res.data!, ...prev]);
      setEnroll(prev => ({ ...prev, [res.data!.id]: [] }));
      setTitle(""); setStart(""); setEnd(""); setDays([]); setTStart(""); setTEnd(""); setFMember(""); setFExterne("");
      setRecurring(false); setTotalDays(""); setLocation(""); setOpen(false);
    } else if ("error" in res) {
      alert(res.error);
    }
  }

  /** Ajuste la progression (jours effectués) d'un membre — staff ou formateur. */
  function setDaysDone(f: Formation, mid: string, value: number) {
    const max = f.total_days ?? 365;
    const v = Math.max(0, Math.min(value, max));
    setCompleted(prev => ({ ...prev, [f.id]: { ...(prev[f.id] ?? {}), [mid]: v } }));
    startT(() => { void setFormationDaysCompleted(f.id, mid, v); });
  }

  function patchField(f: Formation, patch: Partial<Formation>) {
    setFormations(prev => prev.map(x => x.id === f.id ? { ...x, ...patch } : x));
    startT(() => { void updateFormation(f.id, patch); });
  }
  function addMember(f: Formation, mid: string) {
    if (!mid) return;
    setEnroll(prev => ({ ...prev, [f.id]: [...(prev[f.id] ?? []), mid] }));
    startT(() => { void enrollMembers(f.id, [mid]); });
  }
  function removeMember(f: Formation, mid: string) {
    setEnroll(prev => ({ ...prev, [f.id]: (prev[f.id] ?? []).filter(x => x !== mid) }));
    startT(() => { void unenrollMember(f.id, mid); });
  }
  function remove(f: Formation) {
    if (!confirm(`Supprimer la formation « ${f.title} » ?`)) return;
    setFormations(prev => prev.filter(x => x.id !== f.id));
    startT(() => { void deleteFormation(f.id); });
  }

  const inputCls = "px-3 py-2 rounded-lg border border-[#c6c5d4] bg-white text-sm outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666]";
  const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-[#454652] mb-1";

  return (
    <div>
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[40px] md:text-[48px] md:leading-[56px] md:tracking-[-0.02em] leading-tight font-bold text-[#000666]" style={{ fontFamily: '"Playfair Display", serif' }}>
            Formations
          </h1>
          <p className="text-[18px] text-[#454652] mt-2">Créez des formations et affectez-y des membres — ils passent au pipeline « Formation ».</p>
        </div>
        {canWrite && (
          <button onClick={() => setOpen(o => !o)}
            className="px-5 py-3 rounded-lg bg-[#000666] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1a237e] transition-colors shadow-sm inline-flex items-center gap-2 self-start">
            <span className="material-symbols-outlined text-[20px]">{open ? "close" : "add"}</span>
            {open ? "Fermer" : "Nouvelle formation"}
          </button>
        )}
      </div>

      {/* Formulaire de création */}
      {canWrite && open && (
        <div className="bg-white border border-[#c6c5d4] rounded-xl p-6 shadow-[0_4px_20px_rgba(30,36,100,0.05)] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Nom de la formation</label>
              <input className={`${inputCls} w-full`} value={title} onChange={e => setTitle(e.target.value)} placeholder="ex. École du dimanche — niveau 1" />
            </div>
            <div>
              <label className={labelCls}>Date de début</label>
              <input type="date" className={`${inputCls} w-full`} value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Date de fin</label>
              <input type="date" className={`${inputCls} w-full`} value={end} onChange={e => setEnd(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Jours de formation</label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(d => (
                  <button type="button" key={d} onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${days.includes(d) ? "bg-[#000666] text-white border-[#000666]" : "bg-white text-[#454652] border-[#c6c5d4] hover:border-[#000666]"}`}>
                    {DAY_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Heure de début</label>
              <input type="time" className={`${inputCls} w-full`} value={tStart} onChange={e => setTStart(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Heure de fin</label>
              <input type="time" className={`${inputCls} w-full`} value={tEnd} onChange={e => setTEnd(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Formateur — membre</label>
              <select className={`${inputCls} w-full`} value={fMember} onChange={e => setFMember(e.target.value)}>
                <option value="">— Aucun —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Formateur — pasteur externe</label>
              <input className={`${inputCls} w-full`} value={fExterne} onChange={e => setFExterne(e.target.value)} placeholder="Nom du pasteur externe (facultatif)" />
            </div>
            <div>
              <label className={labelCls}>Nombre de jours à faire</label>
              <input type="number" min={0} className={`${inputCls} w-full`} value={totalDays} onChange={e => setTotalDays(e.target.value)} placeholder="ex. 10" />
            </div>
            <div>
              <label className={labelCls}>Lieu</label>
              <input className={`${inputCls} w-full`} value={location} onChange={e => setLocation(e.target.value)} placeholder="Église ARC (par défaut)" />
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="h-4 w-4 accent-[#000666]" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
                <span className="text-sm font-semibold text-[#191c1d]">Formation récurrente</span>
                <span className="text-[11px] text-[#767683]">(se répète chaque semaine sur les jours choisis)</span>
              </label>
            </div>
          </div>
          <p className="text-[11px] text-[#767683] mt-3">
            💡 La date de début peut être <strong>passée</strong> (formation déjà commencée) et les dates restent <strong>modifiables</strong> ensuite (ex. si la formation se prolonge).
            Le <strong>lieu</strong> par défaut est l&apos;Église ARC ; renseignez-le seulement s&apos;il est différent.
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={create} disabled={busy || !title.trim()}
              className="px-5 py-2.5 rounded-lg bg-[#000666] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1a237e] transition-colors disabled:opacity-50">
              {busy ? "Création…" : "Créer la formation"}
            </button>
            <button onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#454652] hover:text-[#000666]">Annuler</button>
          </div>
        </div>
      )}

      {/* Liste des formations */}
      {formations.length === 0 ? (
        <div className="bg-white border border-[#c6c5d4] rounded-xl py-14 text-center text-[#767683]">
          <span className="material-symbols-outlined text-[40px] mb-2">school</span>
          <div className="text-sm">Aucune formation pour le moment.{canWrite && " Cliquez sur « Nouvelle formation »."}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {formations.map(f => {
            const enrolled = enroll[f.id] ?? [];
            const available = members.filter(m => !enrolled.includes(m.id));
            return (
              <div key={f.id} className="bg-white border border-[#c6c5d4] rounded-xl p-6 shadow-[0_4px_20px_rgba(30,36,100,0.05)] flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[22px] leading-tight text-[#000666]" style={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>{f.title}</h3>
                  {canWrite && (
                    <button onClick={() => remove(f)} title="Supprimer" className="text-[#767683] hover:text-[#ba1a1a] transition-colors flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
                </div>

                {/* Dates (modifiables) */}
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className={labelCls}>Début</label>
                    {canWrite
                      ? <input type="date" className={inputCls} value={f.start_date ?? ""} onChange={e => patchField(f, { start_date: e.target.value || null })} />
                      : <div className="text-sm text-[#191c1d]">{fmtDate(f.start_date)}</div>}
                  </div>
                  <div>
                    <label className={labelCls}>Fin</label>
                    {canWrite
                      ? <input type="date" className={inputCls} value={f.end_date ?? ""} onChange={e => patchField(f, { end_date: e.target.value || null })} />
                      : <div className="text-sm text-[#191c1d]">{fmtDate(f.end_date)}</div>}
                  </div>
                </div>

                {/* Jours & horaires */}
                <div>
                  <label className={labelCls}>Jours &amp; horaires</label>
                  {canWrite ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAYS.map(d => {
                          const on = (f.days ?? []).includes(d);
                          return (
                            <button type="button" key={d}
                              onClick={() => patchField(f, { days: on ? (f.days ?? []).filter(x => x !== d) : [...(f.days ?? []), d] })}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${on ? "bg-[#000666] text-white border-[#000666]" : "bg-white text-[#454652] border-[#c6c5d4] hover:border-[#000666]"}`}>
                              {DAY_LABEL[d]}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="time" className={inputCls} value={hhmm(f.time_start)} onChange={e => patchField(f, { time_start: e.target.value || null })} />
                        <span className="text-[#767683]">→</span>
                        <input type="time" className={inputCls} value={hhmm(f.time_end)} onChange={e => patchField(f, { time_end: e.target.value || null })} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[#191c1d]">
                      {(f.days ?? []).length ? (f.days ?? []).map(d => DAY_LABEL[d] ?? d).join(", ") : "—"}
                      {(f.time_start || f.time_end) ? ` · ${hhmm(f.time_start) || "?"}–${hhmm(f.time_end) || "?"}` : ""}
                    </div>
                  )}
                </div>

                {/* Formateur */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[180px]">
                    <label className={labelCls}>Formateur (membre)</label>
                    {canWrite ? (
                      <select className={`${inputCls} w-full`} value={f.formateur_member_id ?? ""} onChange={e => patchField(f, { formateur_member_id: e.target.value || null })}>
                        <option value="">— Aucun —</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    ) : (
                      <div className="text-sm text-[#191c1d]">{f.formateur_member_id ? memberName(f.formateur_member_id) : "—"}</div>
                    )}
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <label className={labelCls}>Formateur (pasteur externe)</label>
                    {canWrite ? (
                      <input className={`${inputCls} w-full`} defaultValue={f.formateur_externe ?? ""}
                        onBlur={e => { if ((e.target.value || null) !== (f.formateur_externe ?? null)) patchField(f, { formateur_externe: e.target.value || null }); }}
                        placeholder="Nom (facultatif)" />
                    ) : (
                      <div className="text-sm text-[#191c1d]">{f.formateur_externe || "—"}</div>
                    )}
                  </div>
                </div>

                {/* Lieu · objectif de jours · récurrence */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[180px] flex-1">
                    <label className={labelCls}>Lieu</label>
                    {canWrite ? (
                      <input className={`${inputCls} w-full`} defaultValue={f.location ?? ""}
                        onBlur={e => { if ((e.target.value || null) !== (f.location ?? null)) patchField(f, { location: e.target.value || null }); }}
                        placeholder="Église ARC (par défaut)" />
                    ) : (
                      <div className="text-sm text-[#191c1d]">{formationLocation(f.location)}</div>
                    )}
                  </div>
                  <div className="w-[150px]">
                    <label className={labelCls}>Jours à faire</label>
                    {canWrite ? (
                      <input type="number" min={0} className={`${inputCls} w-full`} value={f.total_days ?? ""}
                        onChange={e => patchField(f, { total_days: e.target.value ? Number(e.target.value) : null })} placeholder="—" />
                    ) : (
                      <div className="text-sm text-[#191c1d]">{f.total_days ?? "—"}</div>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none pb-2">
                    <input type="checkbox" className="h-4 w-4 accent-[#000666]" checked={f.recurring}
                      disabled={!canWrite} onChange={e => patchField(f, { recurring: e.target.checked })} />
                    <span className="text-xs font-semibold text-[#191c1d]">Récurrente</span>
                  </label>
                </div>

                {/* Membres inscrits + progression (jours effectués / à faire) */}
                <div>
                  <label className={labelCls}>Membres inscrits ({enrolled.length})</label>
                  {enrolled.length === 0 ? (
                    <span className="text-sm text-[#767683]">Aucun membre inscrit.</span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {enrolled.map(mid => {
                        const st = attendance[f.id]?.[mid];
                        const done = completed[f.id]?.[mid] ?? 0;
                        const total = f.total_days ?? null;
                        const pct = total && total > 0 ? Math.round((done / total) * 100) : 0;
                        const canEditProgress = canWrite || f.formateur_member_id === currentUserId;
                        return (
                          <div key={mid} className="flex items-center gap-2 bg-[#f6f6fb] border border-[#eceef7] rounded-lg px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-[#191c1d] truncate">{memberName(mid)}</span>
                                {st && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_CLS[st]}`}>{STATUS_LABEL[st]}</span>}
                              </div>
                              {total ? (
                                <div className="mt-1 flex items-center gap-2">
                                  <div className="h-1.5 flex-1 rounded-full bg-[#e2e2ee] overflow-hidden">
                                    <div className="h-full rounded-full bg-[#000666]" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[11px] font-bold text-[#000666] whitespace-nowrap">{done}/{total} j</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-[#767683] mt-0.5">{done} jour(s) effectué(s)</div>
                              )}
                            </div>
                            {canEditProgress && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => setDaysDone(f, mid, done - 1)} disabled={done <= 0}
                                  title="Retirer un jour" className="w-6 h-6 rounded-md border border-[#c6c5d4] text-[#454652] hover:border-[#000666] disabled:opacity-40 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[16px]">remove</span>
                                </button>
                                <button onClick={() => setDaysDone(f, mid, done + 1)} disabled={total != null && done >= total}
                                  title="Valider un jour effectué" className="w-6 h-6 rounded-md bg-[#000666] text-white hover:bg-[#1a237e] disabled:opacity-40 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                              </div>
                            )}
                            {canWrite && (
                              <button onClick={() => removeMember(f, mid)} title="Retirer de la formation" className="text-[#767683] hover:text-[#ba1a1a] flex-shrink-0">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Affecter un membre */}
                {canWrite && (
                  <div>
                    <label className={labelCls}>Affecter un membre</label>
                    <select
                      className={`${inputCls} w-full`}
                      value=""
                      onChange={e => { addMember(f, e.target.value); e.currentTarget.value = ""; }}
                    >
                      <option value="">＋ Ajouter un membre…</option>
                      {available.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
