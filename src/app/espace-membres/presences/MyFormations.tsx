"use client";

import { useState, useTransition } from "react";
import { announceFormationAttendance } from "@/lib/actions/formations";
import { FORMATION_STATUSES, type Formation, type FormationStatus } from "@/lib/formations-constants";

const DAY_LABEL: Record<string, string> = { lun: "Lun", mar: "Mar", mer: "Mer", jeu: "Jeu", ven: "Ven", sam: "Sam", dim: "Dim" };
const STATUS_LABEL: Record<FormationStatus, string> = {
  sera_present: "Sera présent", present: "Présent", sera_absent: "Sera absent", absent: "Absent",
};
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export default function MyFormations({
  formations, initialStatus,
}: {
  formations: Formation[];
  initialStatus: Record<string, FormationStatus>;
}) {
  const [status, setStatus] = useState<Record<string, FormationStatus>>(initialStatus);
  const [, startT] = useTransition();

  if (formations.length === 0) return null;

  function announce(formationId: string, s: FormationStatus) {
    setStatus(prev => ({ ...prev, [formationId]: s }));
    startT(() => { void announceFormationAttendance(formationId, s); });
  }

  return (
    <div className="bg-white border border-[#c6c5d4] rounded-xl p-5 shadow-[0_4px_20px_rgba(30,36,100,0.05)] mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[20px] text-[#000666]">school</span>
        <h2 className="text-lg text-[#000666]" style={{ fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>Mes formations</h2>
      </div>
      <p className="text-sm text-[#454652] mb-4">Annonce ta présence — les pasteurs et le responsable de la formation sont notifiés.</p>

      <div className="flex flex-col gap-4">
        {formations.map(f => {
          const cur = status[f.id];
          const schedule = [
            (f.days ?? []).map(d => DAY_LABEL[d] ?? d).join(", "),
            (f.time_start || f.time_end) ? `${hhmm(f.time_start) || "?"}–${hhmm(f.time_end) || "?"}` : "",
          ].filter(Boolean).join(" · ");
          return (
            <div key={f.id} className="border border-[#c6c5d4]/60 rounded-lg p-4">
              <div className="font-semibold text-[#191c1d]">{f.title}</div>
              {schedule && <div className="text-xs text-[#767683] mt-0.5">{schedule}</div>}
              <div className="flex flex-wrap gap-2 mt-3">
                {FORMATION_STATUSES.map(s => {
                  const active = cur === s;
                  const isPresent = s === "present" || s === "sera_present";
                  return (
                    <button key={s} onClick={() => announce(f.id, s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? (isPresent ? "bg-green-600 text-white border-green-600" : "bg-red-500 text-white border-red-500")
                          : "bg-white text-[#454652] border-[#c6c5d4] hover:border-[#000666]"
                      }`}>
                      {STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
