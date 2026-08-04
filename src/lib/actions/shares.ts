"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser, notifyMany } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import { FUNCTION_LABELS, type ResourceType, type ShareRow } from "@/lib/notes-taches/types";

const PATH = "/espace-membres/notes-taches";

/** Membres validés + fonctions, pour le sélecteur de destinataire. */
export async function listShareTargets() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("validated", true)
    .neq("id", user.id)
    .order("first_name", { ascending: true });

  return {
    data: {
      members: (members ?? []).map(m => ({
        id: m.id,
        name: [m.first_name, m.last_name].filter(Boolean).join(" ") || "Membre",
      })),
      functions: Object.entries(FUNCTION_LABELS).map(([slug, label]) => ({ slug, label })),
    },
  };
}

/**
 * Partage une note ou une tâche avec un membre OU une fonction.
 * Opt-in : crée une entrée `en_attente` ; le destinataire accepte pour copier.
 */
export async function shareResource(input: {
  resourceType: ResourceType;
  resourceId: string;
  targetKind: "user" | "function";
  targetId?: string | null;       // user id
  targetFunction?: string | null; // slug
  message?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  // Vérifie que la ressource appartient bien à l'émetteur (RLS le garantit aussi)
  const table = input.resourceType === "note" ? "notes" : "tasks";
  const { data: owned } = await supabase
    .from(table).select("id").eq("id", input.resourceId).eq("owner_id", user.id).maybeSingle();
  if (!owned) return { error: "Ressource introuvable" as const };

  const row = {
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    shared_by: user.id,
    target_kind: input.targetKind,
    shared_with_id: input.targetKind === "user" ? (input.targetId ?? null) : null,
    shared_with_function: input.targetKind === "function" ? (input.targetFunction ?? null) : null,
    permission: "copie",
    status: "en_attente",
    message: input.message?.slice(0, 300) || null,
  };
  const { data, error } = await supabase.from("shares").insert(row).select("id").single();
  if (error) return { error: error.message };

  // Notifie le(s) destinataire(s)
  const senderName = user.email ?? "Un membre";
  const label = input.resourceType === "note" ? "une note" : "une tâche";
  if (input.targetKind === "user" && input.targetId) {
    await notifyUser({
      userId: input.targetId, type: "share",
      title: `📤 Partage reçu`, body: `${senderName} vous a partagé ${label}.`,
      link: `${PATH}?tab=partages`,
    });
  } else if (input.targetKind === "function" && input.targetFunction) {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("profiles").select("id").contains("groups", [input.targetFunction]).eq("validated", true);
    const ids = (members ?? []).map(m => m.id).filter(id => id !== user.id);
    if (ids.length) await notifyMany(ids, {
      type: "share", title: `📤 Partage reçu`,
      body: `${senderName} a partagé ${label} avec « ${FUNCTION_LABELS[input.targetFunction] ?? input.targetFunction} ».`,
      link: `${PATH}?tab=partages`,
    });
  }

  revalidatePath(PATH);
  return { id: data.id };
}

/** Partages qui me sont adressés (direct ou via mes fonctions). */
export async function listIncomingShares() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  // RLS filtre déjà (destinataire direct OU membre de la fonction ciblée)
  const { data, error } = await supabase
    .from("shares")
    .select("*")
    .neq("shared_by", user.id)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };

  // Enrichit avec un aperçu de la ressource (via admin, la ressource appartient à autrui)
  const admin = createAdminClient();
  const enriched = await Promise.all((data as ShareRow[]).map(async (s) => {
    const table = s.resource_type === "note" ? "notes" : "tasks";
    const { data: r } = await admin.from(table).select("title").eq("id", s.resource_id).maybeSingle();
    const { data: sender } = await admin.from("profiles").select("first_name, last_name").eq("id", s.shared_by).maybeSingle();
    return {
      ...s,
      preview: (r?.title as string) ?? "(supprimé)",
      sender_name: sender ? [sender.first_name, sender.last_name].filter(Boolean).join(" ") : "Un membre",
      function_label: s.shared_with_function ? (FUNCTION_LABELS[s.shared_with_function] ?? s.shared_with_function) : null,
    };
  }));
  return { data: enriched };
}

/** Ce que j'ai partagé. */
export async function listOutgoingShares() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { data, error } = await supabase
    .from("shares").select("*").eq("shared_by", user.id).order("created_at", { ascending: false });
  if (error) return { error: error.message };
  return { data: data as ShareRow[] };
}

/**
 * Répondre à un partage. accept=true → copie la ressource dans mon espace
 * (mes notes / mes tâches selon `as`). accept=false → refuse.
 */
export async function respondToShare(shareId: string, accept: boolean, as: "note" | "task" = "note") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };

  // Charge le partage (RLS : je ne vois que ceux qui me sont adressés)
  const { data: share } = await supabase.from("shares").select("*").eq("id", shareId).maybeSingle();
  if (!share) return { error: "Partage introuvable" as const };
  const s = share as ShareRow;

  if (!accept) {
    await supabase.from("shares").update({ status: "refuse", responded_at: new Date().toISOString() }).eq("id", shareId);
    revalidatePath(PATH);
    return { success: true as const, copied: false };
  }

  // Copie la ressource source (appartient à autrui → admin en lecture)
  const admin = createAdminClient();
  const table = s.resource_type === "note" ? "notes" : "tasks";
  const { data: src } = await admin.from(table).select("*").eq("id", s.resource_id).maybeSingle();
  if (!src) return { error: "Ressource source supprimée" as const };

  const snapshot = {
    kind: "partage",
    from: s.shared_by,
    resource_type: s.resource_type,
    original_id: s.resource_id,
    accepted_at: new Date().toISOString(),
  };

  if (as === "task") {
    await supabase.from("tasks").insert({
      owner_id: user.id,
      title: (src.title as string) || "Tâche partagée",
      description: (src.description as string) || (src.body as string) || "",
      priority: (src.priority as string) ?? "moyenne",
      source_ref_id: s.resource_id, source_snapshot: snapshot,
    });
  } else {
    await supabase.from("notes").insert({
      owner_id: user.id,
      title: (src.title as string) || "Note partagée",
      body: (src.body as string) || (src.description as string) || "",
      color: (src.color as string) ?? "blue",
      reference: (src.reference as string) ?? null,
      source_ref_id: s.resource_id, source_snapshot: snapshot,
    });
  }

  await supabase.from("shares").update({ status: "accepte", responded_at: new Date().toISOString() }).eq("id", shareId);

  // Informe l'émetteur que son partage a été accepté
  await notifyUser({
    userId: s.shared_by, type: "share",
    title: "✅ Partage accepté",
    body: `Votre ${s.resource_type === "note" ? "note" : "tâche"} partagée a été ajoutée.`,
    link: `${PATH}?tab=partages`,
  }).catch(() => {});

  revalidatePath(PATH);
  return { success: true as const, copied: true };
}

/** L'émetteur révoque un partage. */
export async function revokeShare(shareId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" as const };
  const { error } = await supabase.from("shares").delete().eq("id", shareId).eq("shared_by", user.id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
  return { success: true as const };
}
