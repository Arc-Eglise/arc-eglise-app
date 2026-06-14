import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { updateMemberGroups, addMemberNote, deleteMemberNote } from "@/lib/actions/crm";
import { validateMember, rejectMember } from "@/lib/actions/cms";

const GROUPS = [
  "media", "communication", "louange", "accueil",
  "coordination", "pastorale", "finances", "jeunesse", "intercession",
];

const NOTE_TYPES = [
  { value: "general",   label: "Général" },
  { value: "prayer",    label: "Prière" },
  { value: "pastoral",  label: "Pastoral" },
  { value: "contact",   label: "Contact" },
];

const roleStyle: Record<string, string> = {
  admin:   "bg-red-100 text-red-700",
  pasteur: "bg-purple-100 text-purple-700",
  membre:  "bg-green-100 text-green-700",
  visiteur:"bg-amber-100 text-amber-700",
};

export default async function CrmMemberPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: member }, { data: notes }] = await Promise.all([
    supabase.from("profiles")
      .select("id, first_name, last_name, email, role, groups, validated, country, phone, avatar_url, created_at")
      .eq("id", params.id)
      .single(),
    supabase.from("member_notes")
      .select("*, profiles!author_id(first_name, last_name)")
      .eq("member_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!member) notFound();

  const fullName = [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email;
  const initiale = (member.first_name?.[0] ?? member.email[0]).toUpperCase();

  async function handleUpdateGroups(formData: FormData): Promise<void> {
    "use server";
    const selected = GROUPS.filter((g) => formData.get(g) === "on");
    await updateMemberGroups(params.id, selected);
  }

  async function handleAddNote(formData: FormData): Promise<void> {
    "use server";
    await addMemberNote(formData);
  }

  async function handleDeleteNote(formData: FormData): Promise<void> {
    "use server";
    await deleteMemberNote(formData.get("note_id") as string, params.id);
  }

  async function handleValidate(formData: FormData): Promise<void> {
    "use server";
    await validateMember(formData.get("id") as string);
  }

  async function handleReject(formData: FormData): Promise<void> {
    "use server";
    await rejectMember(formData.get("id") as string);
  }

  const noteTypeStyle: Record<string, string> = {
    general:  "bg-arc-blueBg text-arc-navy",
    prayer:   "bg-purple-100 text-purple-700",
    pastoral: "bg-green-100 text-green-700",
    contact:  "bg-amber-100 text-amber-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/crm" className="text-arc-text3 hover:text-arc-navy text-sm">← CRM</Link>
        <span className="text-arc-border">/</span>
        <span className="text-sm text-arc-navy font-semibold">{fullName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

        {/* Left: profile card */}
        <div className="space-y-4">
          <div className="bg-white border border-arc-border rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-arc-navy flex items-center justify-center overflow-hidden">
              {member.avatar_url
                ? <Image src={member.avatar_url} alt="" width={64} height={64} className="w-full h-full object-cover" />
                : <span className="font-serif text-xl font-bold text-white">{initiale}</span>
              }
            </div>
            <div>
              <div className="font-bold text-arc-navy">{fullName}</div>
              <div className="text-xs text-arc-text3 mt-0.5">{member.email}</div>
              {member.country && <div className="text-xs text-arc-text3">📍 {member.country}</div>}
              {(member as { phone?: string }).phone && <div className="text-xs text-arc-text3">📞 {(member as { phone?: string }).phone}</div>}
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${roleStyle[member.role] ?? "bg-arc-blueBg text-arc-navy"}`}>
              {member.role}
            </span>
            <div className="text-[10px] text-arc-text3">
              Inscrit le {new Date(member.created_at).toLocaleDateString("fr-CH")}
            </div>
          </div>

          {/* Validation */}
          {!member.validated && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="text-xs font-bold text-amber-800 mb-3">⏳ En attente de validation</div>
              <div className="flex gap-2">
                <form action={handleValidate} className="flex-1">
                  <input type="hidden" name="id" value={member.id} />
                  <button className="w-full py-2 rounded-lg bg-green-100 text-green-700 text-xs font-bold border border-green-200 hover:bg-green-200 transition-colors">
                    ✅ Valider
                  </button>
                </form>
                <form action={handleReject} className="flex-1">
                  <input type="hidden" name="id" value={member.id} />
                  <button className="w-full py-2 rounded-lg bg-red-50 text-arc-red text-xs font-bold border border-red-200 hover:bg-red-100 transition-colors">
                    ✕ Rejeter
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right: groups + notes */}
        <div className="space-y-4">

          {/* Groups editor */}
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-bold text-arc-navy mb-4">Groupes de fonction</h2>
            <form action={handleUpdateGroups} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GROUPS.map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-arc-bg transition-colors">
                    <input
                      type="checkbox"
                      name={g}
                      defaultChecked={member.groups?.includes(g)}
                      className="accent-arc-navy"
                    />
                    <span className="text-sm text-arc-navy capitalize">{g}</span>
                  </label>
                ))}
              </div>
              <button type="submit" className="px-5 py-2 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors">
                Enregistrer les groupes
              </button>
            </form>
          </div>

          {/* Notes */}
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-bold text-arc-navy mb-4">Notes pastorales</h2>

            {/* Add note form */}
            <form action={handleAddNote} className="flex flex-col gap-3 mb-5 pb-5 border-b border-arc-border">
              <input type="hidden" name="member_id" value={member.id} />
              <div className="flex gap-2">
                <select name="type" className="px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy bg-white flex-shrink-0">
                  {NOTE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <textarea
                  name="content"
                  required
                  rows={2}
                  maxLength={2000}
                  placeholder="Ajouter une note..."
                  className="flex-1 px-3 py-2 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy transition-colors resize-none"
                />
              </div>
              <button type="submit" className="self-start px-4 py-2 rounded-lg bg-arc-navy text-white text-xs font-bold hover:bg-arc-navy2 transition-colors">
                ➕ Ajouter la note
              </button>
            </form>

            {/* Notes list */}
            {notes && notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note) => {
                  const authorProfile = (note as { profiles: { first_name: string | null; last_name: string | null } | null }).profiles;
                  const authorName = [authorProfile?.first_name, authorProfile?.last_name].filter(Boolean).join(" ") || "Admin";
                  return (
                    <div key={note.id} className="border border-arc-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${noteTypeStyle[note.type] ?? "bg-arc-blueBg text-arc-navy"}`}>
                            {NOTE_TYPES.find(t => t.value === note.type)?.label ?? note.type}
                          </span>
                          <span className="text-[11px] text-arc-text3">{authorName} · {new Date(note.created_at).toLocaleDateString("fr-CH")}</span>
                        </div>
                        <form action={handleDeleteNote} className="flex-shrink-0">
                          <input type="hidden" name="note_id" value={note.id} />
                          <button className="text-[11px] px-2 py-0.5 rounded border border-arc-border text-arc-text3 hover:border-arc-red hover:text-arc-red transition-colors">
                            ✕
                          </button>
                        </form>
                      </div>
                      <p className="text-sm text-arc-text2 leading-relaxed">{note.content}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-sm text-arc-text3 py-4">
                Aucune note. Ajoute la première ci-dessus.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
