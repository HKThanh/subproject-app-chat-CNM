"use client";

import ChatInfo from "@/containers/chat-info/chat-info";
import TabNavigation from "@/containers/chat-list/tab-navigation";
import ChatDetail from "@/containers/chat-main/chat-detail";
import { useChatContext } from "@/socket/ChatContext";
import { useSocketContext } from "@/socket/SocketContext";
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
    recallMessage,
    forwardMessage,
  } = useChatContext();

  // Tải danh sách cuộc trò chuyện khi component được mount
  useEffect(() => {
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

  // Lắng nghe sự kiện new_conversation từ backend
  useEffect(() => {
    if (!socket) return;

    socket.on("new_conversation", (data) => {
      console.log("Nhận được cuộc trò chuyện mới:", data.conversation);
      loadConversations(); // Cập nhật danh sách cuộc trò chuyện

      // Tự động chuyển đến cuộc trò chuyện mới
      setActiveConversation(data.conversation.idConversation);
    });

    return () => {
      socket.off("new_conversation");
    };
  }, [socket, loadConversations]);

  // Thêm useEffect để đánh dấu tin nhắn đã đọc khi có tin nhắn mới trong cuộc trò chuyện đang mở
  useEffect(() => {
    if (activeConversation && messages[activeConversation]) {
      const unreadMessages = messages[activeConversation].filter(
        (msg) => !msg.isRead && !msg.isOwn
      );

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

    const conversation = conversations.find(
      (conv) => conv.idConversation === conversationId
    );
    if (conversation && (conversation.unreadCount ?? 0) > 0) {
      const conversationMessages = messages[conversationId] || [];
      const unreadMessageIds = conversationMessages
        .filter((msg) => !msg.isRead && !msg.isOwn)
        .map((msg) => msg.idMessage);

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
      console.log("check send message:", type, fileUrl, text);

      if (type === "text") {
        sendMessage(activeConversation, text);
      } else {
        sendMessage(
          activeConversation,
          text,
          type as "image" | "video" | "document" | "file",
          fileUrl
        );
      }
    }
  };

  // Xử lý xóa tin nhắn
  const handleDeleteMessage = (messageId: string) => {
    if (activeConversation) {
      const conversation = conversations.find(
        (conv) => conv.idConversation === activeConversation
      );

      if (conversation) {
        const receiverId =
          conversation.idSender === conversation.otherUser?.id
            ? conversation.idReceiver
            : conversation.idSender;

        deleteMessage(messageId, activeConversation);
      }
    }
  };

  // Xử lý thu hồi tin nhắn
  const handleRecallMessage = (messageId: string) => {
    if (activeConversation) {
      recallMessage(messageId, activeConversation);
    }
  };

  // Xử lý chuyển tin nhắn
  const handleForwardMessage = (
    messageId: string,
    targetConversations: string[]
  ) => {
    if (activeConversation) {
      forwardMessage(messageId, targetConversations);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <div
        className={`${
          showChatInfo ? "w-1/5" : "w-1/4"
        } flex flex-col border-r border-gray-200 transition-all duration-300`}
      >
        <div className="flex-1 overflow-hidden flex flex-col">
          <TabNavigation
            onSelectConversation={handleSelectConversation}
            activeConversationId={activeConversation}
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
          onForwardMessage={handleForwardMessage}
          conversations={conversations}
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
