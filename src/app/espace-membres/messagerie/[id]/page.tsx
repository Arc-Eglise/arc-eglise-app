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
      .select("id, sender_id, content, created_at, is_pinned")
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
    reactions: reactionsByMsg[m.id] ?? [],
  }));

  async function handleSend(content: string): Promise<void> {
    "use server";
    await sendMessage(conversationId, content);
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
    />
  );
}
