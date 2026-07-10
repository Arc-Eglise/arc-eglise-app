"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/espace-membres",             label: "Accueil",      icon: "🏠", exact: true },
  { href: "/espace-membres/assistant",   label: "Assistant IA", icon: "✨" },
  { href: "/espace-membres/annuaire",    label: "Annuaire",     icon: "👥" },
  { href: "/espace-membres/agenda",      label: "Agenda",       icon: "📅" },
  { href: "/espace-membres?panel=messagerie", label: "Messages", icon: "💬" },
  { href: "/espace-membres?panel=priere",     label: "Prière",   icon: "🙏" },
  { href: "/espace-membres/ai-biblique", label: "ARC Église AI", icon: "✦" },
  { href: "/espace-membres/streaming",   label: "Streaming",      icon: "📺" },
  { href: "/espace-membres/bible",       label: "Bible",          icon: "📖" },
  { href: "/espace-membres/notes",       label: "Notes",          icon: "📝" },
  { href: "/espace-membres/doleances",   label: "Doléances",      icon: "📨" },
];

const sidebarExtra = [
  { href: "/espace-membres/profil", label: "Mon profil", icon: "👤" },
];

interface Props {
  mobile?: boolean;
  role?: string;
}

export default function SidebarNav({ mobile, role }: Props) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  if (mobile) {
    return (
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
              isActive(item.href, item.exact) ? "text-arc-gold" : "text-white/40 hover:text-white"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[9px] font-bold">{item.label}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="px-3 space-y-0.5">
      {[...navItems, ...sidebarExtra].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            isActive(item.href, (item as { exact?: boolean }).exact)
              ? "bg-white/15 text-white font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          <span className="text-base w-5 text-center">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}

      {(role === "admin" || role === "pasteur") && (
        <>
          <div className="mx-3 my-3 border-t border-white/10" />
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-arc-gold/70 hover:text-arc-gold hover:bg-white/10 transition-colors"
          >
            <span className="text-base w-5 text-center">🛡️</span>
            <span>Administration</span>
          </Link>
        </>
      )}
    </div>
  );
}
