import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackButton from "@/components/ui/BackButton";
import { updateProfile } from "@/lib/actions/membres";
import { uploadMemberAvatar } from "@/lib/actions/cms";
import AvatarUpload from "@/components/membres/AvatarUpload";
import { getSpiritualProfile } from "@/lib/spiritual-profile";
import SpiritualProfileSection from "@/components/profil/SpiritualProfileSection";
import GroupBadge from "@/components/GroupBadge";
import { listMyFormations } from "@/lib/actions/formations";
import { computeSessionDates, formationLocation, DAY_LABELS } from "@/lib/formations-constants";

export default async function ProfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: profile }, spiritualProfile, myFormationsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, email, role, groups, validated, country, phone, avatar_url")
      .eq("id", user.id)
      .single(),
    getSpiritualProfile(user.id),
    listMyFormations(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const myFormData = myFormationsRes && "data" in myFormationsRes ? myFormationsRes.data : null;
  const myFormations = (myFormData?.formations ?? []).map((f) => {
    const done = myFormData?.myCompleted?.[f.id] ?? 0;
    const total = f.total_days ?? null;
    const startFrom = myFormData?.myStartFrom?.[f.id] ?? null;
    const from = startFrom && startFrom > today ? startFrom : today;
    const nextDate = computeSessionDates(f, { from })[0] ?? null;
    return {
      id: f.id, title: f.title, location: formationLocation(f.location),
      days: (f.days ?? []).map((d) => DAY_LABELS[d] ?? d).join(", "),
      time: f.time_start ? f.time_start.slice(0, 5) : null,
      pending: (myFormData?.myEnrollStatus?.[f.id] ?? "active") === "pending",
      done, total, pct: total && total > 0 ? Math.round((done / total) * 100) : 0, nextDate,
    };
  });

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
      <BackButton href="/espace-membres" label="Espace membres" className="mb-5" />
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

          {myFormations.length > 0 && (
            <div className="bg-white border border-arc-border rounded-2xl p-5">
              <h2 className="font-bold text-arc-navy mb-1">🎓 Mes formations</h2>
              <p className="text-sm text-arc-text2 mb-4">Ta progression et tes prochaines séances.</p>
              <div className="space-y-3">
                {myFormations.map((f) => (
                  <div key={f.id} className="border border-arc-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-arc-navy truncate">{f.title}</div>
                        <div className="text-xs text-arc-text3 mt-0.5">
                          📍 {f.location}
                          {f.days ? ` · ${f.days}` : ""}{f.time ? ` · ${f.time}` : ""}
                        </div>
                      </div>
                      {f.pending ? (
                        <span className="text-[11px] font-bold text-[#b45309] bg-[#fef3c7] px-2.5 py-1 rounded-full whitespace-nowrap">⏳ En attente</span>
                      ) : f.total != null && (
                        <span className="text-sm font-bold text-arc-navy whitespace-nowrap">{f.done}/{f.total} j</span>
                      )}
                    </div>
                    {f.pending ? (
                      <div className="text-xs text-arc-text2 mt-2">Ton inscription doit être validée par le formateur.</div>
                    ) : (
                      <>
                        {f.total != null ? (
                          <div className="mt-2 h-2 rounded-full bg-arc-bg overflow-hidden">
                            <div className="h-full rounded-full bg-arc-navy" style={{ width: `${f.pct}%` }} />
                          </div>
                        ) : (
                          <div className="text-xs text-arc-text2 mt-1">{f.done} jour(s) effectué(s)</div>
                        )}
                        {f.nextDate && (
                          <div className="text-xs text-arc-text2 mt-2">
                            Prochaine séance : <span className="font-semibold text-arc-navy">
                              {new Date(f.nextDate + "T00:00:00").toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" })}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
