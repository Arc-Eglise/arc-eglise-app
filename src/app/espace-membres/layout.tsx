import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SidebarNav from "@/components/membres/SidebarNav";

export default async function EspaceMembresLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, role, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email
    : user.email ?? "";

  const initiale = (profile?.first_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-arc-bg flex">

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex flex-col w-60 bg-arc-navy3 fixed inset-y-0 left-0 z-30">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-arc-gold flex items-center justify-center flex-shrink-0">
              <span className="font-serif text-xs font-bold text-arc-navy">ARC</span>
            </div>
            <div>
              <div className="font-serif text-sm font-bold text-white tracking-wider">ARC Église</div>
              <div className="text-[9px] text-white/40 uppercase tracking-widest">Espace Membres</div>
            </div>
          </Link>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <SidebarNav role={profile?.role} />
        </div>

        <div className="px-4 py-4 border-t border-white/10 space-y-1">
          <Link
            href="/espace-membres/profil"
            className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-arc-blue flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.avatar_url
                ? <Image src={profile.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-white">{initiale}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{displayName}</div>
              <div className="text-[10px] text-white/40 truncate">{profile?.email}</div>
            </div>
          </Link>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs"
          >
            ← Déconnexion
          </Link>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-arc-navy3 border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-arc-gold flex items-center justify-center">
              <span className="font-serif text-[10px] font-bold text-arc-navy">ARC</span>
            </div>
            <span className="font-serif text-sm font-bold text-white">Espace Membres</span>
          </Link>
          <Link href="/espace-membres/profil">
            <div className="w-8 h-8 rounded-full bg-arc-blue flex items-center justify-center overflow-hidden border border-white/20">
              {profile?.avatar_url
                ? <Image src={profile.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-white">{initiale}</span>
              }
            </div>
          </Link>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-arc-navy3 border-t border-white/10 z-30">
        <SidebarNav mobile role={profile?.role} />
      </nav>
    </div>
  );
}
