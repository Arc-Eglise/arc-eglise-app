import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import MessageThread from "@/components/messagerie/MessageThread";
import { sendMessage, markAsRead } from "@/lib/actions/messagerie";

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const conversationId = params.id;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Verify participant
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participation) notFound();

  // Fetch messages, participants, reactions in parallel
  const [messagesRes, participantsRes, reactionsRes] = await Promise.all([
    supabase.from("messages")
      .select("id, sender_id, content, created_at, is_pinned, edited_at, deleted_at, reply_to_id, attachment_url, attachment_type, attachment_name")
      .eq("conversation_id", conversationId)
      .order("created_at"),
    supabase.from("conversation_participants")
      .select("user_id, last_read_at, profiles(id, first_name, last_name, avatar_url)")
      .eq("conversation_id", conversationId),
    supabase.from("message_reactions")
      .select("id, message_id, user_id, emoji")
      .in(
        "message_id",
        // sub-query workaround: fetch message IDs first
        (await supabase.from("messages").select("id").eq("conversation_id", conversationId)).data?.map(m => m.id) ?? []
      ),
  ]);

  // Mark as read
  await markAsRead(conversationId);

  type ParticipantRow = {
    user_id: string;
    last_read_at: string | null;
    profiles: { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
  };

  const participants = (participantsRes.data ?? []) as unknown as ParticipantRow[];
  const otherRow     = participants.find(p => p.user_id !== user.id);
  const myRow        = participants.find(p => p.user_id === user.id);

  const otherParticipant = otherRow?.profiles ?? {
    id: otherRow?.user_id ?? "",
    first_name: null, last_name: null, avatar_url: null,
  };

  // Métadonnées conversation (groupe ?) + table des expéditeurs (pour les groupes)
  const { data: convMeta } = await supabase
    .from("conversations").select("name, is_group").eq("id", conversationId).maybeSingle();
  const isGroup = (convMeta?.is_group as boolean | null) ?? false;
  const senders: Record<string, { name: string; avatar: string | null }> = {};
  for (const p of participants) {
    senders[p.user_id] = {
      name: [p.profiles?.first_name, p.profiles?.last_name].filter(Boolean).join(" ") || "Membre",
      avatar: p.profiles?.avatar_url ?? null,
    };
  }

  // Group reactions by message_id
  type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
  const reactionsByMsg: Record<string, Reaction[]> = {};
  for (const r of (reactionsRes.data ?? []) as Reaction[]) {
    if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
    reactionsByMsg[r.message_id].push(r);
  }

  // Attach reactions and is_pinned to messages
  const messages = (messagesRes.data ?? []).map(m => ({
    ...m,
    is_pinned: m.is_pinned ?? false,
    edited_at: (m as { edited_at?: string | null }).edited_at ?? null,
    deleted_at: (m as { deleted_at?: string | null }).deleted_at ?? null,
    reply_to_id: (m as { reply_to_id?: string | null }).reply_to_id ?? null,
    attachment_url: (m as { attachment_url?: string | null }).attachment_url ?? null,
    attachment_type: (m as { attachment_type?: string | null }).attachment_type ?? null,
    attachment_name: (m as { attachment_name?: string | null }).attachment_name ?? null,
    reactions: reactionsByMsg[m.id] ?? [],
  }));

  async function handleSend(content: string, replyToId?: string | null, attachment?: { url: string; type: string; name: string } | null): Promise<void> {
    "use server";
    await sendMessage(conversationId, content, replyToId, attachment);
  }

  return (
    <MessageThread
      conversationId={conversationId}
      initialMessages={messages}
      currentUserId={user.id}
      otherParticipant={otherParticipant}
      otherLastReadAt={otherRow?.last_read_at ?? null}
      myLastReadAt={myRow?.last_read_at ?? null}
      sendMessageAction={handleSend}
      isGroup={isGroup}
      groupName={convMeta?.name ?? null}
      memberCount={participants.length}
      senders={senders}
    />
  );
}
