"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getOrCreateConversation(otherUserId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  if (user.id === otherUserId) return { error: "Impossible de vous envoyer un message à vous-même" };

  const admin = createAdminClient();

  // Check if conversation already exists between these two users
  const { data: myConvs } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  const myConvIds = myConvs?.map((c) => c.conversation_id) ?? [];

  if (myConvIds.length > 0) {
    const { data: existing } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myConvIds)
      .limit(1)
      .maybeSingle();

    if (existing) return { conversationId: existing.conversation_id };
  }

  // Create new conversation
  const { data: conv, error } = await admin
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (error || !conv) return { error: "Erreur lors de la création" };

  await admin.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: user.id },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);

  return { conversationId: conv.id as string };
}

export async function sendMessage(conversationId: string, content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message vide" };

  const { data: part } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!part) return { error: "Non autorisé" };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  revalidatePath(`/espace-membres/messagerie/${conversationId}`);
  return { success: true };
}

export async function markAsRead(conversationId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
}

export async function reactToMessage(messageId: string, emoji: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Toggle : supprimer si existe déjà, sinon insérer
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("message_reactions").delete().eq("id", existing.id);
    return { removed: true };
  }

  await supabase.from("message_reactions").insert({
    message_id: messageId,
    user_id: user.id,
    emoji,
  });
  return { added: true };
}

export async function togglePinMessage(messageId: string, currentlyPinned: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await supabase
    .from("messages")
    .update({ is_pinned: !currentlyPinned })
    .eq("id", messageId);

  return { ok: true };
}
