"use client";

import { useState } from "react";
import { validateDeclaration, type HrDeclaration } from "@/lib/actions/hr";
import { needsValidation, VALIDATION_META, type ValidationStatus } from "@/lib/hr-constants";

type Row = HrDeclaration & { memberName: string; typeLabel: string };

export default function DeclarationsReview({ declarations, canValidate }: { declarations: Row[]; canValidate: boolean }) {
  const [rows, setRows] = useState<Row[]>(declarations);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, validation_status: decision } : r));
    await validateDeclaration(id, decision).catch(() => {});
    setBusy(null);
  }

  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" });

  if (rows.length === 0) return <p className="text-sm text-arc-text3">Aucune déclaration pour le moment.</p>;

  return (
    <div className="divide-y divide-arc-border/60">
      {rows.map(d => {
        const mustValidate = needsValidation(d.type);
        const vs = (d.validation_status ?? (mustValidate ? "pending" : null)) as ValidationStatus | null;
        const vmeta = vs ? VALIDATION_META[vs] : null;
        return (
          <div key={d.id} className="flex items-center gap-3 py-2.5 flex-wrap">
            <span className="text-sm font-semibold text-[#000666] min-w-[140px]">{d.memberName}</span>
            <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-arc-blueBg text-arc-blue">{d.typeLabel}</span>
            <span className="text-xs text-arc-text2">
              départ {fmt(d.start_date)} · retour {fmt(d.return_date)}
            </span>
            {vmeta && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: vmeta.color, background: vmeta.bg }}>{vmeta.label}</span>
            )}
            {d.note && <span className="text-xs text-arc-text3 truncate">— {d.note}</span>}
            {canValidate && mustValidate && vs !== "approved" && (
              <button onClick={() => decide(d.id, "approved")} disabled={busy === d.id} className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 hover:bg-green-100">✓ Approuver</button>
            )}
            {canValidate && mustValidate && vs !== "rejected" && (
              <button onClick={() => decide(d.id, "rejected")} disabled={busy === d.id} className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 hover:bg-red-100">✕ Refuser</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
