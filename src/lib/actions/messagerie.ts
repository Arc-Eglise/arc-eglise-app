"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { notifyMany } from "@/lib/notify";

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

export async function sendMessage(
  conversationId: string,
  content: string,
  replyToId?: string | null,
  attachment?: { url: string; type: string; name: string } | null,
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const trimmed = content.trim();
  if (!trimmed && !attachment) return { error: "Message vide" };

  const { data: part } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!part) return { error: "Non autorisé" };

  const row: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  };
  if (replyToId) row.reply_to_id = replyToId;
  if (attachment) {
    row.attachment_url = attachment.url;
    row.attachment_type = attachment.type;
    row.attachment_name = attachment.name;
  }

  const { error } = await supabase.from("messages").insert(row);

  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  // Notifier les autres participants (push + in-app)
  try {
    const [{ data: others }, { data: me }] = await Promise.all([
      admin.from("conversation_participants")
        .select("user_id").eq("conversation_id", conversationId).neq("user_id", user.id),
      admin.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
    ]);
    const senderName =
      [me?.first_name, me?.last_name].filter(Boolean).join(" ").trim() || "Un membre";
    const ids = (others ?? []).map((o: { user_id: string }) => o.user_id);
    if (ids.length) {
      await notifyMany(ids, {
        type: "message",
        title: `💬 ${senderName}`,
        body: trimmed.slice(0, 90) || "📎 Pièce jointe",
        link: `/espace-membres/messagerie/${conversationId}`,
      });
    }
  } catch { /* best-effort */ }

  revalidatePath(`/espace-membres/messagerie/${conversationId}`);
  return { success: true };
}

// Transfert humain (ARC IA → responsable) : ouvre une conversation avec un
// pasteur/admin (ou responsable suivi à défaut).
export async function contactPastor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("profiles")
    .select("id, role, groups")
    .eq("validated", true);

  const candidates = (staff ?? []).filter((p: { id: string; role: string | null; groups: string[] | null }) => p.id !== user.id);
  const pastor =
    candidates.find(p => p.role === "pasteur") ??
    candidates.find(p => p.role === "admin") ??
    candidates.find(p => (p.groups ?? []).includes("suivi"));

  if (!pastor) return { error: "Aucun responsable disponible pour le moment." };

  return getOrCreateConversation(pastor.id as string);
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

export async function editMessage(messageId: string, content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message vide" };

  const { error } = await supabase
    .from("messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user.id)          // l'expéditeur uniquement
    .is("deleted_at", null);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteMessage(messageId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // Suppression douce : conserve la ligne (fil cohérent), masque le contenu.
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), is_pinned: false })
    .eq("id", messageId)
    .eq("sender_id", user.id);
  if (error) return { error: error.message };
  return { success: true };
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
