"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertHrAttendance, deleteHrAttendance,
  type HrRecord, type HrStatus, HR_STATUSES,
} from "@/lib/actions/hr";

interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  groups: string[];
}

interface Props {
  members: Member[];
  date: string;                 // YYYY-MM-DD
  initialRecords: HrRecord[];
}

const STATUS_META: Record<HrStatus, { label: string; color: string; bg: string }> = {
  present:  { label: "Présent",    color: "#15803d", bg: "#dcfce7" },
  absent:   { label: "Absent",     color: "#dc2626", bg: "#fee2e2" },
  conge:    { label: "Congé",      color: "#1e6bff", bg: "#dde9ff" },
  vacances: { label: "Vacances",   color: "#0e7490", bg: "#cffafe" },
  maladie:  { label: "Maladie",    color: "#c2410c", bg: "#ffedd5" },
  distance: { label: "À distance", color: "#6d28d9", bg: "#ede9fe" },
  retard:   { label: "Retard",     color: "#b45309", bg: "#fef3c7" },
};

export default function HrBoard({ members, date, initialRecords }: Props) {
  const router = useRouter();
  const [, startT] = useTransition();
  const [search, setSearch] = useState("");

  // member_id → record du jour (source réelle, vide au départ)
  const [byMember, setByMember] = useState<Record<string, HrRecord>>(
    () => Object.fromEntries(initialRecords.map(r => [r.member_id, r]))
  );

  function memberName(m: Member) {
    return [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre";
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => memberName(m).toLowerCase().includes(q));
  }, [members, search]);

  // Compteurs par statut — calculés sur les données réelles du jour
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of Object.values(byMember)) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [byMember]);
  const renseignes = Object.keys(byMember).length;

  function setDate(next: string) {
    router.push(`/espace-membres/presences?tab=rh&hrdate=${next}`);
  }

  function patchLocal(memberId: string, rec: HrRecord | null) {
    setByMember(prev => {
      const next = { ...prev };
      if (rec) next[memberId] = rec; else delete next[memberId];
      return next;
    });
  }

  async function save(member: Member, changes: Partial<HrRecord>) {
    const cur = byMember[member.id];
    const status = (changes.status ?? cur?.status ?? "present") as HrStatus;
    // Optimiste
    patchLocal(member.id, {
      id: cur?.id ?? `tmp-${member.id}`,
      member_id: member.id,
      date,
      status,
      arrival_time: changes.arrival_time ?? cur?.arrival_time ?? null,
      departure_time: changes.departure_time ?? cur?.departure_time ?? null,
      note: changes.note ?? cur?.note ?? null,
      recorded_by: cur?.recorded_by ?? null,
      created_at: cur?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    startT(async () => {
      const res = await upsertHrAttendance({
        member_id: member.id,
        date,
        status,
        arrival_time: changes.arrival_time ?? cur?.arrival_time ?? null,
        departure_time: changes.departure_time ?? cur?.departure_time ?? null,
        note: changes.note ?? cur?.note ?? null,
      });
      if ("data" in res && res.data) patchLocal(member.id, res.data);
    });
  }

  async function reset(member: Member) {
    patchLocal(member.id, null);
    startT(async () => { await deleteHrAttendance(member.id, date); });
  }

  return (
    <div>
      {/* Cartes de stats — données réelles du jour */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Renseignés" value={`${renseignes} / ${members.length}`} tone="navy" />
        <StatCard label="Présents"   value={counts.present ?? 0} tone="green" />
        <StatCard label="Absents"    value={counts.absent ?? 0}  tone="red" />
        <StatCard label="Congé / vacances" value={(counts.conge ?? 0) + (counts.vacances ?? 0)} tone="blue" />
      </div>

      {/* Barre d'outils : date + recherche */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-arc-text2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-arc-blue">Jour</span>
          <input
            type="date" value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
          />
        </label>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un nom…"
          className="flex-1 min-w-[180px] px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy"
        />
      </div>

      {/* Table RH */}
      <div className="bg-white border border-arc-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 720 }}>
            <thead>
              <tr className="border-b border-arc-border bg-arc-bg text-[11px] font-bold text-arc-text3 uppercase tracking-wider">
                <th className="px-4 py-3 text-left" style={{ minWidth: 180 }}>Membre</th>
                <th className="px-3 py-3 text-left" style={{ minWidth: 150 }}>Statut</th>
                <th className="px-3 py-3 text-left">Arrivée</th>
                <th className="px-3 py-3 text-left">Départ</th>
                <th className="px-3 py-3 text-left" style={{ minWidth: 160 }}>Note</th>
                <th className="px-3 py-3 text-center">—</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-arc-text3 text-sm">Aucun membre.</td></tr>
              ) : filtered.map((m, i) => {
                const rec = byMember[m.id];
                const dept = m.groups[0] ?? null;
                const meta = rec ? STATUS_META[rec.status] : null;
                return (
                  <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-arc-bg/40"}>
                    <td className="px-4 py-2.5 border-b border-arc-border/50">
                      <div className="text-sm font-semibold text-arc-navy">{memberName(m)}</div>
                      {dept && <div className="text-[11px] text-arc-text3 capitalize">{dept}</div>}
                    </td>
                    <td className="px-3 py-2.5 border-b border-arc-border/50">
                      <div className="flex items-center gap-2">
                        {meta && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />}
                        <select
                          value={rec?.status ?? ""}
                          onChange={e => e.target.value ? save(m, { status: e.target.value as HrStatus }) : reset(m)}
                          className="text-xs rounded-md border border-arc-border px-2 py-1.5 outline-none focus:border-arc-navy bg-white"
                          style={meta ? { color: meta.color, background: meta.bg } : undefined}
                        >
                          <option value="">— Non renseigné —</option>
                          {HR_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-b border-arc-border/50">
                      <input
                        type="time" value={rec?.arrival_time?.slice(0, 5) ?? ""}
                        onChange={e => save(m, { arrival_time: e.target.value || null })}
                        className="text-xs rounded-md border border-arc-border px-2 py-1.5 outline-none focus:border-arc-navy"
                      />
                    </td>
                    <td className="px-3 py-2.5 border-b border-arc-border/50">
                      <input
                        type="time" value={rec?.departure_time?.slice(0, 5) ?? ""}
                        onChange={e => save(m, { departure_time: e.target.value || null })}
                        className="text-xs rounded-md border border-arc-border px-2 py-1.5 outline-none focus:border-arc-navy"
                      />
                    </td>
                    <td className="px-3 py-2.5 border-b border-arc-border/50">
                      <input
                        defaultValue={rec?.note ?? ""}
                        onBlur={e => { if ((e.target.value || null) !== (rec?.note ?? null)) save(m, { note: e.target.value || null }); }}
                        placeholder="—"
                        className="w-full text-xs rounded-md border border-arc-border px-2 py-1.5 outline-none focus:border-arc-navy"
                      />
                    </td>
                    <td className="px-3 py-2.5 border-b border-arc-border/50 text-center">
                      {rec && (
                        <button onClick={() => reset(m)} title="Réinitialiser" className="text-arc-text3 hover:text-red-500 text-sm">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-arc-text3 mt-3">
        Les données proviennent de Supabase (table <code>hr_attendance</code>). Un jour sans saisie reste vide.
      </p>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: "navy" | "green" | "red" | "blue" }) {
  const toneClass = tone === "green" ? "text-green-600" : tone === "red" ? "text-red-500" : tone === "blue" ? "text-arc-blue" : "text-arc-navy";
  return (
    <div className="bg-white border border-arc-border rounded-xl p-5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-arc-text3">{label}</div>
      <div className={`text-3xl font-bold font-serif mt-2 ${toneClass}`}>{value}</div>
    </div>
  );
}
