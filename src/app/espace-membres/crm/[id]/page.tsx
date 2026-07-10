import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { addMemberNote, deleteMemberNote, updateMemberValidation } from "@/lib/actions/membres";
import { DangerActionsPanel } from "@/components/crm/DangerActionsPanel";
import CrmTagsEditor from "../CrmTagsEditor";

const ROLE_STYLE: Record<string, string> = {
  admin:    "text-red-700 bg-red-50 border-red-200",
  pasteur:  "text-purple-700 bg-purple-50 border-purple-200",
  support:  "text-blue-700 bg-blue-50 border-blue-200",
  membre:   "text-green-700 bg-green-50 border-green-200",
  visiteur: "text-gray-700 bg-gray-50 border-gray-200",
};

const NOTE_TYPES = [
  { val: "general",   label: "Général" },
  { val: "pastoral",  label: "Pastoral" },
  { val: "suivi",     label: "Suivi" },
  { val: "priere",    label: "Prière" },
  { val: "admin",     label: "Admin" },
];

export default async function CrmMemberPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "pasteur"].includes(me?.role ?? "")) redirect("/espace-membres");

  const callerIsAdmin = me?.role === "admin";

  const admin = createAdminClient();

  const { data: member } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, validated, groups, avatar_url, country, crm_tags, created_at, email")
    .eq("id", params.id)
    .single();

  if (!member) notFound();

  // Fetch notes, attendance, prayer stats + ban status in parallel
  const [notesRes, attendRes, prayerRes, rsvpRes, authData] = await Promise.all([
    supabase.from("member_notes")
      .select("id, content, type, created_at, profiles!member_notes_author_id_fkey(first_name, last_name)")
      .eq("member_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("event_attendance")
      .select("event_id, checked_in_at, events(title, date)")
      .eq("user_id", params.id)
      .order("checked_in_at", { ascending: false })
      .limit(5),
    supabase.from("prayer_requests")
      .select("id, title, is_answered, created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("event_rsvp")
      .select("event_id, status")
      .eq("user_id", params.id),
    admin.auth.admin.getUserById(params.id),
  ]);

  const isBanned = authData?.data?.user?.banned_until
    ? new Date(authData.data.user.banned_until) > new Date()
    : false;

  const notes    = notesRes.data ?? [];
  const attends  = attendRes.data ?? [];
  const prayers  = prayerRes.data ?? [];
  const rsvps    = rsvpRes.data ?? [];
  const rsvpGoing = rsvps.filter(r => r.status === "going").length;

  const fullName = [member.first_name, member.last_name].filter(Boolean).join(" ") || "Membre";
  const initiale = (member.first_name?.[0] ?? "?").toUpperCase();
  const tags     = member.crm_tags ?? [];

  async function handleAddNote(formData: FormData): Promise<void> {
    "use server";
    await addMemberNote(formData);
  }

  async function handleDeleteNote(formData: FormData): Promise<void> {
    "use server";
    await deleteMemberNote(formData.get("note_id") as string, params.id);
  }

  async function handleValidation(formData: FormData): Promise<void> {
    "use server";
    await updateMemberValidation(params.id, formData.get("action") === "validate");
  }

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link href="/espace-membres/crm" className="inline-flex items-center gap-1.5 text-sm text-arc-text3 hover:text-arc-navy mb-4 transition-colors">
        ← Retour CRM
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* ── Colonne gauche ── */}
        <div className="space-y-5">

          {/* Carte identité */}
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-arc-navy flex items-center justify-center overflow-hidden flex-shrink-0">
                {member.avatar_url
                  ? <Image src={member.avatar_url} alt={fullName} width={64} height={64} className="w-full h-full object-cover" />
                  : <span className="font-serif text-2xl font-bold text-white">{initiale}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-2xl font-bold text-arc-navy">{fullName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_STYLE[member.role] ?? "text-arc-text3 bg-gray-50 border-gray-200"}`}>
                    {member.role}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${member.validated ? "text-green-700 bg-green-50 border-green-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
                    {member.validated ? "Validé" : "En attente"}
                  </span>
                  {isBanned && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-gray-100 text-gray-500 border-gray-200">
                      🚫 Bloqué
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {member.country && <div><span className="text-arc-text3 text-xs">Pays</span><div className="font-medium text-arc-navy">{member.country}</div></div>}
              <div><span className="text-arc-text3 text-xs">Inscrit le</span><div className="font-medium text-arc-navy">{new Date(member.created_at).toLocaleDateString("fr-CH")}</div></div>
              <div><span className="text-arc-text3 text-xs">Présences</span><div className="font-medium text-arc-navy">{attends.length}</div></div>
              <div><span className="text-arc-text3 text-xs">RSVP &quot;J&apos;y vais&quot;</span><div className="font-medium text-arc-navy">{rsvpGoing}</div></div>
            </div>

            {/* Actions validation */}
            <div className="mt-4 pt-4 border-t border-arc-border flex gap-2 flex-wrap">
              {!member.validated ? (
                <form action={handleValidation}>
                  <input type="hidden" name="action" value="validate" />
                  <button className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors">
                    ✓ Valider le compte
                  </button>
                </form>
              ) : (
                <form action={handleValidation}>
                  <input type="hidden" name="action" value="invalidate" />
                  <button className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition-colors">
                    Suspendre
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Actions administratives (reset mdp, blocage, suppression) */}
          <DangerActionsPanel
            memberId={params.id}
            memberName={fullName}
            isBanned={isBanned}
            isAdmin={callerIsAdmin}
            backHref="/espace-membres/crm"
          />

          {/* Tags CRM */}
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-bold text-arc-navy mb-3">🏷️ Tags pastoraux</h2>
            <CrmTagsEditor memberId={member.id} initialTags={tags} />
          </div>

          {/* Notes pastorales */}
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-bold text-arc-navy mb-4">📝 Notes ({notes.length})</h2>

            {/* Ajouter une note */}
            <form action={handleAddNote} className="mb-5 space-y-2">
              <input type="hidden" name="member_id" value={member.id} />
              <div className="flex gap-2">
                <select name="type" className="px-2.5 py-2 rounded-lg border border-arc-border text-xs outline-none focus:border-arc-navy bg-white flex-shrink-0">
                  {NOTE_TYPES.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>
              <textarea
                name="content" required maxLength={2000} rows={3}
                placeholder="Ajouter une note pastorale confidentielle…"
                className="w-full px-3 py-2.5 rounded-lg border border-arc-border text-sm outline-none focus:border-arc-navy resize-none transition-colors"
              />
              <button type="submit" className="px-4 py-2 rounded-xl bg-arc-navy text-white text-sm font-bold hover:bg-arc-navy2 transition-colors">
                Ajouter la note
              </button>
            </form>

            {/* Liste notes */}
            <div className="space-y-3">
              {notes.length === 0 && (
                <p className="text-sm text-arc-text3">Aucune note pour ce membre.</p>
              )}
              {notes.map(n => {
                type NoteWithAuthor = typeof n & { profiles?: { first_name: string | null; last_name: string | null } | null };
                const note = n as NoteWithAuthor;
                const authorName = [note.profiles?.first_name, note.profiles?.last_name].filter(Boolean).join(" ") || "Admin";
                return (
                  <div key={n.id} className="bg-arc-bg rounded-xl p-3 relative group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-arc-blue uppercase tracking-wider">{n.type}</span>
                      <span className="text-[10px] text-arc-text3">· {authorName} · {new Date(n.created_at).toLocaleDateString("fr-CH")}</span>
                    </div>
                    <p className="text-sm text-arc-navy leading-relaxed">{n.content}</p>
                    <form action={handleDeleteNote} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <input type="hidden" name="note_id" value={n.id} />
                      <button type="submit" className="w-6 h-6 rounded-full bg-white border border-arc-border text-arc-text3 hover:text-red-500 text-xs flex items-center justify-center shadow-sm">
                        ✕
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Colonne droite ── */}
        <div className="space-y-5">

          {/* Historique présences */}
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-bold text-arc-navy mb-3">✓ Présences récentes</h2>
            {attends.length === 0 ? (
              <p className="text-sm text-arc-text3">Aucune présence enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {attends.map(a => {
                  type AttendWithEvent = typeof a & { events?: { title: string; date: string } | null };
                  const attend = a as AttendWithEvent;
                  return (
                    <div key={a.event_id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-arc-navy font-medium">{attend.events?.title ?? "Événement"}</div>
                        <div className="text-[11px] text-arc-text3">{attend.events?.date ? new Date(attend.events.date + "T00:00:00").toLocaleDateString("fr-CH") : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Demandes de prière */}
          <div className="bg-white border border-arc-border rounded-2xl p-5">
            <h2 className="font-bold text-arc-navy mb-3">🙏 Demandes de prière</h2>
            {prayers.length === 0 ? (
              <p className="text-sm text-arc-text3">Aucune demande.</p>
            ) : (
              <div className="space-y-2">
                {prayers.map(p => (
                  <div key={p.id} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${p.is_answered ? "bg-green-400" : "bg-arc-blue"}`} />
                    <div>
                      <div className="text-sm text-arc-navy font-medium">{p.title}</div>
                      <div className="text-[11px] text-arc-text3">
                        {p.is_answered ? "Exaucée" : "En cours"} · {new Date(p.created_at).toLocaleDateString("fr-CH")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groupes */}
          {member.groups && member.groups.length > 0 && (
            <div className="bg-white border border-arc-border rounded-2xl p-5">
              <h2 className="font-bold text-arc-navy mb-3">👥 Groupes</h2>
              <div className="flex flex-wrap gap-1.5">
                {member.groups.map((g: string) => (
                  <span key={g} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-arc-gold/10 text-arc-goldDark border border-arc-gold/20">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
