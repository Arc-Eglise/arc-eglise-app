"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHrDeclarationEmail } from "@/lib/email";
import {
  HR_STATUSES, HR_DECLARABLE_TYPES,
  type HrStatus, type HrDeclarationType,
} from "@/lib/hr-constants";

export interface HrRecord {
  id: string;
  member_id: string;
  date: string;
  status: HrStatus;
  arrival_time: string | null;
  departure_time: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Encadrement = admin | pasteur | fonction "support" (miroir de la RLS). */
async function requireEncadrement() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false as const };
  const { data: me } = await supabase
    .from("profiles").select("role, groups").eq("id", user.id).single();
  const ok =
    ["admin", "pasteur"].includes((me?.role as string) ?? "") ||
    ((me?.groups as string[] | null) ?? []).includes("support");
  return { supabase, user, ok };
}

/** Lignes RH d'une journée (source unique : Supabase). Vide si aucune saisie. */
export async function listHrAttendance(date: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { data, error } = await supabase
    .from("hr_attendance")
    .select("*")
    .eq("date", date);
  if (error) return { error: error.message };
  return { data: (data ?? []) as HrRecord[] };
}

/**
 * Lignes RH sur une plage de dates [from, to] (bornes incluses, format YYYY-MM-DD).
 * Alimente le rapport d'heures. Les droits sont ceux de la RLS `hr_attendance`
 * (encadrement = toute l'équipe ; membre = ses propres lignes) : on ne filtre pas
 * ici, le client Supabase applique automatiquement les policies.
 */
export async function listHrAttendanceRange(from: string, to: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { data, error } = await supabase
    .from("hr_attendance")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });
  if (error) return { error: error.message };
  return { data: (data ?? []) as HrRecord[] };
}

/** Enregistre / met à jour le statut RH d'un membre pour une date. */
export async function upsertHrAttendance(input: {
  member_id: string;
  date: string;
  status: HrStatus;
  arrival_time?: string | null;
  departure_time?: string | null;
  note?: string | null;
}) {
  const { supabase, user, ok } = await requireEncadrement();
  if (!user || !ok) return { error: "Accès refusé" as const };
  if (!HR_STATUSES.includes(input.status)) return { error: "Statut invalide" as const };

  const row = {
    member_id: input.member_id,
    date: input.date,
    status: input.status,
    arrival_time: input.arrival_time || null,
    departure_time: input.departure_time || null,
    note: input.note || null,
    recorded_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("hr_attendance")
    .upsert(row, { onConflict: "member_id,date" })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { data: data as HrRecord };
}

/** Supprime (réinitialise) le statut RH d'un membre pour une date. */
export async function deleteHrAttendance(member_id: string, date: string) {
  const { supabase, user, ok } = await requireEncadrement();
  if (!user || !ok) return { error: "Accès refusé" as const };
  const { error } = await supabase
    .from("hr_attendance")
    .delete()
    .eq("member_id", member_id)
    .eq("date", date);
  if (error) return { error: error.message };
  return { ok: true as const };
}

// ─── Déclarations self-service (membre) ──────────────────────────────────────

const TYPE_LABEL: Record<HrDeclarationType, string> = {
  retard: "Retard", absent: "Absence", conge: "Congé",
  vacances: "Vacances", maladie: "Maladie", distance: "À distance",
};

export interface HrDeclaration {
  id: string;
  member_id: string;
  type: HrDeclarationType;
  start_date: string;
  return_date: string;
  note: string | null;
  created_at: string;
}

/** Déclarations du membre courant (pour affichage dans son espace). */
export async function listMyDeclarations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { data, error } = await supabase
    .from("hr_declarations")
    .select("*")
    .eq("member_id", user.id)
    .order("start_date", { ascending: false });
  if (error) return { error: error.message };
  return { data: (data ?? []) as HrDeclaration[] };
}

/**
 * Le membre déclare lui-même un retard / une absence / un congé sur une période
 * (date de début → date de retour). Notifie ensuite par email le pasteur et les
 * membres des groupes de fonction du déclarant. L'échec d'un email ne bloque pas
 * la déclaration.
 */
export async function declareAbsence(input: {
  type: HrDeclarationType;
  start_date: string;   // YYYY-MM-DD
  return_date: string;  // YYYY-MM-DD
  note?: string | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  if (!HR_DECLARABLE_TYPES.includes(input.type)) return { error: "Type invalide" as const };
  if (!input.start_date || !input.return_date) return { error: "Dates requises" as const };
  if (input.return_date < input.start_date) return { error: "La date de retour doit suivre la date de début" as const };

  // Le membre déclare pour lui-même (RLS : member_id = auth.uid())
  const { data: decl, error } = await supabase
    .from("hr_declarations")
    .insert({
      member_id: user.id,
      type: input.type,
      start_date: input.start_date,
      return_date: input.return_date,
      note: input.note || null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };

  // Notifications (best-effort) — pasteur + membres des groupes de fonction du déclarant
  try {
    const admin = createAdminClient();
    const { data: mine } = await admin
      .from("profiles").select("first_name, last_name, email, groups").eq("id", user.id).single();
    const declarerName = [mine?.first_name, mine?.last_name].filter(Boolean).join(" ") || "Un membre";
    const declarerEmail = (mine?.email as string | null) ?? null;
    const myGroups = (mine?.groups as string[] | null) ?? [];

    const recipients = new Set<string>();
    // Pasteur(s)
    const { data: pasteurs } = await admin.from("profiles").select("email").eq("role", "pasteur");
    for (const p of pasteurs ?? []) if (p.email) recipients.add(p.email as string);
    // Membres des groupes de fonction du déclarant
    if (myGroups.length > 0) {
      const { data: groupMembers } = await admin
        .from("profiles").select("email").overlaps("groups", myGroups).eq("validated", true);
      for (const g of groupMembers ?? []) if (g.email) recipients.add(g.email as string);
    }
    if (declarerEmail) recipients.delete(declarerEmail); // pas d'auto-notification

    // Garde-fou de test (preview) : si HR_EMAIL_TEST_TO est défini, TOUS les emails
    // de déclaration RH sont redirigés vers cette seule adresse — évite d'emailer le
    // vrai pasteur/les vrais groupes pendant un test. Sans effet en prod (var absente).
    const testTo = process.env.HR_EMAIL_TEST_TO?.trim();
    const finalRecipients = testTo ? [testTo] : Array.from(recipients);

    const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    await Promise.allSettled(
      finalRecipients.map(to =>
        sendHrDeclarationEmail({
          to,
          memberName: declarerName,
          typeLabel: TYPE_LABEL[input.type],
          startDate: fmt(input.start_date),
          returnDate: fmt(input.return_date),
          note: input.note ?? null,
        })
      )
    );
  } catch (e) {
    console.error("[declareAbsence] notification email échouée :", e);
  }

  return { data: decl as HrDeclaration };
}

/** Supprime une déclaration (auteur ou encadrement, via RLS). */
export async function deleteDeclaration(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { error } = await supabase.from("hr_declarations").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true as const };
}
