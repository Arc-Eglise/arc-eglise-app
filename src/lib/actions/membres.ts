"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("profiles").update({
    first_name: (formData.get("first_name") as string)?.trim() || null,
    last_name:  (formData.get("last_name")  as string)?.trim() || null,
    phone:      (formData.get("phone")      as string)?.trim() || null,
    country:    (formData.get("country")    as string)?.trim() || null,
  }).eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/espace-membres/profil");
  return { success: true };
}

export async function createPrayerRequest(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Le titre est obligatoire" };

  const { error } = await supabase.from("prayer_requests").insert({
    user_id:      user.id,
    title,
    description:  (formData.get("description") as string)?.trim() || null,
    is_anonymous: formData.get("is_anonymous") === "on",
  });

  if (error) return { error: error.message };
  revalidatePath("/espace-membres/priere");
  return { success: true };
}

export async function prayForRequest(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("prayer_requests")
    .select("prayer_count")
    .eq("id", id)
    .single();

  await admin
    .from("prayer_requests")
    .update({ prayer_count: (data?.prayer_count ?? 0) + 1 })
    .eq("id", id);

  revalidatePath("/espace-membres/priere");
  return { success: true };
}

export async function markPrayerAnswered(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase
    .from("prayer_requests")
    .update({ is_answered: true })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/espace-membres/priere");
  return { success: true };
}

export async function deletePrayerRequest(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase
    .from("prayer_requests")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/espace-membres/priere");
  return { success: true };
}
