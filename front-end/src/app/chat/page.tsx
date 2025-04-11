"use client";

import ChatInfo from "@/containers/chat-info/chat-info";
import MessageList from "@/containers/chat-list/message-list";
import SearchBar from "@/containers/chat-list/search-bar";
import TabNavigation from "@/containers/chat-list/tab-navigation";
import ChatDetail from "@/containers/chat-main/chat-detail";
import { useChatContext } from "@/socket/ChatContext";
import { useSocketContext } from "@/socket/SocketContext";
import { useEffect, useState } from "react";

export default function Home() {
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  // Lấy dữ liệu từ Socket.IO context
  const { socket, isConnected } = useSocketContext();
  const {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage
  } = useChatContext();

  // Tải danh sách cuộc trò chuyện khi component được mount
  useEffect(() => {
    if (isConnected) {
      loadConversations();
    }
  }, [isConnected, loadConversations]);

  // Tải tin nhắn khi chọn cuộc trò chuyện
  useEffect(() => {
    if (activeConversation && isConnected) {
      loadMessages(activeConversation);
    }
  }, [activeConversation, isConnected, loadMessages]);

  // Xử lý khi chọn một cuộc trò chuyện
  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
  };

  // Xử lý gửi tin nhắn
  const handleSendMessage = (text: string) => {
    if (activeConversation) {
      sendMessage(activeConversation, text);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <div
        className={`${showChatInfo ? "w-1/5" : "w-1/4"
          } flex flex-col border-r border-gray-200 transition-all duration-300`}
      >
        <div className="p-4">
          <SearchBar />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <TabNavigation />
          <MessageList
            conversations={conversations}
            activeConversationId={activeConversation}
            onSelectConversation={handleSelectConversation}
            loading={loading}
          />
        </div>
      </div>
      <div
        className={`${showChatInfo ? "w-3/5" : "w-3/4"
          } flex flex-col border-r border-gray-200 transition-all duration-300`}
      >
        <ChatDetail
          onToggleInfo={() => setShowChatInfo(!showChatInfo)}
          showChatInfo={showChatInfo}
          activeConversation={activeConversation ? conversations.find(c => c.idConversation === activeConversation) : null}
          messages={activeConversation ? messages[activeConversation] || [] : []}
          onSendMessage={handleSendMessage}
          loading={loading}
        />
      </div>
      {showChatInfo && (
        <div className="w-1/5 flex flex-col transition-all duration-300">
          <ChatInfo
            activeConversation={activeConversation ? conversations.find(c => c.idConversation === activeConversation) : null}
          />
        </div>
      )}
    </div>
  );
}
