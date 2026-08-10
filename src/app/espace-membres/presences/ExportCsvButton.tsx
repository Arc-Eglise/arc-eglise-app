"use client";

/** Bouton d'export CSV réel (remplace l'ancien bouton mort onClick=undefined). */
export default function ExportCsvButton({ csv, filename }: { csv: string; filename: string }) {
  function download() {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="px-4 py-2.5 rounded-lg border border-[#c6c5d4] text-sm font-semibold text-[#1a237e] hover:bg-[#edeeef] transition-all inline-flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-[18px]">download</span> Exporter
    </button>
  );
}
