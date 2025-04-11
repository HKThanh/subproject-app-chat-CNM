"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useChat, Conversation, Message } from "./useChat";

// Định nghĩa kiểu dữ liệu cho context
interface ChatContextType {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
  unreadMessages: Message[];
  loadConversations: () => void;
  loadMessages: (conversationId: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  markMessagesAsRead: (messageIds: string[], conversationId: string) => void;
  deleteMessage: (messageId: string, conversationId: string) => void;
}

// Tạo context với giá trị mặc định
const ChatContext = createContext<ChatContextType>({
  conversations: [],
  messages: {},
  loading: false,
  error: null,
  unreadMessages: [],
  loadConversations: () => {},
  loadMessages: () => {},
  sendMessage: () => {},
  markMessagesAsRead: () => {},
  deleteMessage: () => {},
});

// Hook để sử dụng chat context
export const useChatContext = () => useContext(ChatContext);

// Provider component
interface ChatProviderProps {
  children: ReactNode;
  userId: string;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children, userId }) => {
  const {
    conversations,
    messages,
    loading,
    error,
    unreadMessages,
    loadConversations,
    loadMessages,
    sendMessage,
    markMessagesAsRead,
    deleteMessage,
  } = useChat(userId);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        messages,
        loading,
        error,
        unreadMessages,
        loadConversations,
        loadMessages,
        sendMessage,
        markMessagesAsRead,
        deleteMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
