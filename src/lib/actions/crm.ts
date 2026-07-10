"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function requireAdminOrPasteur() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profile } = await supabase.from("profiles").select("role, groups").eq("id", user.id).single();
  const allowed =
    ["admin", "pasteur"].includes(profile?.role ?? "") ||
    (profile?.groups as string[] | null)?.includes("support");
  if (!allowed) throw new Error("Non autorisé");
  return { supabase, userId: user.id, role: profile?.role as string, groups: profile?.groups as string[] };
}

export async function updateMemberGroups(memberId: string, groups: string[]) {
  const { supabase } = await requireAdminOrPasteur();
  const updateData: { groups: string[]; validated?: boolean } = { groups };
  if (groups.includes("support")) updateData.validated = true;
  const { error } = await supabase.from("profiles").update(updateData).eq("id", memberId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/crm/${memberId}`);
  revalidatePath("/admin/crm");
  return { success: true };
}

export async function addMemberNote(formData: FormData) {
  const { supabase, userId } = await requireAdminOrPasteur();
  const memberId = formData.get("member_id") as string;
  const content  = (formData.get("content") as string)?.trim();
  const type     = (formData.get("type") as string) || "general";
  if (!content) return { error: "Contenu obligatoire" };

  const { error } = await supabase.from("member_notes").insert({
    member_id: memberId,
    author_id: userId,
    content,
    type,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/crm/${memberId}`);
  return { success: true };
}

export async function deleteMemberNote(noteId: string, memberId: string) {
  const { supabase } = await requireAdminOrPasteur();
  await supabase.from("member_notes").delete().eq("id", noteId);
  revalidatePath(`/admin/crm/${memberId}`);
  return { success: true };
}

// Rôles autorisés selon le niveau du caller
const ALLOWED_ROLES = ["admin", "pasteur", "membre", "visiteur"] as const;

export async function setMemberRole(memberId: string, newRole: string) {
  const { role: callerRole } = await requireAdminOrPasteur();

  // Seul l'admin peut promouvoir quelqu'un au rôle 'admin'
  if (newRole === "admin" && callerRole !== "admin") {
    return { error: "Seul l'admin peut attribuer le rôle admin" };
  }
  // Seul l'admin peut attribuer le rôle pasteur
  if (newRole === "pasteur" && callerRole !== "admin") {
    return { error: "Seul l'admin peut attribuer le rôle pasteur" };
  }
  if (!(ALLOWED_ROLES as readonly string[]).includes(newRole)) {
    return { error: "Rôle invalide" };
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { role: newRole };
  if (newRole === "membre") {
    updateData.validated    = true;
    updateData.validated_at = new Date().toISOString();
  }
  if (newRole === "visiteur") {
    updateData.validated = false;
  }

  const { error } = await admin.from("profiles").update(updateData).eq("id", memberId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/crm/${memberId}`);
  revalidatePath("/admin/crm");
  revalidatePath("/admin/membres");
  return { success: true };
}
