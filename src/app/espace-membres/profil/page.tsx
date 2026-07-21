import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { updateProfile } from "@/lib/actions/membres";
import { uploadMemberAvatar } from "@/lib/actions/cms";
import AvatarUpload from "@/components/membres/AvatarUpload";
import { getSpiritualProfile } from "@/lib/spiritual-profile";
import SpiritualProfileSection from "@/components/profil/SpiritualProfileSection";
import GroupBadge from "@/components/GroupBadge";

export default async function ProfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: profile }, spiritualProfile] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, email, role, groups, validated, country, phone, avatar_url")
      .eq("id", user.id)
      .single(),
    getSpiritualProfile(user.id),
  ]);

  const roleLabels: Record<string, string> = {
    admin:    "👑 Administrateur",
    pasteur:  "✝️ Pasteur",
    membre:   "✅ Membre",
    visiteur: "⏳ Visiteur",
  };

  const initiale = (profile?.first_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase();
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email;

  async function handleUpdate(formData: FormData): Promise<void> {
    "use server";
    await updateProfile(formData);
  }

  async function handleAvatarUpload(formData: FormData): Promise<void> {
    "use server";
    await uploadMemberAvatar(formData);
  }

  return (
    <div>
      <Link href="/espace-membres" className="inline-flex items-center gap-1.5 text-sm text-arc-blue hover:text-arc-navy mb-5 transition-colors">
        ← Espace Membres
      </Link>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Mon profil</h1>
        <p className="text-sm text-arc-text2 mt-0.5">Gérer mes informations personnelles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

        {/* Colonne gauche : avatar + statut */}
        <div className="space-y-4">
          <div className="bg-white border border-arc-border rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
            <AvatarUpload
              currentUrl={profile?.avatar_url ?? null}
              initiale={initiale}
              action={handleAvatarUpload}
            />
            <div>
              <div className="font-bold text-arc-navy">{fullName}</div>
              <div className="text-xs text-arc-text3 mt-0.5">{profile?.email}</div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-arc-blueBg text-arc-navy border border-arc-bluePale">
              {roleLabels[profile?.role ?? "visiteur"]}
            </span>
            <p className="text-[11px] text-arc-text3">
              Survole ta photo et clique pour la modifier
            </p>
          </div>

          {profile?.groups && profile.groups.length > 0 && (
            <div className="bg-white border border-arc-border rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-2">Groupes</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.groups.map((g: string) => (
                  <GroupBadge key={g} name={g} size="sm" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : formulaire */}
        <div className="space-y-4">
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-bold text-arc-navy mb-4">Informations personnelles</h2>
            <form action={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Prénom</label>
                <input
                  name="first_name"
                  defaultValue={profile?.first_name ?? ""}
                  placeholder="Prénom"
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Nom</label>
                <input
                  name="last_name"
                  defaultValue={profile?.last_name ?? ""}
                  placeholder="Nom de famille"
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Téléphone</label>
                <input
                  name="phone"
                  defaultValue={(profile as { phone?: string })?.phone ?? ""}
                  placeholder="+41 79 000 00 00"
                  type="tel"
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Pays d'origine</label>
                <input
                  name="country"
                  defaultValue={profile?.country ?? ""}
                  placeholder="Congo, France, Suisse..."
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Email</label>
                <input
                  value={profile?.email ?? user.email ?? ""}
                  disabled
                  className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm bg-arc-bg text-arc-text3 cursor-not-allowed"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>

          <SpiritualProfileSection initialProfile={spiritualProfile} />

          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-bold text-arc-navy mb-1">Mot de passe</h2>
            <p className="text-sm text-arc-text2 mb-3">
              Un lien de réinitialisation sera envoyé à {profile?.email ?? user.email}.
            </p>
            <a
              href="/mot-de-passe-oublie"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-arc-border text-sm font-semibold text-arc-navy hover:bg-arc-bg transition-colors"
            >
              🔑 Changer le mot de passe
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
