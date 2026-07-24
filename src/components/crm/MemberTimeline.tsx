// Vue 360° — fil d'activité chronologique unifié d'un membre (CRM Phase 3)
// Agrège interactions, notes, présences, prières et tâches accomplies en une
// seule timeline triée par date décroissante. Composant serveur (lecture seule).

type AnyRow = Record<string, unknown>;

interface TimelineItem {
  date: string;
  icon: string;
  title: string;
  detail?: string | null;
  dotCls: string;
}

const INTERACTION_LABEL: Record<string, string> = {
  appel: "Appel", visite: "Visite", email: "Email", whatsapp: "WhatsApp",
  sms: "SMS", rencontre: "Rencontre", autre: "Contact",
};
const INTERACTION_ICON: Record<string, string> = {
  appel: "📞", visite: "🏠", email: "✉️", whatsapp: "💬", sms: "📱", rencontre: "🤝", autre: "•",
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

export default function MemberTimeline({
  notes = [], interactions = [], tasks = [], attends = [], prayers = [],
}: {
  notes?: AnyRow[]; interactions?: AnyRow[]; tasks?: AnyRow[]; attends?: AnyRow[]; prayers?: AnyRow[];
}) {
  const items: TimelineItem[] = [];

  for (const it of interactions) {
    const type = (it.type as string) ?? "autre";
    const dir = it.direction === "entrant" ? "reçu" : "émis";
    items.push({
      date: it.occurred_at as string,
      icon: INTERACTION_ICON[type] ?? "•",
      title: `${INTERACTION_LABEL[type] ?? "Contact"} ${dir}`,
      detail: str(it.subject) ?? str(it.content),
      dotCls: "bg-indigo-400",
    });
  }

  for (const n of notes) {
    items.push({
      date: n.created_at as string,
      icon: "📝",
      title: `Note${str(n.type) ? ` · ${n.type}` : ""}`,
      detail: str(n.content),
      dotCls: "bg-purple-400",
    });
  }

  for (const a of attends) {
    const ev = a.events as { title?: string } | null;
    if (!a.checked_in_at) continue;
    items.push({
      date: a.checked_in_at as string,
      icon: "✓",
      title: "Présence",
      detail: str(ev?.title) ?? "Événement",
      dotCls: "bg-green-400",
    });
  }

  for (const p of prayers) {
    items.push({
      date: p.created_at as string,
      icon: p.is_answered ? "🙌" : "🙏",
      title: p.is_answered ? "Prière exaucée" : "Demande de prière",
      detail: str(p.title),
      dotCls: "bg-sky-400",
    });
  }

  for (const t of tasks) {
    if (t.status === "done" && t.completed_at) {
      items.push({
        date: t.completed_at as string,
        icon: "✅",
        title: "Tâche accomplie",
        detail: str(t.title),
        dotCls: "bg-teal-400",
      });
    }
  }

  const sorted = items
    .filter(i => i.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 40);

  return (
    <div className="bg-white border border-arc-border rounded-2xl p-5">
      <h2 className="font-bold text-arc-navy mb-1">🧭 Historique 360° ({sorted.length})</h2>
      <p className="text-[11px] text-arc-text3 mb-4">Toute l&apos;activité du membre, du plus récent au plus ancien.</p>

      {sorted.length === 0 ? (
        <p className="text-sm text-arc-text3">Aucune activité enregistrée pour l&apos;instant.</p>
      ) : (
        <div className="relative pl-4">
          <div className="absolute left-[5px] top-1 bottom-1 w-px bg-arc-border" aria-hidden />
          <div className="space-y-3.5">
            {sorted.map((item, i) => (
              <div key={i} className="relative">
                <span className={`absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full ring-2 ring-white ${item.dotCls}`} aria-hidden />
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm font-semibold text-arc-navy">{item.title}</span>
                  <span className="text-[10px] text-arc-text3">
                    {new Date(item.date).toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                {item.detail && (
                  <p className="text-xs text-arc-text2 leading-relaxed mt-0.5 line-clamp-2">{item.detail}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
