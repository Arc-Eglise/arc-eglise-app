import { createClient }      from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { redirect }            from "next/navigation";
import Link                    from "next/link";
import {
  assignGroupManager,
  revokeGroupManager,
  addMemberToGroup,
  removeMemberFromGroup,
} from "@/lib/actions/membres";

/* ─── Données statiques ───────────────────────────────────────────── */
const GROUP_LABELS: Record<string, string> = {
  pasteur:"Pasteur", chorale:"Chorale", media:"Équipe Média",
  social:"Social & Hospitalité", hospitalite:"Hospitalité",
  sanitaire:"Sanitaire & Propreté", finance:"Finance", support:"Support",
  jeunesse:"La Jeunesse", femmes:"Groupe des Femmes",
  ecodim:"Écodim", suivi:"Suivi d'âmes", communication:"Communication",
};
const GROUP_EMOJIS: Record<string, string> = {
  pasteur:"👑", chorale:"🎵", media:"🎬", social:"🤝", hospitalite:"🤝",
  sanitaire:"🏥", finance:"💰", support:"🛠️", jeunesse:"⚡", femmes:"🌸",
  ecodim:"📚", suivi:"🕊️", communication:"📣",
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  validated: boolean;
  groups: string[] | null;
  managed_groups: string[] | null;
};

function fullName(p: Profile) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Membre";
}
function initials(p: Profile) {
  return ((p.first_name?.[0] ?? "") + (p.last_name?.[0] ?? "")).toUpperCase() || "?";
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default async function GestionGroupePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles")
    .select("id, first_name, last_name, role, validated, managed_groups")
    .eq("id", user.id).single();

  const validated = me?.validated || ["admin", "pasteur"].includes(me?.role ?? "");
  if (!validated) redirect("/espace-membres");

  const myManagedGroups = (me?.managed_groups as string[]) ?? [];
  if (myManagedGroups.length === 0) redirect("/espace-membres");

  const admin = createAdminClient();
  const { data: allProfiles } = await admin.from("profiles")
    .select("id, first_name, last_name, role, validated, groups, managed_groups")
    .eq("validated", true)
    .order("last_name");

  const profiles: Profile[] = (allProfiles ?? []) as Profile[];

  /* ─── Server Actions ─────────────────────────────────────────────── */
  async function handleAssignManager(formData: FormData): Promise<void> {
    "use server";
    await assignGroupManager(
      formData.get("targetId") as string,
      formData.get("groupName") as string,
    );
    redirect("/espace-membres/gestion-groupe");
  }

  async function handleRevokeManager(formData: FormData): Promise<void> {
    "use server";
    await revokeGroupManager(
      formData.get("targetId") as string,
      formData.get("groupName") as string,
    );
    redirect("/espace-membres/gestion-groupe");
  }

  async function handleAddMember(formData: FormData): Promise<void> {
    "use server";
    await addMemberToGroup(
      formData.get("targetId") as string,
      formData.get("groupName") as string,
    );
    redirect("/espace-membres/gestion-groupe");
  }

  async function handleRemoveMember(formData: FormData): Promise<void> {
    "use server";
    await removeMemberFromGroup(
      formData.get("targetId") as string,
      formData.get("groupName") as string,
    );
    redirect("/espace-membres/gestion-groupe");
  }

  /* ─── Build group data ───────────────────────────────────────────── */
  const groupsData = myManagedGroups.map(groupName => {
    const members  = profiles.filter(p => (p.groups ?? []).includes(groupName));
    const managers = profiles.filter(p => (p.managed_groups ?? []).includes(groupName));
    const available = profiles.filter(p =>
      !(p.groups ?? []).includes(groupName) &&
      !["admin", "pasteur"].includes(p.role)
    );
    return { groupName, members, managers, available };
  });

  const inp = "w-full px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white transition-colors";

  return (
    <div className="min-h-screen bg-arc-bg">

      {/* En-tête */}
      <div className="bg-white border-b border-arc-border px-6 py-4 flex items-center gap-3">
        <Link href="/espace-membres" className="text-arc-text3 hover:text-arc-navy text-sm transition-colors">
          ← Espace membres
        </Link>
        <span className="text-arc-border">/</span>
        <span className="text-sm font-semibold text-arc-navy">Gestion de mon groupe</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        <div>
          <h1 className="font-serif text-2xl font-bold text-arc-navy">👑 Gestion de mon groupe</h1>
          <p className="text-sm text-arc-text2 mt-1">
            Vous gérez {myManagedGroups.length} groupe{myManagedGroups.length > 1 ? "s" : ""}.
            Vous pouvez ajouter/retirer des membres et nommer un co-manager (max 2 par groupe).
          </p>
        </div>

        {groupsData.map(({ groupName, members, managers, available }) => {
          const managerCount = managers.length;
          const label = GROUP_LABELS[groupName] ?? groupName;
          const emoji = GROUP_EMOJIS[groupName] ?? "📌";

          return (
            <div key={groupName} className="bg-white border border-arc-border rounded-2xl overflow-hidden">

              {/* Titre du groupe */}
              <div className="px-5 py-4 border-b border-arc-border bg-arc-bg flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg font-bold text-arc-navy">
                    {emoji} {label}
                  </h2>
                  <p className="text-xs text-arc-text3 mt-0.5">
                    {members.length} membre{members.length !== 1 ? "s" : ""} · {managerCount}/2 manager{managerCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-6">

                {/* ── Managers ── */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-arc-blue mb-2">
                    Managers ({managerCount}/2)
                  </h3>
                  {managers.length === 0 ? (
                    <p className="text-sm text-arc-text3">Aucun manager désigné.</p>
                  ) : (
                    <div className="space-y-2">
                      {managers.map(mgr => (
                        <div key={mgr.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {initials(mgr)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-arc-navy">{fullName(mgr)}</div>
                              <div className="text-[11px] text-amber-700 font-semibold">
                                👑 Manager
                                {mgr.id === user.id && " (vous)"}
                              </div>
                            </div>
                          </div>
                          <form action={handleRevokeManager}>
                            <input type="hidden" name="targetId"  value={mgr.id} />
                            <input type="hidden" name="groupName" value={groupName} />
                            <button type="submit" className="text-[11px] px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-semibold">
                              Révoquer
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Membres du groupe ── */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-arc-blue mb-2">
                    Membres ({members.length})
                  </h3>
                  {members.length === 0 ? (
                    <p className="text-sm text-arc-text3">Aucun membre dans ce groupe.</p>
                  ) : (
                    <div className="space-y-2">
                      {members.map(m => {
                        const isMgr      = (m.managed_groups ?? []).includes(groupName);
                        const canPromote = !isMgr && managerCount < 2;
                        return (
                          <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-arc-bg border border-arc-border">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-arc-navy flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {initials(m)}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-arc-navy">{fullName(m)}</div>
                                <div className="text-[11px] text-arc-text3 capitalize">{m.role}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Nommer/révoquer manager */}
                              {isMgr ? (
                                <form action={handleRevokeManager}>
                                  <input type="hidden" name="targetId"  value={m.id} />
                                  <input type="hidden" name="groupName" value={groupName} />
                                  <button type="submit" className="text-[11px] px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors font-semibold">
                                    👑 Révoquer manager
                                  </button>
                                </form>
                              ) : (
                                <form action={handleAssignManager}>
                                  <input type="hidden" name="targetId"  value={m.id} />
                                  <input type="hidden" name="groupName" value={groupName} />
                                  <button
                                    type="submit"
                                    disabled={!canPromote}
                                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${canPromote ? "border border-arc-border text-arc-navy hover:border-arc-navy hover:bg-arc-blueBg cursor-pointer" : "border border-gray-200 text-gray-400 cursor-not-allowed"}`}
                                  >
                                    {managerCount >= 2 ? "Max atteint" : "Nommer manager"}
                                  </button>
                                </form>
                              )}
                              {/* Retirer du groupe */}
                              {m.id !== user.id && (
                                <form action={handleRemoveMember}>
                                  <input type="hidden" name="targetId"  value={m.id} />
                                  <input type="hidden" name="groupName" value={groupName} />
                                  <button type="submit" className="text-[11px] px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-semibold">
                                    Retirer
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Ajouter un membre ── */}
                {available.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-arc-blue mb-2">
                      Ajouter un membre
                    </h3>
                    <form action={handleAddMember} className="flex gap-2">
                      <input type="hidden" name="groupName" value={groupName} />
                      <select name="targetId" required className={`${inp} flex-1`}>
                        <option value="">— Choisir un membre à ajouter —</option>
                        {available.map(p => (
                          <option key={p.id} value={p.id}>
                            {fullName(p)}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="px-4 py-2 rounded-lg bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors flex-shrink-0">
                        Ajouter
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
