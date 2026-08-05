"use server";

import { createClient } from "@/lib/supabase/server";

export type MemberSettings = {
  notifs?: { dm?: boolean; culte?: boolean; priere?: boolean; verset?: boolean; events?: boolean };
  privacy?: { profile?: boolean; presence?: boolean; dm?: boolean };
  langue?: { ui?: string; dateFmt?: string };
  bible?: { translation?: string };
};

export async function getMemberSettings(): Promise<{ data?: MemberSettings; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { data, error } = await supabase
    .from("profiles").select("member_settings").eq("id", user.id).maybeSingle();
  if (error) return { error: error.message };
  return { data: (data?.member_settings as MemberSettings) ?? {} };
}

export async function saveMemberSettings(settings: MemberSettings): Promise<{ success?: true; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await supabase
    .from("profiles").update({ member_settings: settings }).eq("id", user.id);
  if (error) return { error: error.message };
  return { success: true };
}
