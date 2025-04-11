import { MessageSquare, Phone, ImageIcon, Loader2, Clock } from "lucide-react";
import Image from "next/image";
import { Conversation } from "@/socket/useChat";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface MessageListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  loading: boolean;
}

export default function MessageList({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading
}: MessageListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="mt-2 text-sm text-gray-500">Đang tải cuộc trò chuyện...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <MessageSquare className="h-12 w-12 text-gray-300" />
          <p className="mt-2 text-gray-500">Không có cuộc trò chuyện nào</p>
          <p className="text-sm text-gray-400">Bắt đầu trò chuyện mới</p>
        </div>
      </div>
    );
  }

  // Format thời gian
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    } catch (error) {
      return "Không rõ";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => (
        <div
          key={conversation.idConversation}
          className={`flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 ${
            activeConversationId === conversation.idConversation ? "bg-blue-50" : ""
          }`}
          onClick={() => onSelectConversation(conversation.idConversation)}
        >
          <div className="relative mr-3">
            <Image
              src={conversation.userInfo?.avatar || `https://ui-avatars.com/api/?name=${conversation.userInfo?.fullname || "User"}`}
              alt={conversation.userInfo?.fullname || "User"}
              width={48}
              height={48}
              className="rounded-full"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between">
              <h3 className="font-medium text-gray-900 truncate">
                {conversation.userInfo?.fullname || "Người dùng"}
              </h3>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatTime(conversation.lastChange)}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
          </div>
          {conversation.unreadCount && conversation.unreadCount > 0 && (
            <div className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
