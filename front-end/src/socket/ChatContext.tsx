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
  loadingMoreMessages: boolean;
  hasMoreMessages: { [conversationId: string]: boolean };  
  loadMoreMessages:(conversationId: string, lastMessageId: string) => void;
  combinedMessages:(conversationId: string) => Message[];
  loadConversations: () => void;
  loadMessages: (conversationId: string) => void;
  sendMessage: (
    conversationId: string,
    text: string,
    type?: "text" | "image" | "video" | "document" | "file",
    fileUrl?: string
  ) => void;
  markMessagesAsRead: (messageIds: string[], conversationId: string) => void;
  deleteMessage: (messageId: string, conversationId: string) => void;
  // Add to ChatContextType
  forwardMessage: (messageId: string, targetConversations: string[]) => void;
  recallMessage: (messageId: string, conversationId: string) => void;
  createGroupConversation: (
    groupName: string,
    groupMembers: string[],
    groupAvatar?: string
  ) => void;
  addMembersToGroup: (conversationId: string, membersToAdd: string[]) => void;
  removeMembersFromGroup: (
    conversationId: string,
    membersToRemove: string[]
  ) => void;
  changeGroupOwner: (conversationId: string, newOwnerId: string) => void;
  demoteMember: (conversationId: string, memberToDemote: string) => void;
  replyMessage:(conversationId: string, messageId: string, text: string, type?: string, fileUrl?: string) => void;
  addReaction: (messageId: string, reaction: string) => void;
}

// Tạo context với giá trị mặc định
const ChatContext = createContext<ChatContextType>({
  conversations: [],
  messages: {},
  loading: false,
  error: null,
  unreadMessages: [],
  loadingMoreMessages: false,
  hasMoreMessages: {},
  combinedMessages: () => [],
  loadMoreMessages: () => { },
  loadConversations: () => { },
  loadMessages: () => { },
  sendMessage: () => { },
  markMessagesAsRead: () => { },
  deleteMessage: () => { },
  forwardMessage: () => { },
  recallMessage: () => { },
  createGroupConversation: () => { },
  addMembersToGroup: () => { },
  removeMembersFromGroup: () => { },
  changeGroupOwner: () => { },
  demoteMember: () => { },
  replyMessage: () => { },
  addReaction: () => { },
});

// Hook để sử dụng chat context
export const useChatContext = () => useContext(ChatContext);

// Provider component
interface ChatProviderProps {
  children: ReactNode;
  userId: string;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  userId,
}) => {
  const {
    conversations,
    messages,
    loading,
    error,
    unreadMessages,
    loadingMoreMessages,
    hasMoreMessages,
    combinedMessages,
    loadMoreMessages,
    loadConversations,
    loadMessages,
    sendMessage,
    markMessagesAsRead,
    deleteMessage,
    forwardMessage,
    recallMessage,
    createGroupConversation,
    addMembersToGroup,
    removeMembersFromGroup,
    changeGroupOwner,
    demoteMember,
    replyMessage,
    addReaction
  } = useChat(userId);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        messages,
        loading,
        error,
        unreadMessages,
        loadingMoreMessages,
        hasMoreMessages,
        combinedMessages,
        loadMoreMessages,
        loadConversations,
        loadMessages,
        sendMessage,
        markMessagesAsRead,
        deleteMessage,
        forwardMessage,
        recallMessage,
        createGroupConversation,
        addMembersToGroup,
        removeMembersFromGroup,
        changeGroupOwner,
        demoteMember,
        replyMessage,
        addReaction
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
