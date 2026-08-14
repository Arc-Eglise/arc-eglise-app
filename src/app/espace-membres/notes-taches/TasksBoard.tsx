"use client";

import { useMemo, useRef, useState } from "react";
import { createTask, updateTask, deleteTask, listTasks, assignTask, setAssignedStatus } from "@/lib/actions/tasks";
import { type TaskRow, type TaskStatus, type TaskPriority, type TagRow } from "@/lib/notes-taches/types";
import { RECURRENCE_PRESETS, recurrenceLabel } from "@/lib/tasks/recurrence";
import type { AssignableMember } from "./NotesTachesClient";
import ShareModal from "./ShareModal";
import TagBar from "./TagBar";

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  a_faire:  { label: "À faire",  color: "#5c6280", bg: "#eef1f8" },
  en_cours: { label: "En cours", color: "#1e6bff", bg: "#dde9ff" },
  bloque:   { label: "Bloqué",   color: "#c2410c", bg: "#ffe9db" },
  termine:  { label: "Terminé",  color: "#15803d", bg: "#dcfce7" },
};
const PRIORITY_META: Record<string, { label: string; color: string; flag: string }> = {
  haute:   { label: "Haute",   color: "#dc2626", flag: "🔴" },
  moyenne: { label: "Moyenne", color: "#d97706", flag: "🟠" },
  basse:   { label: "Basse",   color: "#2563eb", flag: "🔵" },
};
const STATUS_ORDER: TaskStatus[] = ["a_faire", "en_cours", "bloque", "termine"];
const NEXT_STATUS: Record<string, TaskStatus> = {
  a_faire: "en_cours", en_cours: "termine", termine: "a_faire", bloque: "a_faire",
};

type Filter = "all" | "actives" | TaskStatus;

export default function TasksBoard({
  initialTasks, allTags, initialTagMap, onTagCreated, members = [], assignableMembers = [], currentUserId,
}: {
  initialTasks: TaskRow[];
  allTags: TagRow[];
  initialTagMap: Record<string, string[]>;
  onTagCreated: (t: TagRow) => void;
  members?: AssignableMember[];
  assignableMembers?: AssignableMember[];
  currentUserId: string;
}) {
  const memberMap = useMemo(() => {
    const m: Record<string, AssignableMember> = {};
    for (const x of members) m[x.id] = x;
    return m;
  }, [members]);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [tagMap, setTagMap] = useState<Record<string, string[]>>(initialTagMap);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("actives");

  // Formulaire de saisie rapide
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("moyenne");
  const [dueAt, setDueAt] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [sharing, setSharing] = useState<TaskRow | null>(null);
  // Ajout de sous-tâche : id de la tâche parente ciblée
  const [subFor, setSubFor] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState("");
  const quickAddRef = useRef<HTMLInputElement | null>(null);

  // Racines : mes tâches sans parent + toute tâche qui m'est ATTRIBUÉE (owner ≠ moi)
  const roots = useMemo(
    () => tasks.filter(t => (t.owner_id === currentUserId ? !t.parent_task_id : true)),
    [tasks, currentUserId],
  );
  // Sous-tâches : uniquement dans MES propres tâches
  const childrenOf = (id: string) => tasks.filter(t => t.owner_id === currentUserId && t.parent_task_id === id);

  function matches(t: TaskRow) {
    const q = search.toLowerCase();
    if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
    if (filter === "all") return true;
    if (filter === "actives") return t.status !== "termine";
    return t.status === filter;
  }

  const visibleRoots = roots.filter(r => matches(r) || childrenOf(r.id).some(matches));

  /* ── Actions ── */
  async function addTask() {
    const t = title.trim();
    if (!t) return;
    const payload = { title: t, priority, due_at: dueAt || null, remind_at: dueAt || null, recurrence: recurrence || null };
    setTitle(""); setDueAt(""); setPriority("moyenne"); setRecurrence("");
    try {
      const res = await createTask(payload);
      if ("data" in res && res.data) { setTasks(prev => [res.data!, ...prev]); return; }
    } catch { /* cold-start 503 : l'insert a souvent réussi malgré l'erreur réseau */ }
    // Filet de sécurité : resynchronise depuis la base (l'appel a réchauffé la fonction)
    const fresh = await listTasks().catch(() => null);
    if (fresh && "data" in fresh && fresh.data) setTasks(fresh.data);
  }
  async function addSubtask(parentId: string) {
    const t = subTitle.trim();
    if (!t) { setSubFor(null); return; }
    const res = await createTask({ title: t, parent_task_id: parentId });
    if ("data" in res && res.data) setTasks(prev => [...prev, res.data!]);
    setSubTitle(""); setSubFor(null);
  }
  async function cycleStatus(t: TaskRow) {
    const next = NEXT_STATUS[t.status] ?? "a_faire";
    setTasks(prev => prev.map(x => x.id === t.id
      ? { ...x, status: next, completed_at: next === "termine" ? new Date().toISOString() : null }
      : x));
    if (t.owner_id === currentUserId) await updateTask(t.id, { status: next });
    else await setAssignedStatus(t.id, next); // tâche attribuée : je ne suis pas propriétaire
  }
  async function setStatus(t: TaskRow, status: TaskStatus) {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status } : x));
    if (t.owner_id === currentUserId) await updateTask(t.id, { status });
    else await setAssignedStatus(t.id, status);
  }
  async function setPrio(t: TaskRow, p: TaskPriority) {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, priority: p } : x));
    await updateTask(t.id, { priority: p });
  }
  async function setDue(t: TaskRow, due: string) {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, due_at: due || null } : x));
    await updateTask(t.id, { due_at: due || null });
  }
  async function setRemind(t: TaskRow, remind: string) {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, remind_at: remind || null, reminded_at: null } : x));
    await updateTask(t.id, { remind_at: remind || null });
  }
  async function setRecur(t: TaskRow, rrule: string) {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, recurrence: rrule || null } : x));
    await updateTask(t.id, { recurrence: rrule || null });
  }
  async function assign(t: TaskRow, assigneeId: string | null) {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, assignee_id: assigneeId } : x));
    await assignTask(t.id, assigneeId);
  }
  async function remove(t: TaskRow) {
    if (!confirm("Supprimer cette tâche" + (childrenOf(t.id).length ? " et ses sous-tâches ?" : " ?"))) return;
    const ids = new Set([t.id, ...childrenOf(t.id).map(c => c.id)]);
    setTasks(prev => prev.filter(x => !ids.has(x.id)));
    await deleteTask(t.id);
  }

  const counts = {
    actives: tasks.filter(t => t.status !== "termine").length,
    termine: tasks.filter(t => t.status === "termine").length,
  };

  return (
    <div>
      {/* Recherche + filtres (logique existante) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-[#c6c5d4] bg-white text-sm outline-none focus:border-[#000666] focus:ring-1 focus:ring-[#000666] transition-colors"
        />
        <FilterChip active={filter === "actives"} onClick={() => setFilter("actives")}>Actives ({counts.actives})</FilterChip>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Toutes</FilterChip>
        {STATUS_ORDER.map(s => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_META[s].label}</FilterChip>
        ))}
      </div>

      {/* Carte Tâches — portage maquette (shadow-ambient) */}
      <div className="bg-white rounded-xl p-6 shadow-[0_4px_20px_rgba(26,35,126,0.05)] flex flex-col gap-4">
        {/* Saisie rapide (input pointillés maquette) */}
        <div className="relative">
          <input
            ref={quickAddRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTask(); }}
            placeholder="Ajouter une tâche rapide…"
            className="w-full bg-[#f3f4f5] border border-dashed border-[#c6c5d4] rounded-lg px-4 py-2 pr-10 text-sm italic outline-none focus:border-[#000666] focus:ring-0 transition-all"
          />
          <button onClick={addTask} title="Ajouter" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#767683] hover:text-[#000666] transition-colors flex">
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
        {/* Options rapides réelles : priorité · échéance(=rappel) · récurrence */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} title="Priorité"
            className="px-2 py-1.5 rounded-lg border border-[#c6c5d4] bg-[#f3f4f5] text-xs outline-none focus:border-[#000666] text-[#454652]"
          >
            <option value="haute">🔴 Haute</option>
            <option value="moyenne">🟠 Moyenne</option>
            <option value="basse">🔵 Basse</option>
          </select>
          <input
            type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
            title="Échéance (= rappel)"
            className="px-2 py-1.5 rounded-lg border border-[#c6c5d4] bg-[#f3f4f5] text-xs outline-none focus:border-[#000666] text-[#454652]"
          />
          <select
            value={recurrence} onChange={e => setRecurrence(e.target.value)} title="Récurrence"
            className="px-2 py-1.5 rounded-lg border border-[#c6c5d4] bg-[#f3f4f5] text-xs outline-none focus:border-[#000666] text-[#454652]"
          >
            {RECURRENCE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label === "Ne pas répéter" ? "🔁 —" : `🔁 ${p.label}`}</option>)}
          </select>
        </div>

        {/* Liste */}
        {visibleRoots.length === 0 ? (
          <div className="text-center py-12 text-[#767683]">
            <span className="material-symbols-outlined text-[40px] mb-2">task_alt</span>
            <div className="font-semibold text-[#000666] mb-1">Aucune tâche</div>
            <div className="text-sm">{search || filter !== "actives" ? "Aucun résultat." : "Ajoute ta première tâche ci-dessus."}</div>
          </div>
        ) : (
          <div className="flex flex-col">
            {visibleRoots.map(t => t.owner_id !== currentUserId ? (
              /* Tâche qui m'est ATTRIBUÉE : carte lecture (statut seulement) */
              <div key={t.id}>
                <TaskItem
                  t={t}
                  assignedView
                  ownerName={memberMap[t.owner_id]?.name}
                  onCycle={() => cycleStatus(t)}
                  onStatus={(s) => setStatus(t, s)}
                  onPrio={() => {}}
                  onDue={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ) : (
              <div key={t.id}>
                <TaskItem
                  t={t}
                  onCycle={() => cycleStatus(t)}
                  onStatus={(s) => setStatus(t, s)}
                  onPrio={(p) => setPrio(t, p)}
                  onDue={(d) => setDue(t, d)}
                  onRemind={(d) => setRemind(t, d)}
                  onRecur={(r) => setRecur(t, r)}
                  onDelete={() => remove(t)}
                  onShare={() => setSharing(t)}
                  onAddSub={() => { setSubFor(subFor === t.id ? null : t.id); setSubTitle(""); }}
                  allTags={allTags}
                  tagIds={tagMap[t.id] ?? []}
                  onTagChange={(ids) => setTagMap(m => ({ ...m, [t.id]: ids }))}
                  onTagCreated={onTagCreated}
                  assignee={t.assignee_id ? memberMap[t.assignee_id] : undefined}
                  assignableMembers={assignableMembers}
                  onAssign={(mid) => assign(t, mid)}
                />
                {/* Sous-tâches */}
                {childrenOf(t.id).length > 0 && (
                  <div className="ml-9 space-y-1 border-l-2 border-[#c6c5d4] pl-3 mb-1">
                    {childrenOf(t.id).map(c => (
                      <TaskItem
                        key={c.id} t={c} compact
                        onCycle={() => cycleStatus(c)}
                        onStatus={(s) => setStatus(c, s)}
                        onPrio={(p) => setPrio(c, p)}
                        onDue={(d) => setDue(c, d)}
                        onDelete={() => remove(c)}
                      />
                    ))}
                  </div>
                )}
                {/* Ajout sous-tâche */}
                {subFor === t.id && (
                  <div className="ml-9 mb-1 flex items-center gap-2 pl-3">
                    <input
                      autoFocus value={subTitle} onChange={e => setSubTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addSubtask(t.id); if (e.key === "Escape") setSubFor(null); }}
                      placeholder="Sous-tâche…"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#c6c5d4] bg-[#f3f4f5] text-sm outline-none focus:border-[#000666]"
                    />
                    <button onClick={() => addSubtask(t.id)} className="px-3 py-1.5 rounded-lg bg-[#000666] text-white text-xs font-bold">OK</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bouton bas — focus la saisie rapide (maquette : « Nouvelle Tâche ») */}
        <button
          onClick={() => quickAddRef.current?.focus()}
          className="mt-2 w-full py-2 border border-[#000666] text-[#000666] text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-[#000666] hover:text-white transition-all"
        >
          Nouvelle Tâche
        </button>
      </div>

      {sharing && (
        <ShareModal
          resourceType="task"
          resourceId={sharing.id}
          title={sharing.title}
          onClose={() => setSharing(null)}
        />
      )}
    </div>
  );
}

function TaskItem({
  t, compact = false, onCycle, onStatus, onPrio, onDue, onRemind, onRecur, onDelete, onShare, onAddSub,
  allTags, tagIds, onTagChange, onTagCreated, assignee, assignableMembers, onAssign, assignedView, ownerName,
}: {
  t: TaskRow; compact?: boolean;
  onCycle: () => void;
  onStatus: (s: TaskStatus) => void;
  onPrio: (p: TaskPriority) => void;
  onDue: (d: string) => void;
  onRemind?: (d: string) => void;
  onRecur?: (r: string) => void;
  onDelete: () => void;
  onShare?: () => void;
  onAddSub?: () => void;
  allTags?: TagRow[];
  tagIds?: string[];
  onTagChange?: (ids: string[]) => void;
  onTagCreated?: (t: TagRow) => void;
  assignee?: AssignableMember;
  assignableMembers?: AssignableMember[];
  onAssign?: (id: string | null) => void;
  assignedView?: boolean;
  ownerName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_META[t.status] ?? STATUS_META.a_faire;
  const pr = PRIORITY_META[t.priority] ?? PRIORITY_META.moyenne;
  const done = t.status === "termine";
  const overdue = t.due_at && !done && new Date(t.due_at) < new Date();
  const dueLocal    = t.due_at    ? new Date(t.due_at).toISOString().slice(0, 16) : "";
  const remindLocal = t.remind_at ? new Date(t.remind_at).toISOString().slice(0, 16) : "";
  const canDetails = !!(onRemind || onRecur);
  const dueLabel = t.due_at
    ? new Date(t.due_at).toLocaleString("fr-CH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  const remindLabel = t.remind_at
    ? new Date(t.remind_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`rounded-lg border border-transparent hover:border-[#c6c5d4] hover:bg-[#f3f4f5] transition-colors group ${compact ? "p-2" : "p-3"}`}>
      <div className="flex items-start gap-4">
        {/* Case à cocher (cycle de statut) — Material Symbols */}
        <button
          onClick={onCycle}
          title="Changer le statut"
          className="mt-0.5 flex-shrink-0 text-[#767683] group-hover:text-[#000666] transition-colors flex"
          style={done ? { color: st.color } : undefined}
        >
          <span className="material-symbols-outlined" style={done ? { fontVariationSettings: "'FILL' 1" } : undefined}>
            {done ? "check_box" : "check_box_outline_blank"}
          </span>
        </button>

        {/* Titre + méta */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-[13px] font-bold mb-0.5 ${done ? "line-through text-[#767683]" : "text-[#191c1d]"}`}>
            <span title={pr.label}>{pr.flag}</span> {t.title}
          </h4>
          {t.description && (
            <p className="text-[14px] text-[#454652] leading-snug">{t.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>
            {t.due_at && (
              <span className={`text-xs ${overdue ? "text-[#ba1a1a] font-bold" : "text-[#454652]"}`}>
                {dueLabel}{overdue && " · en retard"}
              </span>
            )}
            {t.recurrence && (
              <span className="text-[10px] text-[#000666] font-semibold">🔁 {recurrenceLabel(t.recurrence)}</span>
            )}
            {!assignedView && allTags && onTagChange && (
              <TagBar
                kind="task" resourceId={t.id} allTags={allTags}
                tagIds={tagIds ?? []} onChange={onTagChange}
                onCreated={onTagCreated ?? (() => {})}
              />
            )}
          </div>
          {t.remind_at && !t.reminded_at && (
            <div className="flex items-center gap-1 mt-1 text-[#000666]">
              <span className="material-symbols-outlined text-[14px]">notifications_active</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Rappel: {remindLabel}</span>
            </div>
          )}
          {assignedView ? (
            <div className="flex items-center gap-1 mt-1 text-[#775a19]">
              <span className="material-symbols-outlined text-[14px]">assignment_ind</span>
              <span className="text-[10px] font-semibold">Attribuée par {ownerName ?? "un membre"}</span>
            </div>
          ) : assignee ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-5 h-5 rounded-full bg-[#e0e0ff] text-[#000666] text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                {initialsOf(assignee.name)}
              </span>
              <span className="text-[10px] text-[#000666] font-semibold">Attribué à {assignee.name}</span>
            </div>
          ) : null}
        </div>

        {/* Contrôles — en vue attribuée : statut seulement ; sinon contrôles complets */}
        {assignedView ? (
          <div className="ml-auto flex-shrink-0">
            <select value={t.status} onChange={e => onStatus(e.target.value as TaskStatus)} title="Statut"
              className="text-[11px] rounded-md border border-[#c6c5d4] bg-white px-1 py-1 outline-none">
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </div>
        ) : (
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <select value={t.status} onChange={e => onStatus(e.target.value as TaskStatus)} title="Statut"
            className="text-[11px] rounded-md border border-[#c6c5d4] bg-white px-1 py-1 outline-none">
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <select value={t.priority} onChange={e => onPrio(e.target.value as TaskPriority)} title="Priorité"
            className="text-[11px] rounded-md border border-[#c6c5d4] bg-white px-1 py-1 outline-none">
            <option value="haute">🔴</option><option value="moyenne">🟠</option><option value="basse">🔵</option>
          </select>
          <input type="datetime-local" value={dueLocal} onChange={e => onDue(e.target.value)} title="Échéance"
            className="text-[11px] rounded-md border border-[#c6c5d4] bg-white px-1 py-1 outline-none w-[140px]" />
          {onAssign && assignableMembers && assignableMembers.length > 0 && (
            <select value={t.assignee_id ?? ""} onChange={e => onAssign(e.target.value || null)} title="Attribuer à un membre"
              className="text-[11px] rounded-md border border-[#c6c5d4] bg-white px-1 py-1 outline-none max-w-[130px]">
              <option value="">— Attribuer</option>
              {assignableMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          {canDetails && (
            <button onClick={() => setExpanded(e => !e)} title="Rappel & récurrence" className="text-[#454652] hover:text-[#000666] transition-colors flex"><span className="material-symbols-outlined text-[18px]">{expanded ? "expand_less" : "notifications"}</span></button>
          )}
          {onShare && <button onClick={onShare} title="Partager" className="text-[#454652] hover:text-[#000666] transition-colors flex"><span className="material-symbols-outlined text-[18px]">share</span></button>}
          {onAddSub && <button onClick={onAddSub} title="Ajouter une sous-tâche" className="text-[#454652] hover:text-[#000666] transition-colors flex"><span className="material-symbols-outlined text-[18px]">add_circle</span></button>}
          <button onClick={onDelete} title="Supprimer" className="text-[#454652] hover:text-[#ba1a1a] transition-colors flex"><span className="material-symbols-outlined text-[18px]">delete</span></button>
        </div>
        )}
      </div>

      {/* Détails : rappel + récurrence (édition après création) */}
      {expanded && canDetails && (
        <div className="mt-3 pt-3 border-t border-[#c6c5d4] flex flex-wrap items-center gap-4">
          {onRemind && (
            <label className="flex items-center gap-2 text-[11px] text-[#454652]">
              🔔 Rappel
              <input type="datetime-local" value={remindLocal} onChange={e => onRemind(e.target.value)}
                className="text-[11px] rounded-md border border-[#c6c5d4] bg-white px-2 py-1 outline-none" />
            </label>
          )}
          {onRecur && (
            <label className="flex items-center gap-2 text-[11px] text-[#454652]">
              🔁 Répéter
              <select value={t.recurrence ?? ""} onChange={e => onRecur(e.target.value)}
                className="text-[11px] rounded-md border border-[#c6c5d4] bg-white px-2 py-1 outline-none">
                {RECURRENCE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
        active ? "bg-[#000666] text-white" : "bg-[#edeeef] text-[#191c1d] hover:bg-[#e1e3e4]"
      }`}
    >
      {children}
    </button>
  );
}
