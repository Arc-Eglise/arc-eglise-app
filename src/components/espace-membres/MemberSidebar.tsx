"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, MessageSquare, Calendar, PlayCircle, BookOpen, BookMarked,
  Users, ClipboardCheck, Bell, Inbox, HandCoins, UserCheck, BarChart3,
  Settings, Mail, type LucideIcon,
} from "lucide-react";

/**
 * Barre de navigation FIXE de l'espace membre (gauche).
 * Réutilise les classes `.em-sb` / `.em-ni` / … de globals.css → rendu identique
 * à la vraie sidebar du dashboard. Les items-panneaux pointent vers
 * `/espace-membres?panel=<id>` (URL lue par EspaceMembresClient), les items-routes
 * vers leur page réelle. Le gating de permissions reproduit celui de NAV_ITEMS.
 */

export type MemberSidebarPerms = {
  canAdmin: boolean;
  peutVoirCRM: boolean;
  isManager: boolean;
  donsEnabled: boolean;
  hasGroups: boolean;
};

export type MemberSidebarUser = {
  displayName: string;
  initiale: string;
  role: string;
  avatarUrl?: string | null;
};

type Item = { id: string; lbl: string; Icon: LucideIcon; href: string; live?: boolean; count?: number };
type Group = { section: string; items: Item[] };

const P = (id: string) => `/espace-membres?panel=${id}`;

export default function MemberSidebar({
  perms,
  user,
  membresValides = 0,
}: {
  perms: MemberSidebarPerms;
  user: MemberSidebarUser;
  membresValides?: number;
}) {
  const pathname = usePathname();

  const groups: Group[] = [
    { section: "Principal", items: [
      { id: "accueil",      lbl: "Accueil",         Icon: Home,          href: P("accueil") },
      { id: "messagerie",   lbl: "Messagerie",      Icon: MessageSquare, href: P("messagerie") },
      { id: "agenda",       lbl: "Agenda",          Icon: Calendar,      href: P("agenda") },
      { id: "streaming",    lbl: "Streaming",       Icon: PlayCircle,    href: P("streaming"), live: true },
      { id: "priere",       lbl: "Prière & Bible",  Icon: BookOpen,      href: P("priere") },
      { id: "notes-taches", lbl: "Notes & Tâches",  Icon: BookMarked,    href: "/espace-membres/notes-taches" },
    ]},
    { section: "Communauté", items: [
      { id: "contacts",  lbl: "Contacts",  Icon: Users,          href: P("contacts"), count: membresValides },
      { id: "presences", lbl: "Présences", Icon: ClipboardCheck, href: perms.canAdmin ? "/espace-membres/presences" : P("presences") },
      { id: "activites", lbl: "Activités", Icon: Bell,           href: P("activites") },
    ]},
    { section: "Personnel", items: [
      { id: "doleances", lbl: "Doléances", Icon: Inbox, href: "/espace-membres/doleances" },
    ]},
    { section: "Gestion", items: [
      ...(perms.donsEnabled ? [{ id: "dons", lbl: "Dons", Icon: HandCoins, href: P("dons") }] : []),
      ...(perms.isManager ? [{ id: "gestion-groupe", lbl: "Mon Groupe", Icon: UserCheck, href: "/espace-membres/gestion-groupe" }] : []),
      ...(perms.peutVoirCRM ? [{ id: "crm", lbl: "CRM", Icon: BarChart3, href: "/espace-membres/crm" }] : []),
      ...(perms.canAdmin ? [{ id: "admin", lbl: "Administration", Icon: Settings, href: P("admin") }] : []),
    ]},
    ...((perms.canAdmin || perms.hasGroups)
      ? [{ section: "Messagerie", items: [{ id: "mail", lbl: "Boîtes Mail", Icon: Mail, href: P("mail") }] }]
      : []),
  ];

  async function signout() {
    await fetch("/api/auth/signout");
    window.location.href = "/";
  }

  return (
    <aside className="em-sb" style={{ position: "fixed", top: 0, left: 0, height: "100vh", width: 220, zIndex: 40 }}>
      {/* Marque */}
      <Link href="/" className="flex items-center gap-2 px-4 pt-4 pb-3" style={{ textDecoration: "none" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "#fff", color: "#1a237e", fontWeight: 800, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>ARC</div>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, lineHeight: 1.1 }}>
          ARC <span style={{ color: "rgba(255,255,255,.5)", fontWeight: 400 }}>Membres</span>
        </span>
      </Link>

      <div style={{ flex: 1, paddingTop: 4, overflowY: "auto" }}>
        {groups.map((g) => (
          <div key={g.section}>
            <div className="em-sb-section">{g.section}</div>
            {g.items.map((it) => {
              const active = it.href.startsWith("/espace-membres/") && pathname === it.href.split("?")[0];
              return (
                <Link key={it.id} href={it.href} className={`em-ni${active ? " active" : ""}`} style={{ textDecoration: "none" }}>
                  <span className="em-ni-ico"><it.Icon size={16} strokeWidth={1.75} /></span>
                  <span className="em-ni-lbl">{it.lbl}</span>
                  {it.live ? <span className="em-live">LIVE</span>
                    : it.count ? <span className="em-badge-soft">{it.count}</span>
                    : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Profil */}
      <Link href="/espace-membres/profil" className="em-sb-user">
        <div className="em-av" style={{ width: 34, height: 34, fontSize: 12 }}>
          {user.avatarUrl ? <Image src={user.avatarUrl} alt="" width={34} height={34} /> : user.initiale}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{user.role}</div>
        </div>
      </Link>
      <button className="em-ni" style={{ margin: "4px 8px 12px", color: "rgba(255,255,255,.35)", fontSize: 12 }} onClick={signout}>
        <span className="em-ni-ico" style={{ fontSize: 12 }}>←</span>
        <span>Déconnexion</span>
      </button>
    </aside>
  );
}
