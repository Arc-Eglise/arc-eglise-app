import { createClient } from "@/lib/supabase/server";
import { redirect }     from "next/navigation";
import Link             from "next/link";
import Icon             from "@/components/ui/Icon";

const NAV = [
  { href: "/admin",              icon: "votre-impact"         as const, label: "Tableau de bord" },
  { href: "/admin/crm",          icon: "gestion-utilisateurs" as const, label: "CRM — Membres" },
  { href: "/admin/doleances",    icon: "doleances"            as const, label: "Doléances" },
  { href: "/admin/sermons",      icon: "sermons-replay"       as const, label: "Sermons" },
  { href: "/admin/evenements",   icon: "agenda"               as const, label: "Événements" },
  { href: "/admin/equipe",       icon: "notre-equipe"         as const, label: "Équipe pastorale" },
  { href: "/admin/temoignages",  icon: "temoignage"           as const, label: "Témoignages" },
  { href: "/admin/membres",      icon: "presences"            as const, label: "Validation membres" },
  { href: "/admin/site",         icon: "parametres"           as const, label: "Site vitrine" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, role, groups")
    .eq("id", user.id)
    .single();

  const canAccess =
    profile?.role === "admin" ||
    profile?.role === "pasteur" ||
    profile?.groups?.includes("support") ||
    profile?.groups?.includes("media") ||
    profile?.groups?.includes("communication");

  if (!canAccess) redirect("/espace-membres");

  const displayName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || profile?.email;

  return (
    <div className="min-h-screen flex bg-arc-bg">

      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-arc-navy flex flex-col hidden md:flex">
        <div className="px-5 py-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <span className="font-serif text-xs font-bold text-white">ARC</span>
            </div>
            <div>
              <div className="font-serif text-sm font-bold text-white tracking-[2px]">ARC</div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest">Admin CMS</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 mb-0.5"
            >
              <Icon name={item.icon} size={20} style={{ flexShrink: 0 }} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-5 border-t border-white/10">
          <div className="text-xs text-white/50 mb-1 truncate">{displayName}</div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
            {profile?.role}
          </div>
          <Link
            href="/"
            className="block text-center text-xs font-semibold py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors mb-1.5"
          >
            ← Voir le site
          </Link>
          <Link
            href="/api/auth/signout"
            className="block text-center text-xs font-semibold py-2 rounded-lg bg-white/5 text-white/40 hover:text-white/70 transition-colors"
          >
            Déconnexion
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-arc-navy px-5 py-3 flex items-center justify-between">
          <Link href="/" className="font-serif text-base font-bold text-white tracking-[2px]">ARC Admin</Link>
          <div className="flex gap-2">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-white/60 hover:text-white" title={n.label}>
                <Icon name={n.icon} size={22} />
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
