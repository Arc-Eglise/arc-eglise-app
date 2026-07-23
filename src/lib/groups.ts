import {
  Crown, Video, Music2, Flame, Flower2,
  HeartHandshake, Stethoscope, BookOpen, Bird,
  Megaphone, Wrench, Coins, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IconName } from "@/components/ui/Icon";

export interface GroupDef {
  slug:        string;
  name:        string;
  Icon:        LucideIcon;   // icône Lucide (legacy — conservée pour compat)
  icon:        IconName;     // icône duotone ARC (public/icons/{icon}-{variant}.svg)
  color:       string;   // Tailwind text color
  bg:          string;   // Tailwind bg color
  border:      string;   // Tailwind border color
  hex:         string;   // CSS hex for inline styles
  hexBg:       string;
}

export const GROUPS: GroupDef[] = [
  { slug:"pasteur",       name:"Pasteur",              Icon:Crown,          icon:"pasteurs",      color:"text-amber-700",   bg:"bg-amber-50",   border:"border-amber-200",  hex:"#92400e", hexBg:"#fffbeb" },
  { slug:"media",         name:"Équipe Média",          Icon:Video,          icon:"media",         color:"text-blue-700",    bg:"bg-blue-50",    border:"border-blue-200",   hex:"#1d4ed8", hexBg:"#eff6ff" },
  { slug:"chorale",       name:"Chorale",               Icon:Music2,         icon:"chorale",       color:"text-pink-700",    bg:"bg-pink-50",    border:"border-pink-200",   hex:"#be185d", hexBg:"#fdf2f8" },
  { slug:"jeunesse",      name:"La Jeunesse",           Icon:Flame,          icon:"jeunesse",      color:"text-orange-700",  bg:"bg-orange-50",  border:"border-orange-200", hex:"#c2410c", hexBg:"#fff7ed" },
  { slug:"femmes",        name:"Groupe des Femmes",     Icon:Flower2,        icon:"femmes",        color:"text-rose-700",    bg:"bg-rose-50",    border:"border-rose-200",   hex:"#be123c", hexBg:"#fff1f2" },
  { slug:"social",        name:"Social & Hospitalité",  Icon:HeartHandshake, icon:"hospitalite",   color:"text-emerald-700", bg:"bg-emerald-50", border:"border-emerald-200", hex:"#047857", hexBg:"#ecfdf5" },
  { slug:"hospitalite",   name:"Hospitalité",           Icon:Users,          icon:"hospitalite",   color:"text-cyan-700",    bg:"bg-cyan-50",    border:"border-cyan-200",   hex:"#0e7490", hexBg:"#ecfeff" },
  { slug:"sanitaire",     name:"Sanitaire & Propreté",  Icon:Stethoscope,    icon:"sanitaire",     color:"text-teal-700",    bg:"bg-teal-50",    border:"border-teal-200",   hex:"#0f766e", hexBg:"#f0fdfa" },
  { slug:"ecodim",        name:"Écodim",                Icon:BookOpen,       icon:"ecodim",        color:"text-lime-700",    bg:"bg-lime-50",    border:"border-lime-200",   hex:"#4d7c0f", hexBg:"#f7fee7" },
  { slug:"suivi",         name:"Suivi d'âmes",          Icon:Bird,           icon:"suivi-ames",    color:"text-sky-700",     bg:"bg-sky-50",     border:"border-sky-200",    hex:"#0369a1", hexBg:"#f0f9ff" },
  { slug:"communication", name:"Communication",          Icon:Megaphone,      icon:"communication", color:"text-violet-700",  bg:"bg-violet-50",  border:"border-violet-200", hex:"#6d28d9", hexBg:"#f5f3ff" },
  { slug:"support",       name:"Support",               Icon:Wrench,         icon:"support",       color:"text-slate-700",   bg:"bg-slate-100",  border:"border-slate-200",  hex:"#334155", hexBg:"#f1f5f9" },
  { slug:"finance",       name:"Finance",               Icon:Coins,          icon:"finance",       color:"text-amber-700",   bg:"bg-amber-50",   border:"border-amber-200",  hex:"#b45309", hexBg:"#fef3c7" },
];

export const GROUP_MAP: Record<string, GroupDef> = Object.fromEntries(
  GROUPS.map(g => [g.slug, g])
);

export function getGroup(slug: string): GroupDef {
  return GROUP_MAP[slug] ?? {
    slug,
    name:   slug,
    Icon:   BookOpen,
    icon:   "contacts",
    color:  "text-arc-text3",
    bg:     "bg-arc-bg",
    border: "border-arc-border",
    hex:    "#9ca3af",
    hexBg:  "#f9fafb",
  };
}
