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
    deleteMessage,
    recallMessage
  } = useChatContext();

  // Tải danh sách cuộc trò chuyện khi component được mount
  useEffect(() => {
    // Thêm biến để theo dõi đã gọi loadConversations chưa
    let hasLoadedConversations = false;
    
    if (isConnected && !hasLoadedConversations) {
      console.log("Tải danh sách cuộc trò chuyện lần đầu");
      loadConversations();
      hasLoadedConversations = true;
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
        (msg) => !msg.isRead && !msg.isOwn
      );

      // Nếu có tin nhắn chưa đọc, đánh dấu đã đọc
      if (unreadMessages.length > 0) {
        const unreadMessageIds = unreadMessages.map((msg) => msg.idMessage);
        markMessagesAsRead(unreadMessageIds, activeConversation);

        console.log(
          `Đánh dấu ${unreadMessageIds.length} tin nhắn đã đọc trong cuộc trò chuyện đang mở`
        );
      }
    }
  }, [activeConversation, messages, markMessagesAsRead]);

  // Xử lý khi chọn một cuộc trò chuyện
  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    loadMessages(conversationId);

    // Mark messages as read when selecting a conversation
    const conversation = conversations.find(
      (conv) => conv.idConversation === conversationId
    );
    if (conversation && (conversation.unreadCount ?? 0) > 0) {
      // Get unread messages for this conversation
      const conversationMessages = messages[conversationId] || [];
      const unreadMessageIds = conversationMessages
        .filter((msg) => !msg.isRead && !msg.isOwn)
        .map((msg) => msg.idMessage);

      // Mark messages as read if there are any unread messages
      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(unreadMessageIds, conversationId);
      }
    }
  };

  // Xử lý gửi tin nhắn
  const handleSendMessage = (
    text: string,
    type: string = "text",
    fileUrl?: string
  ) => {
    if (activeConversation) {
      console.log("check send message:", type, fileUrl,text);
      
      if (type === "text") {
        sendMessage(activeConversation, text);
      } else {
        // Gọi hàm gửi file từ useChat
        sendMessage(activeConversation, text, type as "image" | "video" | "document" | "file", fileUrl);
      }
    }
  };

  // Xử lý xóa tin nhắn
  const handleDeleteMessage = (messageId: string) => {
    if (activeConversation) {
      // Gọi hàm xóa tin nhắn từ context
      const conversation = conversations.find(
        (conv) => conv.idConversation === activeConversation
      );
      
      if (conversation) {
        // Lấy thông tin người nhận từ cuộc trò chuyện
        const receiverId = conversation.idSender === conversation.otherUser?.id 
          ? conversation.idReceiver 
          : conversation.idSender;
          
        // Gọi hàm xóa tin nhắn từ context
        deleteMessage(messageId, activeConversation);
      }
    }
  };

  // Xử lý thu hồi tin nhắn
  const handleRecallMessage = (messageId: string) => {
    if (activeConversation) {
      // Gọi hàm thu hồi tin nhắn từ context
      recallMessage(messageId, activeConversation);
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
          onDeleteMessage={handleDeleteMessage}
          onRecallMessage={handleRecallMessage}
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
