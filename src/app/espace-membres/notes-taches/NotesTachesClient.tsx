"use client";

import { useState } from "react";
import type { NoteRow } from "@/lib/actions/notes";
import type { TaskRow } from "@/lib/actions/tasks";
import NotesBoard from "./NotesBoard";
import TasksBoard from "./TasksBoard";
import SharesInbox from "./SharesInbox";

type Tab = "notes" | "taches" | "partages";

interface Props {
  initialNotes: NoteRow[];
  initialTasks: TaskRow[];
  initialTab: Tab;
  initialPendingShares?: number;
}

export default function NotesTachesClient({ initialNotes, initialTasks, initialTab, initialPendingShares = 0 }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [pending, setPending] = useState(initialPendingShares);
  const openTasks = initialTasks.filter(t => t.status !== "termine").length;

  return (
    <div>
      {/* Bascule Notes / Tâches */}
      <div className="inline-flex rounded-xl border border-arc-border bg-white p-1 mb-5">
        <button
          onClick={() => setTab("notes")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
            tab === "notes" ? "bg-arc-navy text-white" : "text-arc-text2 hover:text-arc-navy"
          }`}
        >
          🗒️ Notes
        </button>
        <button
          onClick={() => setTab("taches")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            tab === "taches" ? "bg-arc-navy text-white" : "text-arc-text2 hover:text-arc-navy"
          }`}
        >
          ✅ Tâches
          {openTasks > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === "taches" ? "bg-white/20 text-white" : "bg-arc-blueBg text-arc-blue"
            }`}>
              {openTasks}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("partages")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
            tab === "partages" ? "bg-arc-navy text-white" : "text-arc-text2 hover:text-arc-navy"
          }`}
        >
          📤 Partagés
          {pending > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === "partages" ? "bg-white/20 text-white" : "bg-arc-blueBg text-arc-blue"
            }`}>
              {pending}
            </span>
          )}
        </button>
      </div>

      {tab === "notes"  && <NotesBoard initialNotes={initialNotes} />}
      {tab === "taches" && <TasksBoard initialTasks={initialTasks} />}
      {tab === "partages" && <SharesInbox onChanged={() => setPending(0)} />}
    </div>
  );
}
