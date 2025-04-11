import ChatHeader from "./chat-header";
import ChatInput from "./chat-input";
import ChatMessage from "./chat-message";
import { Conversation, Message } from "@/socket/useChat";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface ChatDetailProps {
  onToggleInfo: () => void;
  showChatInfo: boolean;
  activeConversation: Conversation | null;
  messages: Message[];
  onSendMessage: (text: string) => void;
  loading: boolean;
}

export default function ChatDetail({
  onToggleInfo,
  showChatInfo,
  activeConversation,
  messages: chatMessages,
  onSendMessage,
  loading
}: ChatDetailProps) {
  // Tham chiếu đến container tin nhắn để tự động cuộn xuống
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống khi có tin nhắn mới
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="mt-2 text-sm text-gray-500">Đang tải tin nhắn...</p>
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-gray-500">Chọn một cuộc trò chuyện để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        onToggleInfo={onToggleInfo}
        showChatInfo={showChatInfo}
        conversation={activeConversation}
      />
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {chatMessages.length > 0 ? (
          <>
            {/* Sắp xếp tin nhắn từ cũ đến mới (theo thời gian tăng dần) */}
            {[...chatMessages]
              .sort((a, b) => {
                const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
                const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
                return dateA - dateB;
              })
              .map((msg, index) => {
                // Chỉ hiển thị tin nhắn có nội dung
                if (!msg.content || msg.content.trim() === "") {
                  return null;
                }

                return (
                  <ChatMessage
                    key={msg.idMessage || index}
                    message={msg.content}
                    timestamp={msg.dateTime ? new Date(msg.dateTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    isOwn={Boolean(msg.isOwn)}
                  />
                );
              }).filter(Boolean)}
            {/* Thêm phần tử trống để cuộn xuống */}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Chưa có tin nhắn nào</p>
          </div>
        )}
      </div>
      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
}
