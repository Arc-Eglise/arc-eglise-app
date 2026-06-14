import { createClient }                        from "@/lib/supabase/server";
import { createTeamMember, deleteTeamMember } from "@/lib/actions/cms";

async function handleCreate(formData: FormData): Promise<void> {
  "use server";
  await createTeamMember(formData);
}

async function handleDelete(formData: FormData): Promise<void> {
  "use server";
  await deleteTeamMember(formData.get("id") as string);
}

export default async function AdminEquipe() {
  const supabase = createClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Équipe pastorale</h1>
        <p className="text-sm text-arc-text2 mt-0.5">{members?.length ?? 0} membre(s) de l'équipe</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* Liste */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(members ?? []).map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-arc-border overflow-hidden">
              <div className="h-[100px] bg-gradient-to-br from-arc-navy to-arc-blue flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center font-serif text-xl font-bold text-white">
                  {m.initials}
                </div>
              </div>
              <div className="p-4">
                <div className="font-serif text-lg font-bold text-arc-navy">{m.name}</div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-arc-blue mb-2">{m.role_label}</div>
                {m.bio && <p className="text-xs text-arc-text2 leading-relaxed">{m.bio}</p>}
              </div>
              <div className="px-4 py-2.5 border-t border-arc-border flex items-center justify-between">
                <span className="text-[10px] text-arc-text3">Ordre : {m.sort_order}</span>
                <form action={handleDelete}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="text-[11px] px-2.5 py-1 rounded-lg border border-arc-border text-arc-text3 hover:border-arc-red hover:text-arc-red transition-colors">
                    🗑 Supprimer
                  </button>
                </form>
              </div>
            </div>
          ))}
          {!members?.length && (
            <div className="col-span-2 text-center text-sm text-arc-text3 py-12 bg-white rounded-2xl border border-arc-border">
              Aucun membre d'équipe. Ajoutes-en un →
            </div>
          )}
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-arc-border p-5 self-start">
          <h2 className="font-bold text-arc-navy mb-4">Ajouter un membre</h2>
          <form action={handleCreate} className="flex flex-col gap-3">

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Nom complet *</label>
              <input name="name" required placeholder="Pedro Obova" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Titre / Rôle *</label>
              <input name="role_label" required placeholder="Pasteur Principal" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Initiales *</label>
                <input name="initials" required maxLength={2} placeholder="PO" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors uppercase" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Ordre d'affichage</label>
                <input name="sort_order" type="number" defaultValue="5" min="1" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-arc-blue mb-1">Biographie</label>
              <textarea name="bio" rows={4} placeholder="Présentation du pasteur…" className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none" />
            </div>

            <button type="submit" className="w-full py-3 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors mt-1">
              ➕ Ajouter le membre
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
