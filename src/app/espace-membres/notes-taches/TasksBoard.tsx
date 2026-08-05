"use client";

import { useMemo, useState } from "react";
import { createTask, updateTask, deleteTask, listTasks } from "@/lib/actions/tasks";
import { type TaskRow, type TaskStatus, type TaskPriority, type TagRow } from "@/lib/notes-taches/types";
import { RECURRENCE_PRESETS, recurrenceLabel } from "@/lib/tasks/recurrence";
import ShareModal from "./ShareModal";
import TagBar from "./TagBar";

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
  initialTasks, allTags, initialTagMap, onTagCreated,
}: {
  initialTasks: TaskRow[];
  allTags: TagRow[];
  initialTagMap: Record<string, string[]>;
  onTagCreated: (t: TagRow) => void;
}) {
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

  const roots = useMemo(() => tasks.filter(t => !t.parent_task_id), [tasks]);
  const childrenOf = (id: string) => tasks.filter(t => t.parent_task_id === id);

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
    await updateTask(t.id, { status: next });
  }
  async function setStatus(t: TaskRow, status: TaskStatus) {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status } : x));
    await updateTask(t.id, { status });
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
      {/* Saisie rapide */}
      <div className="rounded-2xl border border-arc-border bg-white p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTask(); }}
            placeholder="Nouvelle tâche… (Entrée pour ajouter)"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
          />
          <select
            value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
            className="px-2 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
          >
            <option value="haute">🔴 Haute</option>
            <option value="moyenne">🟠 Moyenne</option>
            <option value="basse">🔵 Basse</option>
          </select>
          <input
            type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
            title="Échéance (= rappel)"
            className="px-2 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
          />
          <select
            value={recurrence} onChange={e => setRecurrence(e.target.value)} title="Récurrence"
            className="px-2 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
          >
            {RECURRENCE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label === "Ne pas répéter" ? "🔁 —" : `🔁 ${p.label}`}</option>)}
          </select>
          <button onClick={addTask} className="px-4 py-2 rounded-lg bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2">
            + Ajouter
          </button>
        </div>
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
        />
        <FilterChip active={filter === "actives"} onClick={() => setFilter("actives")}>Actives ({counts.actives})</FilterChip>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Toutes</FilterChip>
        {STATUS_ORDER.map(s => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>{STATUS_META[s].label}</FilterChip>
        ))}
      </div>

      {/* Liste */}
      {visibleRoots.length === 0 ? (
        <div className="text-center py-16 text-arc-text3">
          <div className="text-5xl mb-3">✅</div>
          <div className="font-semibold text-arc-navy mb-1">Aucune tâche</div>
          <div className="text-sm">{search || filter !== "actives" ? "Aucun résultat." : "Ajoute ta première tâche ci-dessus."}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleRoots.map(t => (
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
              />
              {/* Sous-tâches */}
              {childrenOf(t.id).length > 0 && (
                <div className="ml-8 mt-1 space-y-1 border-l-2 border-arc-border pl-3">
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
                <div className="ml-8 mt-1 flex items-center gap-2 pl-3">
                  <input
                    autoFocus value={subTitle} onChange={e => setSubTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSubtask(t.id); if (e.key === "Escape") setSubFor(null); }}
                    placeholder="Sous-tâche…"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
                  />
                  <button onClick={() => addSubtask(t.id)} className="px-3 py-1.5 rounded-lg bg-arc-navy text-white text-xs font-bold">OK</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
  allTags, tagIds, onTagChange, onTagCreated,
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
}) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_META[t.status] ?? STATUS_META.a_faire;
  const pr = PRIORITY_META[t.priority] ?? PRIORITY_META.moyenne;
  const done = t.status === "termine";
  const overdue = t.due_at && !done && new Date(t.due_at) < new Date();
  const dueLocal    = t.due_at    ? new Date(t.due_at).toISOString().slice(0, 16) : "";
  const remindLocal = t.remind_at ? new Date(t.remind_at).toISOString().slice(0, 16) : "";
  const canDetails = !!(onRemind || onRecur);

  return (
    <div className={`rounded-xl border border-arc-border bg-white ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <div className="group flex items-center gap-3">
        {/* Case à cocher (cycle de statut) */}
        <button
          onClick={onCycle}
          title="Changer le statut"
          className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
          style={{ borderColor: st.color, background: done ? st.color : "transparent" }}
        >
          {done && <span className="text-white text-xs leading-none">✓</span>}
        </button>

        {/* Titre + méta */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm text-arc-navy truncate ${done ? "line-through text-arc-text3" : ""}`}>
            <span title={pr.label}>{pr.flag}</span> {t.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>
            {t.due_at && (
              <span className={`text-[10px] ${overdue ? "text-red-600 font-bold" : "text-arc-text3"}`}>
                ⏰ {new Date(t.due_at).toLocaleString("fr-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                {overdue && " · en retard"}
              </span>
            )}
            {t.recurrence && (
              <span className="text-[10px] text-arc-blue font-semibold">🔁 {recurrenceLabel(t.recurrence)}</span>
            )}
            {t.remind_at && !t.reminded_at && (
              <span className="text-[10px] text-arc-text3" title="Rappel programmé">🔔</span>
            )}
            {allTags && onTagChange && (
              <TagBar
                kind="task" resourceId={t.id} allTags={allTags}
                tagIds={tagIds ?? []} onChange={onTagChange}
                onCreated={onTagCreated ?? (() => {})}
              />
            )}
          </div>
        </div>

        {/* Contrôles (au survol) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <select value={t.status} onChange={e => onStatus(e.target.value as TaskStatus)} title="Statut"
            className="text-[11px] rounded-md border border-arc-border px-1 py-1 outline-none">
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <select value={t.priority} onChange={e => onPrio(e.target.value as TaskPriority)} title="Priorité"
            className="text-[11px] rounded-md border border-arc-border px-1 py-1 outline-none">
            <option value="haute">🔴</option><option value="moyenne">🟠</option><option value="basse">🔵</option>
          </select>
          <input type="datetime-local" value={dueLocal} onChange={e => onDue(e.target.value)} title="Échéance"
            className="text-[11px] rounded-md border border-arc-border px-1 py-1 outline-none w-[140px]" />
          {canDetails && (
            <button onClick={() => setExpanded(e => !e)} title="Rappel & récurrence" className="text-sm px-1">{expanded ? "🔽" : "🔔"}</button>
          )}
          {onShare && <button onClick={onShare} title="Partager" className="text-sm px-1">📤</button>}
          {onAddSub && <button onClick={onAddSub} title="Ajouter une sous-tâche" className="text-sm px-1">➕</button>}
          <button onClick={onDelete} title="Supprimer" className="text-sm px-1">🗑️</button>
        </div>
      </div>

      {/* Détails : rappel + récurrence (édition après création) */}
      {expanded && canDetails && (
        <div className="mt-3 pt-3 border-t border-arc-border flex flex-wrap items-center gap-4">
          {onRemind && (
            <label className="flex items-center gap-2 text-[11px] text-arc-text2">
              🔔 Rappel
              <input type="datetime-local" value={remindLocal} onChange={e => onRemind(e.target.value)}
                className="text-[11px] rounded-md border border-arc-border px-2 py-1 outline-none" />
            </label>
          )}
          {onRecur && (
            <label className="flex items-center gap-2 text-[11px] text-arc-text2">
              🔁 Répéter
              <select value={t.recurrence ?? ""} onChange={e => onRecur(e.target.value)}
                className="text-[11px] rounded-md border border-arc-border px-2 py-1 outline-none">
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
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active ? "bg-arc-navy text-white border-arc-navy" : "bg-white text-arc-text2 border-arc-border hover:border-arc-navy"
      }`}
    >
      {children}
    </button>
  );
}
