import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function EspaceMembresPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, role, validated, groups")
    .eq("id", user.id)
    .single();

  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email
    : user.email;

  const roleLabels: Record<string, string> = {
    admin:    "👑 Administrateur",
    pasteur:  "✝️ Pasteur",
    membre:   "✅ Membre",
    visiteur: "⏳ Visiteur",
  };

  return (
    <div className="min-h-screen bg-arc-bg">

      {/* Top bar */}
      <header className="bg-arc-navy px-5 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-arc-navy to-arc-blue border border-white/20 flex items-center justify-center">
            <span className="font-serif text-xs font-bold text-white">ARC</span>
          </div>
          <span className="font-serif text-base font-bold text-white tracking-[2px]">Espace Membres</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-white/60 font-medium">{displayName}</span>
          <Link
            href="/api/auth/signout"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
          >
            Déconnexion
          </Link>
        </div>
      </header>

      <main className="max-w-8xl mx-auto px-5 md:px-10 py-10">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-arc-navy mb-1">
            Bienvenue, {profile?.first_name ?? "ami(e)"} 👋
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-arc-text2">Statut :</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-arc-blueBg text-arc-navy border border-arc-bluePale">
              {roleLabels[profile?.role ?? "visiteur"]}
            </span>
            {!profile?.validated && (
              <span className="text-xs text-arc-text3">— En attente de validation par le Pasteur</span>
            )}
          </div>
        </div>

        {/* Pending validation banner */}
        {!profile?.validated && profile?.role !== "admin" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex items-start gap-4">
            <div className="text-2xl">⏳</div>
            <div>
              <div className="font-bold text-amber-800 mb-1">Compte en attente de validation</div>
              <p className="text-sm text-amber-700 leading-relaxed">
                Ton compte a été créé avec succès ! Le Pasteur Pedro Obova va vérifier ton profil et valider ton accès à l'espace membres complet. Tu recevras un email dès que ton compte est validé.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard grid — fonctionnalités à venir */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: "💬", title: "Messagerie",    soon: true },
            { icon: "📅", title: "Agenda",         soon: false },
            { icon: "📖", title: "Bible",          soon: true },
            { icon: "🙏", title: "Prière",         soon: true },
            { icon: "🎵", title: "Chorale",        soon: true },
            { icon: "📺", title: "Streaming",      soon: false },
            { icon: "💛", title: "Dons",           soon: false },
            { icon: "👥", title: "Annuaire",       soon: true },
          ].map((item) => (
            <div
              key={item.title}
              className={`bg-white border rounded-2xl p-5 flex flex-col items-center gap-2 text-center transition-all duration-200 ${
                item.soon
                  ? "border-arc-border opacity-60 cursor-not-allowed"
                  : "border-arc-border hover:border-arc-blue hover:-translate-y-0.5 hover:shadow-arc cursor-pointer"
              }`}
            >
              <div className="text-3xl">{item.icon}</div>
              <div className="text-sm font-bold text-arc-navy">{item.title}</div>
              {item.soon && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-arc-text3">Bientôt</span>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-white border border-arc-border rounded-2xl p-6 text-center">
          <div className="text-3xl mb-3">🚧</div>
          <h2 className="font-serif text-xl font-bold text-arc-navy mb-2">Espace Membres en construction</h2>
          <p className="text-sm text-arc-text2 max-w-md mx-auto">
            Les fonctionnalités membres (messagerie, Bible, prière, agenda, streaming) sont en cours de développement et seront disponibles prochainement.
          </p>
        </div>
      </main>
    </div>
  );
}
