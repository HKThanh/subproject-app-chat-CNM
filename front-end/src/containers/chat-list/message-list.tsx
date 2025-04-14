"use client";
import { MessageSquare, Phone, ImageIcon, Loader2, Clock } from "lucide-react";
import Image from "next/image";
import { Conversation } from "@/socket/useChat";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useEffect } from "react";
import useUserStore from "@/stores/useUserStoree";
import { Avatar } from "@/components/ui/avatar";

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
  loading,
}: MessageListProps) {
  useEffect(() => {
    // Log thông tin về trạng thái online của tất cả các cuộc trò chuyện
    console.log("Danh sách trạng thái online của các cuộc trò chuyện:");
    conversations.forEach((conv, index) => {
      console.log(`Conversation ${index}:`, {
        id: conv.otherUser?.id || null,
        fullname: conv.otherUser?.fullname || null,
        isOnline: conv.otherUser?.isOnline || false,
        latestMessage: conv.latestMessage || null,
      });
    });

    // Kiểm tra xem có bất kỳ người dùng nào online không
    const anyUserOnline = conversations.some(
      (conv) => conv.otherUser?.isOnline === true
    );
    console.log("Có người dùng online:", anyUserOnline);
  }, [conversations]);
  const user = useUserStore((state) => state.user);
  // Format message preview based on message type and sender
  const formatMessagePreview = (message: any) => {
    if (!message) return "Không có tin nhắn";
    console.log("check message>>>> ", message);

    // Add prefix for messages sent by the current user
    const prefix = message.idSender === user?.id ? "Bạn: " : "";

    // Format based on message type
    if (message.type === "image") {
      return `${prefix}Đã gửi một hình ảnh`;
    } else if (message.type === "video") {
      return `${prefix}Đã gửi một video`;
    } else if (message.type === "document" || message.type === "file") {
      return `${prefix}Đã gửi một tệp đính kèm`;
    } else {
      // For text messages, show the content with prefix
      return `${prefix}${message.content || ""}`;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="mt-2 text-sm text-gray-500">
            Đang tải cuộc trò chuyện...
          </p>
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

  // Hàm xử lý khi chọn cuộc trò chuyện

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        // Check if there are unread messages
        const hasUnread = (conversation.unreadCount ?? 0) > 0;

        // Xác định xem cuộc trò chuyện có đang được chọn không
        const isActive = activeConversationId === conversation.idConversation;

        return (
          <div
            key={conversation.idConversation}
            className={`flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 ${
              isActive ? "bg-blue-100 text-blue-800" : ""
            }`}
            onClick={() => onSelectConversation(conversation.idConversation)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-white cursor-pointer hover:opacity-90 transition-opacity">
                <img
                  src={
                    conversation.otherUser?.urlavatar ||
                    `https://ui-avatars.com/api/?name=${
                      conversation.otherUser?.fullname || "User"
                    }`
                  }
                  alt="Avatar người dùng"
                />
              </Avatar>
              <span
                className={`${
                  conversation.otherUser?.isOnline
                    ? "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-blue-600 bg-green-500"
                    : "bg-gray-400"
                }`}
                title="Online"
              ></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <h3
                  className={`${hasUnread ? "font-bold" : "font-medium"} ${
                    isActive ? "text-blue-800" : "text-gray-900"
                  } truncate text-sm`}
                >
                  {conversation.otherUser?.fullname || "Người dùng"}
                </h3>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTime(conversation.lastChange)}
                </span>
              </div>
              <p
                className={`text-xs ${
                  hasUnread
                    ? "font-semibold text-gray-900"
                    : "font-normal text-gray-500"
                } ${isActive ? "text-blue-600" : ""} truncate`}
              >
                {formatMessagePreview(conversation.latestMessage)}
              </p>
            </div>
            {hasUnread && (
              <div className="ml-1 bg-red-500 text-white text-xs rounded-full h-4 min-w-4 flex items-center justify-center px-1 text-[12px]">
                {(conversation.unreadCount ?? 0) > 9
                  ? "9+"
                  : conversation.unreadCount ?? 0}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
