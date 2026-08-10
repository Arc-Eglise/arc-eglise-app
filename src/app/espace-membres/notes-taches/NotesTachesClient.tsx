"use client";

import { useState } from "react";
import type { NoteRow, TaskRow, TagRow } from "@/lib/notes-taches/types";
import NotesBoard from "./NotesBoard";
import TasksBoard from "./TasksBoard";
import SharesInbox from "./SharesInbox";

type View = "board" | "partages";

interface Props {
  initialNotes: NoteRow[];
  initialTasks: TaskRow[];
  initialTab: "notes" | "taches" | "partages";
  initialPendingShares?: number;
  initialTags: TagRow[];
  noteTagMap: Record<string, string[]>;
  taskTagMap: Record<string, string[]>;
}

export default function NotesTachesClient({
  initialNotes, initialTasks, initialTab, initialPendingShares = 0,
  initialTags, noteTagMap, taskTagMap,
}: Props) {
  const [view, setView] = useState<View>(initialTab === "partages" ? "partages" : "board");
  const [pending, setPending] = useState(initialPendingShares);
  const [allTags, setAllTags] = useState<TagRow[]>(initialTags);
  const addTag = (t: TagRow) => setAllTags(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t]);

  const pill = (active: boolean) =>
    `px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 ${
      active ? "bg-arc-navy text-white" : "text-arc-text2 hover:text-arc-navy"
    }`;

  return (
    <div>
      {/* Segment de vue */}
      <div className="inline-flex rounded-full border border-arc-border bg-white p-1 mb-8 shadow-sm">
        <button onClick={() => setView("board")} className={pill(view === "board")}>
          Notes &amp; Tâches
        </button>
        <button onClick={() => setView("partages")} className={pill(view === "partages")}>
          Partagés
          {pending > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${view === "partages" ? "bg-white/20 text-white" : "bg-arc-blueBg text-arc-blue"}`}>
              {pending}
            </span>
          )}
        </button>
      </div>

      {view === "partages" ? (
        <SharesInbox onChanged={() => setPending(0)} />
      ) : (
        // Layout éditorial : Notes (2/3) + Tâches (1/3) côte à côte
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-start">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-arc-border pb-2 mb-5">
              <h2 className="font-serif text-2xl text-arc-navy">Notes récentes</h2>
            </div>
            <NotesBoard initialNotes={initialNotes} allTags={allTags} initialTagMap={noteTagMap} onTagCreated={addTag} />
          </section>
          <section>
            <div className="flex items-center justify-between border-b border-arc-border pb-2 mb-5">
              <h2 className="font-serif text-2xl text-arc-navy">Tâches</h2>
              {initialTasks.filter(t => t.status !== "termine").length > 0 && (
                <span className="bg-arc-navy text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {initialTasks.filter(t => t.status !== "termine").length}
                </span>
              )}
            </div>
            <TasksBoard initialTasks={initialTasks} allTags={allTags} initialTagMap={taskTagMap} onTagCreated={addTag} />
          </section>
        </div>
      )}
    </div>
  );
}
