import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AvatarUpload from "@/components/membres/AvatarUpload";
import { uploadMemberAvatar } from "@/lib/actions/cms";

export default async function EspaceMembresPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: profile }, { count: membresCount }, { data: events }] = await Promise.all([
    supabase.from("profiles")
      .select("first_name, last_name, email, role, validated, groups, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase.from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("validated", true),
    supabase.from("events")
      .select("id, title, date, time_start, location")
      .gte("date", new Date().toISOString().split("T")[0])
      .eq("is_published", true)
      .order("date")
      .limit(3),
  ]);

  async function handleAvatarUpload(formData: FormData): Promise<void> {
    "use server";
    await uploadMemberAvatar(formData);
  }

  const roleLabels: Record<string, string> = {
    admin:    "👑 Administrateur",
    pasteur:  "✝️ Pasteur",
    membre:   "✅ Membre",
    visiteur: "⏳ Visiteur",
  };

  const initiale = (profile?.first_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase();

  const tiles = [
    { icon: "👥", label: "Annuaire",   href: "/espace-membres/annuaire",   active: true },
    { icon: "📅", label: "Agenda",     href: "/espace-membres/agenda",     active: true },
    { icon: "💬", label: "Messagerie", href: "/espace-membres/messagerie", active: true },
    { icon: "🙏", label: "Prière",     href: "/espace-membres/priere",     active: true },
    { icon: "📺", label: "Streaming",  href: "/espace-membres/streaming",  active: true },
    { icon: "👤", label: "Mon profil", href: "/espace-membres/profil",     active: true },
    { icon: "📖", label: "Bible",      href: "#", active: false },
    { icon: "🎵", label: "Chorale",    href: "#", active: false },
  ];

  return (
    <div>
      {/* Welcome card */}
      <div className="bg-white border border-arc-border rounded-2xl p-5 mb-5 flex items-center gap-5">
        <AvatarUpload
          currentUrl={profile?.avatar_url ?? null}
          initiale={initiale}
          action={handleAvatarUpload}
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-2xl font-bold text-arc-navy">
            Bonjour, {profile?.first_name ?? "ami(e)"} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-arc-blueBg text-arc-navy border border-arc-bluePale">
              {roleLabels[profile?.role ?? "visiteur"]}
            </span>
            {profile?.groups?.map((g: string) => (
              <span key={g} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-arc-gold/10 text-arc-goldDark border border-arc-gold/20">
                {g}
              </span>
            ))}
          </div>
        </div>
        <div className="hidden sm:block text-center flex-shrink-0 px-4">
          <div className="font-serif text-3xl font-bold text-arc-navy">{membresCount ?? 0}</div>
          <div className="text-[9px] text-arc-text3 font-bold uppercase tracking-wide">Membres</div>
        </div>
      </div>

      {/* Pending validation */}
      {!profile?.validated && profile?.role !== "admin" && !profile?.groups?.includes("support") && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5 flex gap-3">
          <span className="text-2xl flex-shrink-0">⏳</span>
          <div>
            <div className="font-bold text-amber-800 mb-1">Compte en attente de validation</div>
            <p className="text-sm text-amber-700 leading-relaxed">
              Le Pasteur Pedro Obova va vérifier ton profil. Tu recevras une notification dès que ton accès est validé.
            </p>
          </div>
        </div>
      )}

      {/* Feature tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {tiles.map((tile) =>
          tile.active ? (
            <Link
              key={tile.label}
              href={tile.href}
              className="bg-white border border-arc-border rounded-2xl p-5 flex flex-col items-center gap-2 text-center hover:border-arc-blue hover:-translate-y-0.5 hover:shadow-arc transition-all duration-200"
            >
              <div className="text-3xl">{tile.icon}</div>
              <div className="text-sm font-bold text-arc-navy">{tile.label}</div>
            </Link>
          ) : (
            <div
              key={tile.label}
              className="bg-white border border-arc-border rounded-2xl p-5 flex flex-col items-center gap-2 text-center opacity-50 cursor-not-allowed"
            >
              <div className="text-3xl">{tile.icon}</div>
              <div className="text-sm font-bold text-arc-navy">{tile.label}</div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-arc-text3">Bientôt</span>
            </div>
          )
        )}
      </div>

      {/* Upcoming events */}
      {events && events.length > 0 && (
        <div className="bg-white border border-arc-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-arc-border flex items-center justify-between">
            <h2 className="font-bold text-sm text-arc-navy">📅 Prochains événements</h2>
            <Link href="/espace-membres/agenda" className="text-[11px] font-bold text-arc-blue hover:underline">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-arc-border">
            {events.map((ev) => (
              <div key={ev.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="text-center w-10 flex-shrink-0">
                  <div className="font-serif text-xl font-bold text-arc-navy leading-none">
                    {new Date(ev.date).getDate()}
                  </div>
                  <div className="text-[9px] text-arc-blue font-bold uppercase">
                    {new Date(ev.date).toLocaleDateString("fr-CH", { month: "short" })}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-arc-navy">{ev.title}</div>
                  <div className="text-xs text-arc-text3">{ev.time_start?.slice(0, 5)} · {ev.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
