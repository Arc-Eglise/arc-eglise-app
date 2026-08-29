"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { HrRecord } from "@/lib/actions/hr";
import { type HrStatus } from "@/lib/hr-constants";

interface Member { id: string; first_name: string | null; last_name: string | null; groups: string[]; }
interface Props {
  month: string;              // YYYY-MM sélectionné
  records: HrRecord[];        // lignes RH sur 6 mois (jusqu'à month inclus)
  members: Member[];
}

// Statuts considérés « travaillés » pour le comptage jours/heures
const WORKED: HrStatus[] = ["present", "distance", "retard"];

/** Heures d'une ligne = départ − arrivée (si les deux sont saisis), sinon 0. */
function recordHours(r: HrRecord): number {
  if (!r.arrival_time || !r.departure_time) return 0;
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
  const diff = toMin(r.departure_time) - toMin(r.arrival_time);
  return diff > 0 ? diff / 60 : 0;
}

const fmtH = (h: number) => (Math.round(h * 10) / 10).toLocaleString("fr-CH");

export default function HrReport({ month, records, members }: Props) {
  const router = useRouter();
  const memberName = (id: string) => {
    const m = members.find(x => x.id === id);
    return m ? ([m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre") : "Membre";
  };

  // Les 6 mois affichés (du plus ancien au mois sélectionné)
  const months = useMemo(() => {
    const [y, mo] = month.split("-").map(Number);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(y, mo - 6 + i, 1));
      return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("fr-CH", { month: "short" }) };
    });
  }, [month]);

  // Agrégation heures + jours par mois et par membre (sur le mois sélectionné)
  const agg = useMemo(() => {
    const worked = records.filter(r => WORKED.includes(r.status));
    const hoursByMonth: Record<string, number> = {};
    const daysByMonth: Record<string, number> = {};
    for (const r of worked) {
      const mk = r.date.slice(0, 7);
      hoursByMonth[mk] = (hoursByMonth[mk] ?? 0) + recordHours(r);
      daysByMonth[mk] = (daysByMonth[mk] ?? 0) + 1;
    }
    // Détail par membre pour le mois sélectionné
    const monthRecords = records.filter(r => r.date.slice(0, 7) === month);
    const perMember = members.map(m => {
      const rows = monthRecords.filter(r => r.member_id === m.id);
      const workedRows = rows.filter(r => WORKED.includes(r.status));
      const hours = workedRows.reduce((s, r) => s + recordHours(r), 0);
      const days = workedRows.length;
      const counts: Record<string, number> = {};
      for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return { id: m.id, name: memberName(m.id), hours, days, counts, any: rows.length > 0 };
    }).filter(x => x.any);

    // Repli : si aucune heure saisie sur tout le mois → on affiche les jours
    const totalHours = hoursByMonth[month] ?? 0;
    const useHours = totalHours > 0;
    const prevKey = months[months.length - 2]?.key;
    const prevVal = (useHours ? hoursByMonth[prevKey] : daysByMonth[prevKey]) ?? 0;
    const curVal = (useHours ? hoursByMonth[month] : daysByMonth[month]) ?? 0;
    const delta = prevVal > 0 ? Math.round(((curVal - prevVal) / prevVal) * 100) : null;

    return { hoursByMonth, daysByMonth, perMember, useHours, curVal, delta };
  }, [records, members, month, months]);

  const unit = agg.useHours ? "h" : "j";
  const barVals = months.map(mm => (agg.useHours ? agg.hoursByMonth[mm.key] : agg.daysByMonth[mm.key]) ?? 0);
  const maxBar = Math.max(1, ...barVals);

  function goMonth(next: string) {
    router.push(`/espace-membres/presences?tab=rapports&rapmonth=${next}`);
  }
  const shift = (n: number) => {
    const [y, mo] = month.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
  };
  const monthLabel = new Date(month + "-01T00:00:00").toLocaleDateString("fr-CH", { month: "long", year: "numeric" });

  return (
    <div className="hr-report">
      {/* Barre : sélecteur de mois + impression */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => goMonth(shift(-1))} className="px-3 py-2 rounded-lg border border-[#c6c5d4] text-sm hover:bg-[#f3f4f5]" aria-label="Mois précédent">←</button>
          <span className="text-sm font-semibold text-[#000666] capitalize min-w-[150px] text-center">{monthLabel}</span>
          <button onClick={() => goMonth(shift(1))} className="px-3 py-2 rounded-lg border border-[#c6c5d4] text-sm hover:bg-[#f3f4f5]" aria-label="Mois suivant">→</button>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#000666] text-white text-sm font-semibold hover:bg-[#1a237e]">
          🖨️ Imprimer / PDF
        </button>
      </div>

      {/* En-tête d'impression */}
      <div className="hidden print:block mb-4">
        <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-2xl text-[#000666]">Rapport d&apos;heures — <span className="capitalize">{monthLabel}</span></h2>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#c6c5d4]/50 rounded-xl p-6 shadow-[0_4px_20px_rgba(26,35,126,0.05)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#767683]">{agg.useHours ? "Heures totales" : "Jours de présence"} (équipe)</div>
          <div style={{ fontFamily: '"Playfair Display", serif' }} className="text-[40px] leading-tight font-bold text-[#000666] mt-1">
            {fmtH(agg.curVal)} <span className="text-lg text-[#767683]">{unit}</span>
          </div>
          {agg.delta != null && (
            <div className={`text-xs font-semibold mt-1 ${agg.delta >= 0 ? "text-green-700" : "text-red-600"}`}>
              {agg.delta >= 0 ? "▲" : "▼"} {Math.abs(agg.delta)}% vs mois précédent
            </div>
          )}
        </div>
        <div className="bg-white border border-[#c6c5d4]/50 rounded-xl p-6 shadow-[0_4px_20px_rgba(26,35,126,0.05)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#767683]">Membres actifs</div>
          <div style={{ fontFamily: '"Playfair Display", serif' }} className="text-[40px] leading-tight font-bold text-[#000666] mt-1">{agg.perMember.length}</div>
          <div className="text-xs text-[#767683] mt-1">avec au moins une présence ce mois</div>
        </div>
        <div className="bg-white border border-[#c6c5d4]/50 rounded-xl p-6 shadow-[0_4px_20px_rgba(26,35,126,0.05)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#767683]">Moyenne / membre</div>
          <div style={{ fontFamily: '"Playfair Display", serif' }} className="text-[40px] leading-tight font-bold text-[#000666] mt-1">
            {agg.perMember.length > 0 ? fmtH(agg.curVal / agg.perMember.length) : "0"} <span className="text-lg text-[#767683]">{unit}</span>
          </div>
        </div>
      </div>

      {/* Graphe barres — 6 mois */}
      <div className="bg-white border border-[#c6c5d4]/50 rounded-xl p-6 shadow-sm mb-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#000666] mb-4">Tendance sur 6 mois ({agg.useHours ? "heures" : "jours"})</div>
        <div className="flex items-end justify-between gap-3" style={{ height: 180 }}>
          {months.map((mm, i) => {
            const v = barVals[i];
            const isCur = mm.key === month;
            return (
              <div key={mm.key} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-[11px] font-semibold text-[#454652] mb-1">{v > 0 ? fmtH(v) : ""}</div>
                <button onClick={() => goMonth(mm.key)} title={`Voir ${mm.label}`}
                  className="w-full rounded-t-md transition-all hover:opacity-80"
                  style={{ height: `${Math.max(4, (v / maxBar) * 130)}px`, background: isCur ? "#000666" : "#c7cbe8" }} />
                <div className={`text-[11px] mt-2 capitalize ${isCur ? "font-bold text-[#000666]" : "text-[#767683]"}`}>{mm.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tableau par membre */}
      <div className="bg-white border border-[#c6c5d4] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#c6c5d4] bg-[#f3f4f5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#000666]">Détail par membre — <span className="capitalize">{monthLabel}</span></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr className="border-b border-[#c6c5d4] text-[11px] font-bold text-[#767683] uppercase tracking-wider">
                <th className="px-4 py-3 text-left" style={{ minWidth: 180 }}>Membre</th>
                <th className="px-3 py-3 text-right">{agg.useHours ? "Heures" : "Jours"}</th>
                <th className="px-3 py-3 text-right">Jours présents</th>
                <th className="px-3 py-3 text-right">Retards</th>
                <th className="px-3 py-3 text-right">Absences</th>
              </tr>
            </thead>
            <tbody>
              {agg.perMember.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-[#767683] text-sm">Aucune donnée RH pour ce mois.</td></tr>
              ) : agg.perMember.sort((a, b) => (agg.useHours ? b.hours - a.hours : b.days - a.days)).map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-[#f3f4f5]/40"}>
                  <td className="px-4 py-2.5 border-b border-[#c6c5d4]/50 text-sm font-semibold text-[#000666]">{m.name}</td>
                  <td className="px-3 py-2.5 border-b border-[#c6c5d4]/50 text-right text-sm font-bold text-[#000666]">{agg.useHours ? `${fmtH(m.hours)} h` : `${m.days} j`}</td>
                  <td className="px-3 py-2.5 border-b border-[#c6c5d4]/50 text-right text-sm text-[#454652]">{m.days}</td>
                  <td className="px-3 py-2.5 border-b border-[#c6c5d4]/50 text-right text-sm text-[#b45309]">{m.counts.retard ?? 0}</td>
                  <td className="px-3 py-2.5 border-b border-[#c6c5d4]/50 text-right text-sm text-[#dc2626]">{(m.counts.absent ?? 0) + (m.counts.maladie ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!agg.useHours && agg.perMember.length > 0 && (
        <p className="text-xs text-[#767683] mt-3">
          ℹ️ Aucune heure d&apos;arrivée/départ saisie ce mois — le rapport affiche les <strong>jours de présence</strong>. Renseigne les heures dans l&apos;onglet RH pour un décompte horaire.
        </p>
      )}
    </div>
  );
}
