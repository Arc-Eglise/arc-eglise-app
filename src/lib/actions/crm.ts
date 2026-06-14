"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function requireAdminOrPasteur() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "pasteur"].includes(profile?.role ?? "")) throw new Error("Non autorisé");
  return { supabase, userId: user.id };
}

export async function updateMemberGroups(memberId: string, groups: string[]) {
  const { supabase } = await requireAdminOrPasteur();
  const { error } = await supabase.from("profiles").update({ groups }).eq("id", memberId);
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
