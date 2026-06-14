"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import NewConversationBtn from "./NewConversationBtn";

interface Conversation {
  id: string;
  otherName: string;
  otherInitiale: string;
  otherAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  hasUnread: boolean;
}

interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface Props {
  conversations: Conversation[];
  members: Member[];
  getOrCreateAction: (otherUserId: string) => Promise<{ conversationId?: string; error?: string }>;
}

export default function ConversationList({ conversations, members, getOrCreateAction }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-arc-border flex items-center justify-between">
        <span className="font-bold text-arc-navy text-sm">Messages</span>
        <NewConversationBtn members={members} getOrCreateAction={getOrCreateAction} />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-arc-text3">
            Aucune conversation. Clique + pour commencer.
          </div>
        )}
        {conversations.map((conv) => {
          const isActive = pathname.includes(conv.id);
          return (
            <Link
              key={conv.id}
              href={`/espace-membres/messagerie/${conv.id}`}
              className={`flex items-center gap-3 px-4 py-3.5 border-b border-arc-border transition-colors ${
                isActive ? "bg-arc-blueBg" : "hover:bg-arc-bg"
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-arc-navy flex items-center justify-center overflow-hidden">
                  {conv.otherAvatar
                    ? <Image src={conv.otherAvatar} alt="" width={40} height={40} className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-white">{conv.otherInitiale}</span>
                  }
                </div>
                {conv.hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-arc-gold rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${conv.hasUnread ? "font-bold text-arc-navy" : "font-medium text-arc-navy"}`}>
                  {conv.otherName}
                </div>
                <div className="text-xs text-arc-text3 truncate">
                  {conv.lastMessage ?? "Démarrer la conversation"}
                </div>
              </div>
              {conv.lastMessageAt && (
                <div className="text-[10px] text-arc-text3 flex-shrink-0">
                  {new Date(conv.lastMessageAt).toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit" })}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
