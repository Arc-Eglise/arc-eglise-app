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

  // Fetch messages and other participant
  const [messagesRes, participantsRes] = await Promise.all([
    supabase.from("messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at"),
    supabase.from("conversation_participants")
      .select("user_id, profiles(id, first_name, last_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .limit(1)
      .single(),
  ]);

  // Mark as read
  await markAsRead(conversationId);

  type ParticipantRow = {
    user_id: string;
    profiles: { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
  };

  const otherRow = participantsRes.data as ParticipantRow | null;
  const otherParticipant = otherRow?.profiles ?? {
    id: otherRow?.user_id ?? "",
    first_name: null,
    last_name: null,
    avatar_url: null,
  };

  async function handleSend(content: string): Promise<void> {
    "use server";
    await sendMessage(conversationId, content);
  }

  return (
    <MessageThread
      conversationId={conversationId}
      initialMessages={messagesRes.data ?? []}
      currentUserId={user.id}
      otherParticipant={otherParticipant}
      sendMessageAction={handleSend}
    />
  );
}
