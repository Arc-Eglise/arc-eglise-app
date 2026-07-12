"use client";

import { useState, useTransition, useEffect } from "react";
import { saveThemeOverride } from "@/lib/actions/cms";
import { createClient } from "@/lib/supabase/client";

const PALETTE = [
  // Noirs / Gris foncés
  { name: "Noir",       hex: "#000000" },
  { name: "Anthracite", hex: "#1C1C1E" },
  { name: "Charbon",    hex: "#2C2C2E" },
  { name: "Graphite",   hex: "#3A3A3C" },
  // Bleus foncés
  { name: "Marine",     hex: "#1e2464" },  // défaut ARC
  { name: "Minuit",     hex: "#0D1B2A" },
  { name: "Oxford",     hex: "#002147" },
  { name: "Indigo",     hex: "#1a237e" },
  { name: "Royal foncé",hex: "#283593" },
  // Bleus moyens
  { name: "Cobalt",     hex: "#1565C0" },
  { name: "Royal",      hex: "#1976D2" },
  { name: "Azur",       hex: "#2196F3" },
  { name: "Acier",      hex: "#455A64" },
  { name: "Ardoise",    hex: "#546E7A" },
  // Teals / Verts
  { name: "Teal foncé", hex: "#00695C" },
  { name: "Teal",       hex: "#00897B" },
  { name: "Forêt",      hex: "#2E7D32" },
  { name: "Émeraude",   hex: "#388E3C" },
  { name: "Sauge",      hex: "#558B2F" },
  // Violets
  { name: "Violet",     hex: "#4A148C" },
  { name: "Violet royal",hex: "#6A1B9A" },
  { name: "Mauve",      hex: "#7B1FA2" },
  { name: "Prune",      hex: "#880E4F" },
  { name: "Bordeaux v", hex: "#6B2D5E" },
  // Rouges / Oranges foncés
  { name: "Bordeaux",   hex: "#B71C1C" },
  { name: "Grenat",     hex: "#C62828" },
  { name: "Brique",     hex: "#BF360C" },
  { name: "Terracotta", hex: "#8D4E2C" },
  { name: "Acajou",     hex: "#5D4037" },
  // Brun / Terres
  { name: "Café",       hex: "#4E342E" },
  // Festifs intermédiaires
  { name: "Noël rouge", hex: "#D32F2F" },
  { name: "Noël vert",  hex: "#1B5E20" },
  { name: "Avent",      hex: "#4527A0" },
  { name: "Pâques",     hex: "#6A1B9A" },
  { name: "Or foncé",   hex: "#F57F17" },
  { name: "Ambre",      hex: "#FF8F00" },
  { name: "Automne",    hex: "#E65100" },
  // Clairs
  { name: "Bleu ciel",  hex: "#0288D1" },
  { name: "Menthe",     hex: "#00796B" },
  { name: "Lavande",    hex: "#5C6BC0" },
  { name: "Rose pâle",  hex: "#AD1457" },
  { name: "Or ARC",     hex: "#C9A227" },
  { name: "Sable",      hex: "#795548" },
  // Très clairs
  { name: "Bleu glacier",hex: "#0288D1" },
  { name: "Bleu vent",  hex: "#4FC3F7" },
  { name: "Vert tendre",hex: "#81C784" },
  { name: "Lilas",      hex: "#9575CD" },
  // Blancs / Gris clairs
  { name: "Gris acier", hex: "#90A4AE" },
  { name: "Gris perle", hex: "#B0BEC5" },
  { name: "Blanc",      hex: "#FFFFFF" },
];

interface Props {
  currentColor?: string;
  currentUntil?: string;
  selfLoad?: boolean;
}

export function ThemeOverridePicker({ currentColor = "", currentUntil = "", selfLoad = false }: Props) {
  const [selected, setSelected] = useState(currentColor);
  const [until, setUntil] = useState(currentUntil);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!selfLoad) return;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["theme_accent_color", "theme_accent_until"]);
        const map: Record<string, string> = {};
        for (const row of data ?? []) map[row.key] = row.value;
        if (map["theme_accent_color"]) setSelected(map["theme_accent_color"]);
        if (map["theme_accent_until"]) setUntil(map["theme_accent_until"]);
      } catch { /* silencieux */ }
    })();
  }, [selfLoad]);

  const today = new Date().toISOString().split("T")[0]!;
  const storedColor = selfLoad ? selected : currentColor;
  const storedUntil = selfLoad ? until : currentUntil;
  const isActive = !!storedColor && !!storedUntil && storedUntil >= today;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setError("Choisissez une couleur."); return; }
    if (!until) { setError("Choisissez une date de fin."); return; }
    setError("");
    const fd = new FormData();
    fd.set("theme_accent_color", selected);
    fd.set("theme_accent_until", until);
    startTransition(async () => {
      const res = await saveThemeOverride(fd);
      if (res?.error) { setError(res.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.set("theme_accent_color", "");
    fd.set("theme_accent_until", "");
    startTransition(async () => {
      const res = await saveThemeOverride(fd);
      if (res?.error) { setError(res.error); return; }
      setSelected("");
      setUntil("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="bg-white border border-arc-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-arc-navy text-sm">🎨 Thème de couleur temporaire</h3>
          <p className="text-[11px] text-arc-text3 mt-0.5">
            Remplace la couleur marine du site jusqu&apos;à la date choisie — revient automatiquement à l&apos;original.
          </p>
        </div>
        {isActive && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 flex-shrink-0">
            Thème actif
          </span>
        )}
      </div>

      {saved && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
          ✅ Sauvegardé — le site sera mis à jour dans quelques instants.
        </div>
      )}
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
          {error}
        </div>
      )}

      {/* Palette */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-arc-text3 mb-2">
          Couleur — {PALETTE.length} choix
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PALETTE.map(c => (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              onClick={() => setSelected(c.hex)}
              className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                selected === c.hex
                  ? "border-arc-navy ring-2 ring-arc-navy/30 scale-110"
                  : c.hex === "#FFFFFF" ? "border-gray-300" : "border-transparent hover:border-gray-400"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        {selected && (
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-5 h-5 rounded-md border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: selected }}
            />
            <span className="text-xs text-arc-text2">
              {PALETTE.find(c => c.hex === selected)?.name ?? selected} — <code className="font-mono text-[11px]">{selected}</code>
            </span>
          </div>
        )}
      </div>

      {/* Date de fin */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-arc-text3 mb-1.5">
          Revenir au thème original le
        </label>
        <input
          type="date"
          value={until}
          min={today}
          onChange={e => setUntil(e.target.value)}
          className="w-full sm:w-56 border border-arc-border rounded-lg px-3 py-2 text-sm text-arc-navy bg-white focus:outline-none focus:ring-2 focus:ring-arc-blue/30 focus:border-arc-blue transition"
        />
        <p className="text-[10px] text-arc-text3 mt-1">
          Le thème d&apos;origine sera automatiquement restauré à partir de cette date.
        </p>
      </div>

      {/* Aperçu */}
      {selected && (
        <div
          className="mb-4 rounded-xl px-4 py-3 text-white text-sm font-semibold flex items-center justify-between"
          style={{ backgroundColor: selected }}
        >
          <span>Aperçu — ARC Ambassade du Royaume de Christ</span>
          <span className="opacity-70 text-xs">arc-eglise.ch</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={!selected || !until}
          className="px-4 py-2 text-sm font-semibold bg-arc-blue text-white rounded-lg hover:bg-arc-navy transition disabled:opacity-40"
        >
          Appliquer le thème
        </button>
        {(storedColor || selected) && (
          <button
            onClick={handleRestore}
            className="px-4 py-2 text-sm text-arc-text2 border border-arc-border rounded-lg hover:bg-gray-50 hover:text-arc-navy transition"
          >
            Restaurer le thème original
          </button>
        )}
      </div>
    </div>
  );
}
