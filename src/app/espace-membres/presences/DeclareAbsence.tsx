"use client";

import { useState, useTransition } from "react";
import { declareAbsence, deleteDeclaration, type HrDeclaration } from "@/lib/actions/hr";
import { HR_DECLARABLE_TYPES, type HrDeclarationType } from "@/lib/hr-constants";

const TYPE_LABEL: Record<HrDeclarationType, string> = {
  retard: "Retard", absent: "Absence", conge: "Congé",
  vacances: "Vacances", maladie: "Maladie", distance: "À distance",
};
const TYPE_TONE: Record<HrDeclarationType, string> = {
  retard: "bg-amber-50 text-amber-700 border-amber-200",
  absent: "bg-red-50 text-red-600 border-red-200",
  conge: "bg-blue-50 text-[#000666] border-blue-200",
  vacances: "bg-cyan-50 text-cyan-700 border-cyan-200",
  maladie: "bg-orange-50 text-orange-700 border-orange-200",
  distance: "bg-violet-50 text-violet-700 border-violet-200",
};

const fmt = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" });

export default function DeclareAbsence({ initialDeclarations }: { initialDeclarations: HrDeclaration[] }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<HrDeclaration[]>(initialDeclarations);
  const [type, setType] = useState<HrDeclarationType>("conge");
  const [startDate, setStartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startT] = useTransition();

  function reset() {
    setType("conge"); setStartDate(""); setReturnDate(""); setNote(""); setErr(null);
  }

  function submit() {
    setErr(null);
    if (!startDate || !returnDate) { setErr("Choisis une date de début et une date de retour."); return; }
    if (returnDate < startDate) { setErr("La date de retour doit suivre la date de début."); return; }
    startT(async () => {
      const res = await declareAbsence({ type, start_date: startDate, return_date: returnDate, note: note || null });
      if ("error" in res) { setErr(res.error ?? "Une erreur est survenue."); return; }
      setList(prev => [res.data, ...prev]);
      setOpen(false); reset();
      setToast("Déclaration envoyée — le pasteur et ton/tes groupe(s) ont été notifiés.");
      setTimeout(() => setToast(null), 6000);
    });
  }

  function remove(id: string) {
    if (!confirm("Supprimer cette déclaration ?")) return;
    setList(prev => prev.filter(d => d.id !== id));
    startT(async () => { await deleteDeclaration(id); });
  }

  return (
    <div className="mb-6">
      {toast && (
        <div className="mb-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium">
          ✓ {toast}
        </div>
      )}

      <div className="bg-white border border-[#c6c5d4] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-serif text-lg text-[#000666]">Mes déclarations RH</div>
            <p className="text-xs text-[#454652] mt-0.5">Déclare un retard, une absence ou un congé (période début → retour).</p>
          </div>
          <button
            onClick={() => { reset(); setOpen(true); }}
            className="px-4 py-2 rounded-lg bg-[#000666] text-white text-sm font-bold hover:bg-[#1a237e] transition-colors"
          >
            + Déclarer une absence
          </button>
        </div>

        {list.length > 0 && (
          <div className="mt-4 divide-y divide-[#c6c5d4]/60">
            {list.map(d => (
              <div key={d.id} className="flex items-center gap-3 py-2.5">
                <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TYPE_TONE[d.type]}`}>
                  {TYPE_LABEL[d.type]}
                </span>
                <span className="text-sm text-[#000666]">
                  Du <strong>{fmt(d.start_date)}</strong> au <strong>{fmt(d.return_date)}</strong>
                </span>
                {d.note && <span className="text-xs text-[#767683] truncate hidden sm:block">— {d.note}</span>}
                <button onClick={() => remove(d.id)} title="Supprimer" className="ml-auto text-[#767683] hover:text-red-500 text-sm">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale de déclaration */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#000666]/30 backdrop-blur-[2px]" onClick={() => !pending && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 w-7 h-7 rounded-full border border-[#c6c5d4] text-[#767683] hover:text-[#000666] text-sm flex items-center justify-center">✕</button>
            <h2 className="font-serif text-2xl text-[#000666] mb-1">Déclarer une absence</h2>
            <p className="text-xs text-[#454652] mb-5">Le pasteur et ton/tes groupe(s) de fonction seront notifiés par email.</p>

            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#000666] mb-1.5">Motif</label>
            <select
              value={type} onChange={e => setType(e.target.value as HrDeclarationType)}
              className="w-full px-3 py-2.5 mb-4 rounded-lg border border-[#c6c5d4] text-sm outline-none focus:border-[#000666] bg-white"
            >
              {HR_DECLARABLE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#000666] mb-1.5">Date de début</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#c6c5d4] text-sm outline-none focus:border-[#000666]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#000666] mb-1.5">Date de retour</label>
                <input type="date" value={returnDate} min={startDate || undefined} onChange={e => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#c6c5d4] text-sm outline-none focus:border-[#000666]" />
              </div>
            </div>

            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#000666] mb-1.5">Note (facultatif)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={2000}
              placeholder="Précisions éventuelles…"
              className="w-full px-3 py-2.5 mb-4 rounded-lg border border-[#c6c5d4] text-sm outline-none focus:border-[#000666] resize-y" />

            {err && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">⚠️ {err}</div>}

            <div className="flex items-center gap-3">
              <button onClick={submit} disabled={pending}
                className="px-5 py-2.5 rounded-lg bg-[#000666] text-white text-sm font-bold hover:bg-[#1a237e] transition-colors disabled:opacity-60">
                {pending ? "Envoi…" : "Envoyer la déclaration"}
              </button>
              <button onClick={() => setOpen(false)} disabled={pending}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-[#454652] hover:text-[#000666] transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
