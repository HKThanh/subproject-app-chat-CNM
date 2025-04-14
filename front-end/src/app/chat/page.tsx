"use client";

import ChatInfo from "@/containers/chat-info/chat-info";
import MessageList from "@/containers/chat-list/message-list";
import SearchBar from "@/containers/chat-list/search-bar";
import TabNavigation from "@/containers/chat-list/tab-navigation";
import ChatDetail from "@/containers/chat-main/chat-detail";
import { useChatContext } from "@/socket/ChatContext";
import { useSocketContext } from "@/socket/SocketContext";
import { useChat } from "@/socket/useChat";
import { useEffect, useState } from "react";

export default function Home() {
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  );

  // Lấy dữ liệu từ Socket.IO context
  const { socket, isConnected } = useSocketContext();
  const {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    markMessagesAsRead,
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

  // Thêm useEffect để đánh dấu tin nhắn đã đọc khi có tin nhắn mới trong cuộc trò chuyện đang mở
  useEffect(() => {
    if (activeConversation && messages[activeConversation]) {
      // Lấy danh sách tin nhắn chưa đọc trong cuộc trò chuyện hiện tại
      const unreadMessages = messages[activeConversation].filter(
        msg => !msg.isRead && !msg.isOwn
      );
      
      // Nếu có tin nhắn chưa đọc, đánh dấu đã đọc
      if (unreadMessages.length > 0) {
        const unreadMessageIds = unreadMessages.map(msg => msg.idMessage);
        markMessagesAsRead(unreadMessageIds, activeConversation);
        
        console.log(`Đánh dấu ${unreadMessageIds.length} tin nhắn đã đọc trong cuộc trò chuyện đang mở`);
      }
    }
  }, [activeConversation, messages, markMessagesAsRead]);

  // Xử lý khi chọn một cuộc trò chuyện
  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    loadMessages(conversationId);
    
    // Mark messages as read when selecting a conversation
    const conversation = conversations.find(conv => conv.idConversation === conversationId);
    if (conversation && (conversation.unreadCount ?? 0) > 0) {
      // Get unread messages for this conversation
      const conversationMessages = messages[conversationId] || [];
      const unreadMessageIds = conversationMessages
        .filter(msg => !msg.isRead && !msg.isOwn)
        .map(msg => msg.idMessage);
      
      // Mark messages as read if there are any unread messages
      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(unreadMessageIds, conversationId);
      }
    };
  }

  // Xử lý gửi tin nhắn
  const handleSendMessage = (text: string) => {
    if (activeConversation) {
      sendMessage(activeConversation, text);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <div
        className={`${
          showChatInfo ? "w-1/5" : "w-1/4"
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
        className={`${
          showChatInfo ? "w-3/5" : "w-3/4"
        } flex flex-col border-r border-gray-200 transition-all duration-300`}
      >
        <ChatDetail
          onToggleInfo={() => setShowChatInfo(!showChatInfo)}
          showChatInfo={showChatInfo}
          activeConversation={
            activeConversation
              ? conversations.find(
                  (c) => c.idConversation === activeConversation
                ) || null
              : null
          }
          messages={
            activeConversation ? messages[activeConversation] || [] : []
          }
          onSendMessage={handleSendMessage}
          loading={loading}
        />
      </div>
      {showChatInfo && (
        <div className="w-1/5 flex flex-col transition-all duration-300">
          <ChatInfo
            activeConversation={
              activeConversation
                ? conversations.find(
                    (c) => c.idConversation === activeConversation
                  ) || null
                : null
            }
          />
        </div>
      )}
    </div>
  );
}
