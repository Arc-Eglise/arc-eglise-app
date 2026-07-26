import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import { updateTaskStatus, deletePastoralTask } from "@/lib/actions/membres";

const PRIO_META: Record<string, { label: string; cls: string }> = {
  basse:   { label: "Basse",   cls: "bg-gray-50 text-gray-600 border-gray-200" },
  normale: { label: "Normale", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  haute:   { label: "Haute",   cls: "bg-red-50 text-red-700 border-red-200" },
};

export default async function MesTachesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("id, role, groups").eq("id", user.id).single();
  const meGroups = (me?.groups as string[] | null) ?? [];
  const isPastoralTeam = ["admin", "pasteur"].includes(me?.role ?? "") || meGroups.includes("suivi");
  if (!isPastoralTeam) redirect("/espace-membres");

  const { data: tasksRaw } = await supabase
    .from("pastoral_tasks")
    .select("id, title, description, due_date, priority, status, member_id, profiles!pastoral_tasks_member_id_fkey(first_name, last_name)")
    .eq("assigned_to", user.id)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(200);

  const tasks     = tasksRaw ?? [];
  const todo      = tasks.filter(t => t.status === "todo");
  const done      = tasks.filter(t => t.status === "done");

  async function handleStatus(formData: FormData): Promise<void> {
    "use server";
    await updateTaskStatus(formData.get("task_id") as string, formData.get("status") as string, null);
  }
  async function handleDelete(formData: FormData): Promise<void> {
    "use server";
    await deletePastoralTask(formData.get("task_id") as string, null);
  }

  type TaskRow = {
    id: string; title: string; description?: string | null; due_date?: string | null;
    priority?: string | null; status?: string | null; member_id?: string | null;
    profiles?: { first_name: string | null; last_name: string | null } | null;
  };

  function renderTask(t: unknown) {
    const task = t as TaskRow;
    const isDone = task.status === "done";
    const prio = PRIO_META[(task.priority as string) ?? "normale"] ?? PRIO_META.normale;
    const overdue = !isDone && task.due_date && new Date(task.due_date + "T00:00:00") < new Date();
    const memberName = [task.profiles?.first_name, task.profiles?.last_name].filter(Boolean).join(" ");
    return (
      <div key={task.id} className={`rounded-xl p-3.5 relative group border ${isDone ? "bg-green-50/60 border-green-100" : overdue ? "bg-red-50 border-red-200" : "bg-white border-arc-border"}`}>
        <div className="flex items-start gap-3">
          {!isDone ? (
            <form action={handleStatus} className="flex-shrink-0 mt-0.5">
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="status" value="done" />
              <button type="submit" title="Marquer comme fait" className="w-5 h-5 rounded-full border-2 border-arc-border hover:border-green-500 hover:bg-green-100 transition-colors" />
            </form>
          ) : (
            <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs bg-green-500 text-white">✓</span>
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug ${isDone ? "text-arc-text3 line-through" : "text-arc-navy"}`}>{task.title}</p>
            {task.description && <p className="text-xs text-arc-text2 mt-0.5">{task.description}</p>}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${prio.cls}`}>{prio.label}</span>
              {task.due_date && (
                <span className={`text-[10px] font-semibold ${overdue ? "text-red-600" : "text-arc-text3"}`}>
                  🔔 {overdue ? "En retard : " : ""}{new Date(task.due_date + "T00:00:00").toLocaleDateString("fr-CH")}
                </span>
              )}
              {task.member_id && memberName && (
                <Link href={`/espace-membres/crm/${task.member_id}`} className="text-[10px] font-semibold text-arc-blue hover:underline">
                  👤 {memberName}
                </Link>
              )}
            </div>
          </div>
          <form action={handleDelete} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <input type="hidden" name="task_id" value={task.id} />
            <button type="submit" className="w-6 h-6 rounded-full bg-white border border-arc-border text-arc-text3 hover:text-red-500 text-xs flex items-center justify-center shadow-sm">✕</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <BackButton href="/espace-membres/crm" label="CRM Pastoral" className="mb-4" />

      <h1 className="text-xl font-bold text-arc-navy mb-1">🗓️ Mes tâches de suivi</h1>
      <p className="text-sm text-arc-text3 mb-6">Les tâches pastorales qui te sont assignées.</p>

      <section className="mb-8">
        <h2 className="font-bold text-arc-navy mb-3">À faire ({todo.length})</h2>
        <div className="space-y-2">
          {todo.length === 0 ? <p className="text-sm text-arc-text3">Aucune tâche en cours. 🎉</p> : todo.map(renderTask)}
        </div>
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="font-bold text-arc-text3 mb-3">Terminées ({done.length})</h2>
          <div className="space-y-2 opacity-75">
            {done.slice(0, 20).map(renderTask)}
          </div>
        </section>
      )}
    </div>
  );
}
