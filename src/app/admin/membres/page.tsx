import { createClient } from "@/lib/supabase/server";
import { validateMember, rejectMember } from "@/lib/actions/cms";

async function handleValidate(formData: FormData): Promise<void> {
  "use server";
  await validateMember(formData.get("id") as string);
}

async function handleReject(formData: FormData): Promise<void> {
  "use server";
  await rejectMember(formData.get("id") as string);
}

export default async function AdminMembres() {
  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, groups, validated, country, created_at")
    .order("created_at", { ascending: false });

  const pending   = profiles?.filter((p) => !p.validated && p.role === "visiteur") ?? [];
  const membres   = profiles?.filter((p) => p.validated) ?? [];

  type ProfileItem = NonNullable<typeof profiles>[number];
  const ProfileRow = ({ p, actions }: { p: ProfileItem; actions?: boolean }) => (
    <div className="px-5 py-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-full bg-arc-navy flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {(p.first_name?.[0] ?? p.email[0]).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-arc-navy">
          {p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.email}
        </div>
        <div className="text-[11px] text-arc-text3">{p.email} {p.country ? `· ${p.country}` : ""}</div>
        {p.groups?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {p.groups.map((g: string) => (
              <span key={g} className="text-[9px] bg-arc-blueBg text-arc-navy px-1.5 py-0.5 rounded font-bold">{g}</span>
            ))}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex gap-2 flex-shrink-0">
          <form action={handleValidate}>
            <input type="hidden" name="id" value={p.id} />
            <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 transition-colors">
              ✅ Valider
            </button>
          </form>
          <form action={handleReject}>
            <input type="hidden" name="id" value={p.id} />
            <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-arc-red border border-red-200 hover:bg-red-100 transition-colors">
              ✕
            </button>
          </form>
        </div>
      )}
      {!actions && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
          p.role === "admin"    ? "bg-red-100 text-red-700" :
          p.role === "pasteur" ? "bg-purple-100 text-purple-700" :
          p.validated           ? "bg-green-100 text-green-700" :
                                  "bg-amber-100 text-amber-700"
        }`}>
          {p.role === "admin" ? "👑 Admin" : p.role === "pasteur" ? "✝️ Pasteur" : p.validated ? "✅ Membre" : "⏳ Visiteur"}
        </span>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-arc-navy">Gestion des membres</h1>
        <p className="text-sm text-arc-text2 mt-0.5">{membres.length} membres validés · {pending.length} en attente</p>
      </div>

      {/* En attente de validation */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <span className="text-base">⏳</span>
            <h2 className="font-bold text-amber-800">En attente de validation ({pending.length})</h2>
          </div>
          <div className="divide-y divide-amber-100">
            {pending.map((p) => <ProfileRow key={p.id} p={p} actions />)}
          </div>
        </div>
      )}

      {!pending.length && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <span className="text-sm font-medium text-green-700">Aucun compte en attente de validation.</span>
        </div>
      )}

      {/* Tous les membres */}
      <div className="bg-white rounded-2xl border border-arc-border overflow-hidden">
        <div className="px-5 py-3 border-b border-arc-border">
          <h2 className="font-bold text-arc-navy">Tous les comptes ({profiles?.length ?? 0})</h2>
        </div>
        <div className="divide-y divide-arc-border">
          {(profiles ?? []).map((p) => <ProfileRow key={p.id} p={p} />)}
          {!profiles?.length && (
            <div className="px-5 py-12 text-center text-sm text-arc-text3">Aucun compte encore</div>
          )}
        </div>
      </div>
    </div>
  );
}
