import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConversationList from "@/components/messagerie/ConversationList";
import { getOrCreateConversation } from "@/lib/actions/messagerie";

export default async function MessagerieLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Fetch my conversation participations
  const { data: myParts } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  const convIds = myParts?.map((p) => p.conversation_id) ?? [];

  // Fetch other participants + last messages
  const [othersRes, messagesRes, membersRes] = await Promise.all([
    convIds.length > 0
      ? supabase.from("conversation_participants")
          .select("conversation_id, user_id, profiles(first_name, last_name, avatar_url)")
          .in("conversation_id", convIds)
          .neq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    convIds.length > 0
      ? supabase.from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
          .limit(convIds.length * 3)
      : Promise.resolve({ data: [] }),
    supabase.from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .eq("validated", true)
      .neq("id", user.id)
      .order("first_name"),
  ]);

  type OtherParticipant = {
    conversation_id: string;
    user_id: string;
    profiles: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
  };

  const others   = (othersRes.data ?? []) as unknown as OtherParticipant[];
  const lastMsgs = messagesRes.data ?? [];

  const conversations = (myParts ?? [])
    .map((part) => {
      const other    = others.find((o) => o.conversation_id === part.conversation_id);
      const lastMsg  = lastMsgs.find((m) => m.conversation_id === part.conversation_id);
      const profile  = other?.profiles;
      const otherName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Membre";

      return {
        id: part.conversation_id,
        otherName,
        otherInitiale: (profile?.first_name?.[0] ?? "?").toUpperCase(),
        otherAvatar: profile?.avatar_url ?? null,
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.created_at ?? null,
        hasUnread: lastMsg ? new Date(lastMsg.created_at) > new Date(part.last_read_at) : false,
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));

  async function handleGetOrCreate(otherUserId: string) {
    "use server";
    return getOrCreateConversation(otherUserId);
  }

  return (
    <div className="flex rounded-2xl overflow-hidden border border-arc-border bg-white" style={{ height: "calc(100svh - 140px)", minHeight: "480px" }}>

      {/* Conversation list — hidden on mobile when in a thread */}
      <div className="w-full md:w-72 border-r border-arc-border flex-shrink-0 flex flex-col md:flex">
        <ConversationList
          conversations={conversations}
          members={membersRes.data ?? []}
          getOrCreateAction={handleGetOrCreate}
        />
      </div>

      {/* Thread area */}
      <div className="hidden md:flex flex-1 flex-col min-w-0">
        {children}
      </div>

      {/* Mobile: full-screen thread via [id] page */}
      <div className="flex md:hidden flex-1 flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
