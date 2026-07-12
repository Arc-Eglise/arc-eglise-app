import {
  Crown, Video, Music2, Flame, Flower2,
  HeartHandshake, Stethoscope, BookOpen, Bird,
  Megaphone, Wrench, Coins,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface GroupDef {
  name:        string;
  Icon:        LucideIcon;
  color:       string;   // Tailwind text color
  bg:          string;   // Tailwind bg color
  border:      string;   // Tailwind border color
  hex:         string;   // CSS hex for inline styles
  hexBg:       string;
}

export const GROUPS: GroupDef[] = [
  {
    name:   "Pasteur",
    Icon:   Crown,
    color:  "text-amber-700",
    bg:     "bg-amber-50",
    border: "border-amber-200",
    hex:    "#92400e",
    hexBg:  "#fffbeb",
  },
  {
    name:   "Équipe Média",
    Icon:   Video,
    color:  "text-blue-700",
    bg:     "bg-blue-50",
    border: "border-blue-200",
    hex:    "#1d4ed8",
    hexBg:  "#eff6ff",
  },
  {
    name:   "Chorale",
    Icon:   Music2,
    color:  "text-pink-700",
    bg:     "bg-pink-50",
    border: "border-pink-200",
    hex:    "#be185d",
    hexBg:  "#fdf2f8",
  },
  {
    name:   "La Jeunesse",
    Icon:   Flame,
    color:  "text-orange-700",
    bg:     "bg-orange-50",
    border: "border-orange-200",
    hex:    "#c2410c",
    hexBg:  "#fff7ed",
  },
  {
    name:   "Groupe des Femmes",
    Icon:   Flower2,
    color:  "text-rose-700",
    bg:     "bg-rose-50",
    border: "border-rose-200",
    hex:    "#be123c",
    hexBg:  "#fff1f2",
  },
  {
    name:   "Social & Hospitalité",
    Icon:   HeartHandshake,
    color:  "text-emerald-700",
    bg:     "bg-emerald-50",
    border: "border-emerald-200",
    hex:    "#047857",
    hexBg:  "#ecfdf5",
  },
  {
    name:   "Sanitaire & Propreté",
    Icon:   Stethoscope,
    color:  "text-teal-700",
    bg:     "bg-teal-50",
    border: "border-teal-200",
    hex:    "#0f766e",
    hexBg:  "#f0fdfa",
  },
  {
    name:   "Écodim",
    Icon:   BookOpen,
    color:  "text-lime-700",
    bg:     "bg-lime-50",
    border: "border-lime-200",
    hex:    "#4d7c0f",
    hexBg:  "#f7fee7",
  },
  {
    name:   "Suivi d'âmes",
    Icon:   Bird,
    color:  "text-sky-700",
    bg:     "bg-sky-50",
    border: "border-sky-200",
    hex:    "#0369a1",
    hexBg:  "#f0f9ff",
  },
  {
    name:   "Communication",
    Icon:   Megaphone,
    color:  "text-violet-700",
    bg:     "bg-violet-50",
    border: "border-violet-200",
    hex:    "#6d28d9",
    hexBg:  "#f5f3ff",
  },
  {
    name:   "Support",
    Icon:   Wrench,
    color:  "text-slate-700",
    bg:     "bg-slate-100",
    border: "border-slate-200",
    hex:    "#334155",
    hexBg:  "#f1f5f9",
  },
  {
    name:   "Finance",
    Icon:   Coins,
    color:  "text-amber-700",
    bg:     "bg-amber-50",
    border: "border-amber-200",
    hex:    "#b45309",
    hexBg:  "#fef3c7",
  },
];

export const GROUP_MAP: Record<string, GroupDef> = Object.fromEntries(
  GROUPS.map(g => [g.name, g])
);

export function getGroup(name: string): GroupDef {
  return GROUP_MAP[name] ?? {
    name,
    Icon:   BookOpen,
    color:  "text-arc-text3",
    bg:     "bg-arc-bg",
    border: "border-arc-border",
    hex:    "#9ca3af",
    hexBg:  "#f9fafb",
  };
}
