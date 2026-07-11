import { createClient }                                    from "@/lib/supabase/server";
import { redirect }                                           from "next/navigation";
import { createTeamMember, updateTeamMember, deleteTeamMember } from "@/lib/actions/cms";
import Link                                                   from "next/link";

/* ─── Server Actions ─────────────────────────────────────────── */
async function handleCreate(formData: FormData) {
  "use server";
  const result = await createTeamMember(formData);
  if (result?.error) redirect(`/espace-membres/equipe?error=${encodeURIComponent(result.error)}`);
  redirect("/espace-membres/equipe");
}

async function handleUpdate(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const result = await updateTeamMember(id, formData);
  if (result?.error) redirect(`/espace-membres/equipe?error=${encodeURIComponent(result.error)}`);
  redirect("/espace-membres/equipe");
}

async function handleDelete(formData: FormData) {
  "use server";
  const result = await deleteTeamMember(formData.get("id") as string);
  if (result?.error) redirect(`/espace-membres/equipe?error=${encodeURIComponent(result.error)}`);
  redirect("/espace-membres/equipe");
}

/* ─── Types ───────────────────────────────────────────────────── */
interface TeamMember {
  id: string; name: string; role_label: string;
  bio: string | null; initials: string; sort_order: number;
  avatar_url: string | null;
}

/* ─── Shared form fields ──────────────────────────────────────── */
function TeamMemberFields({ m }: { m?: TeamMember }) {
  const inp = "w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors";
  return (
    <>
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Photo</label>
        <input name="photo" type="file" accept="image/*"
          className="w-full text-sm text-arc-text2 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-arc-blueBg file:text-arc-navy hover:file:bg-arc-bluePale cursor-pointer" />
        <p className="text-[10px] text-arc-text3 mt-0.5">JPG, PNG, WebP — max 5 Mo</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Nom complet *</label>
        <input name="name" required defaultValue={m?.name} placeholder="Pedro Obova" className={inp} />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Titre / Rôle *</label>
        <input name="role_label" required defaultValue={m?.role_label} placeholder="Pasteur Principal" className={inp} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Initiales *</label>
          <input name="initials" required maxLength={2} defaultValue={m?.initials} placeholder="PO" className={`${inp} uppercase`} />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Ordre</label>
          <input name="sort_order" type="number" defaultValue={m?.sort_order ?? 5} min="1" className={inp} />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Biographie</label>
        <textarea name="bio" rows={4} defaultValue={m?.bio ?? ""} placeholder="Présentation…"
          className={`${inp} resize-none`} />
      </div>
    </>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */
export default async function EspaceMembresEquipe({
  searchParams,
}: {
  searchParams: { edit?: string; error?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles").select("role, groups").eq("id", user.id).single();

  const canManage =
    profile?.role === "admin" ||
    profile?.role === "pasteur" ||
    (profile?.groups as string[] | null)?.includes("support") ||
    (profile?.groups as string[] | null)?.includes("media") ||
    (profile?.groups as string[] | null)?.includes("communication");

  if (!canManage) redirect("/espace-membres");

  const { data: members } = await supabase
    .from("team_members").select("*").order("sort_order", { ascending: true });

  const editId = searchParams.edit;
  const editMember = editId ? (members ?? []).find(m => m.id === editId) as TeamMember | undefined : undefined;
  const errorMsg = searchParams.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <div className="min-h-screen bg-arc-bg">
      {/* Header */}
      <div className="bg-white border-b border-arc-border px-6 py-4 flex items-center gap-3">
        <Link href="/espace-membres" className="text-arc-text3 hover:text-arc-navy text-sm transition-colors">
          ← Espace membres
        </Link>
        <span className="text-arc-border">/</span>
        <span className="text-sm font-semibold text-arc-navy">Équipe pastorale</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-arc-navy">Équipe pastorale</h1>
            <p className="text-sm text-arc-text2 mt-0.5">{(members ?? []).length} membre(s)</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* ── Liste ── */}
          <div className="space-y-4">
            {(members ?? []).length === 0 && (
              <div className="text-center text-sm text-arc-text3 py-12 bg-white rounded-2xl border border-arc-border">
                Aucun membre. Ajoutes-en un ci-contre →
              </div>
            )}

            {(members ?? []).map((m: TeamMember) => (
              <div key={m.id} className={`bg-white rounded-2xl border transition-all ${editId === m.id ? "border-arc-navy ring-2 ring-arc-navy/20" : "border-arc-border"}`}>

                {/* Vue normale */}
                {editId !== m.id && (
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-arc-navy to-arc-blue flex items-center justify-center font-serif text-base font-bold text-white flex-shrink-0">
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-base font-bold text-arc-navy leading-tight">{m.name}</div>
                      <div className="text-[10px] font-bold tracking-wider uppercase text-arc-blue">{m.role_label}</div>
                      {m.bio && <p className="text-xs text-arc-text2 mt-0.5 line-clamp-2">{m.bio}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link
                        href={`/espace-membres/equipe?edit=${m.id}`}
                        className="text-[11px] px-3 py-1.5 rounded-lg border border-arc-border text-arc-navy hover:border-arc-navy hover:bg-arc-blueBg transition-colors font-semibold"
                      >
                        ✏️ Modifier
                      </Link>
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="text-[11px] px-3 py-1.5 rounded-lg border border-arc-border text-arc-text3 hover:border-red-400 hover:text-red-600 transition-colors"
                        >
                          🗑 Supprimer
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Formulaire de modification inline */}
                {editId === m.id && editMember && (
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-arc-navy">Modifier : {editMember.name}</h3>
                      <Link href="/espace-membres/equipe" className="text-xs text-arc-text3 hover:text-arc-navy">
                        ✕ Annuler
                      </Link>
                    </div>
                    <form action={handleUpdate} encType="multipart/form-data" className="flex flex-col gap-3">
                      <input type="hidden" name="id" value={editMember.id} />
                      <TeamMemberFields m={editMember} />
                      <button type="submit"
                        className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
                        💾 Enregistrer les modifications
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Formulaire d'ajout ── */}
          <div className="bg-white rounded-2xl border border-arc-border p-5 self-start">
            <h2 className="font-bold text-arc-navy mb-4">Ajouter un membre</h2>
            <form action={handleCreate} encType="multipart/form-data" className="flex flex-col gap-3">
              <TeamMemberFields />
              <button type="submit"
                className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
                ➕ Ajouter le membre
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
