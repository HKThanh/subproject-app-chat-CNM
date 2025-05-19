"use client";

import ChatInfo from "@/containers/chats/chat-info/chat-info";
import MessageList from "@/containers/chats/chat-list/message-list";
import SearchBar from "@/containers/chats/chat-list/search-bar";
import TabNavigation from "@/containers/chats/chat-list/tab-navigation";
import ChatDetail from "@/containers/chats/chat-main/chat-detail";
import { useChatContext } from "@/socket/ChatContext";
import { useSocketContext } from "@/socket/SocketContext";
import useUserStore from "@/stores/useUserStoree";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  );
  const router = useRouter();

  // Lấy thông tin user từ Zustand store
  const { user, accessToken, isLoading } = useUserStore();

  // Lấy dữ liệu từ Socket.IO context
  const { socket, isConnected } = useSocketContext();
  const {
    conversations,
    messages,
    loading,
    error,
    loadingMoreMessages,
    hasMoreMessages,
    combinedMessages,
    loadMoreMessages,
    loadConversations,
    loadMessages,
    sendMessage,
    markMessagesAsRead,
    deleteMessage,
    recallMessage,
    forwardMessage,
    addMembersToGroup,
    removeMembersFromGroup,
    changeGroupOwner,
    demoteMember,
    replyMessage,
    addReaction
  } = useChatContext();

// Kiểm tra nếu không có user và không đang loading thì chuyển hướng về trang đăng nhập
// useEffect(() => {
//   if (!isLoading && !user) {
//     console.log("Không tìm thấy thông tin user, chuyển hướng về trang đăng nhập");
//     router.push("/auth/login");
//   }
// }, [user, isLoading, router]);

// Tải danh sách cuộc trò chuyện khi component được mount và đã có thông tin user
useEffect(() => {
  let hasLoadedConversations = false;

  if (isConnected && !hasLoadedConversations && user) {
    console.log("Tải danh sách cuộc trò chuyện lần đầu");
    loadConversations();
    hasLoadedConversations = true;
  }
}, [isConnected, loadConversations, user]);

// Tải tin nhắn khi chọn cuộc trò chuyện và đã có thông tin user
useEffect(() => {
  if (activeConversation && isConnected && user) {
    loadMessages(activeConversation);
  }
}, [activeConversation, isConnected, loadMessages, user]);

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
  fileUrl?: string,
  replyingTo?: {
    name: string;
    messageId: string;
    content: string;
    type: string;
  }
) => {
  if (activeConversation) {
    console.log("check send message:", type, fileUrl, text, replyingTo);
    if (replyingTo) {
      replyMessage(activeConversation, replyingTo.messageId, text, type, fileUrl);
    }
    else if (type === "text") {
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
      className={`${showChatInfo ? "w-1/5" : "w-1/4"
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
      className={`${showChatInfo ? "w-3/5" : "w-3/4"
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
        loadingMoreMessages={loadingMoreMessages}
        hasMoreMessages={hasMoreMessages}
        loadMoreMessages={loadMoreMessages}
        combinedMessages={combinedMessages}
        addReaction={addReaction}
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
          // addMembersToGroup={addMembersToGroup}
          removeMembersFromGroup={removeMembersFromGroup}
          changeGroupOwner={changeGroupOwner}
          demoteMember={demoteMember}
        />
      </div>
    )}
  </div>
);

// Hiển thị trạng thái loading khi đang tải thông tin user
if (isLoading) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-[#8A56FF] border-gray-200 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Đang tải thông tin người dùng...</p>
      </div>
    </div>
  );
}

// Nếu không có user và không đang loading, không hiển thị gì cả (sẽ chuyển hướng)
if (!user) {
  return null;
}

return (
  <div className="flex h-screen bg-gray-50 text-gray-900">
    {/* Phần code giao diện giữ nguyên */}
  </div>
);
}
