"use client";

import { useCallback, useEffect, useState, useMemo, useReducer } from "react";
import { useSocketContext } from "./SocketContext";
import throttle from 'lodash/throttle';

export interface Message {
  idMessage: string;
  idSender: string;
  idReceiver?: string;
  idConversation: string;
  type: "text" | "file" | "image" | "video" | "document";
  content: string;
  dateTime: string;
  isRead: boolean;
  isRemove?: boolean;
  isRecall?: boolean;
  isFoward?: boolean; // Trường mới cho tin nhắn chuyển tiếp
  originalMessageId?: string; // ID của tin nhắn gốc khi chuyển tiếp
  isOwn?: boolean; // Đánh dấu tin nhắn của người dùng hiện tại
  senderInfo?: {
    id?: string;
    fullname?: string;
    avatar?: string;
    phone?: string;
    status?: string;
  };
  receiverInfo?: {
    id?: string;
    fullname?: string;
    avatar?: string;
    phone?: string;
    status?: string;
  };
}

export interface Conversation {
  idConversation: string;
  idSender: string;
  idReceiver: string;
  latestMessage: {
    content: string;
    dateTime: string;
    isRead: boolean;
    idReceiver?: string;
    idSender?: string;
    type: "text" | "file" | "image" | "video" | "document";
    isRemove?: boolean;
    isRecall?: boolean;
    isReply?: boolean;
  };
  isGroup: boolean;
  groupName: string,
  groupAvatar: string,
  groupMembers: Array<{
    id: string;
    fullname: string;
    urlavatar?: string;
    phone?: string;
    status?: string;
  }>
  lastChange: string;
  unreadCount?: number;
  otherUser?: {
    fullname?: string;
    id?: string;
    urlavatar?: string;
    phone?: string;
    status?: string;
    isOnline?: boolean;
  };
  rules: {
    IDOwner: string;
    listIDCoOwner: string[];
  };
}
type ChatState = {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
  unreadMessages: Message[];
  isUserConnected: boolean;
};

type ChatAction =
  | { type: 'SET_CONVERSATIONS', payload: Conversation[] }
  | { type: 'SET_MESSAGES', payload: { conversationId: string, messages: Message[] } }
  | { type: 'UPDATE_MESSAGE', payload: { conversationId: string, messageId: string, updates: Partial<Message> } }
  | { type: 'ADD_MESSAGE', payload: { conversationId: string, message: Message } }
  | { type: 'SET_LOADING', payload: boolean }
  | { type: 'SET_ERROR', payload: string | null }
  | { type: 'SET_UNREAD_MESSAGES', payload: Message[] }
  | { type: 'SET_USER_CONNECTED', payload: boolean }
  | { type: 'UPDATE_USER_STATUS', payload: { userId: string, isOnline: boolean } }
  | { type: 'MARK_MESSAGES_READ', payload: { conversationId: string, messageIds: string[] } }
  | { type: 'UPDATE_CONVERSATION', payload: { conversationId: string, updates: Partial<Conversation> } }
  | { type: 'FORWARD_MESSAGE_SUCCESS', payload: { results: Array<{ conversationId: string, message: Message }> } }
  | { type: 'UPDATE_CONVERSATION_LATEST_MESSAGE', payload: { conversationId: string, latestMessage: Message } }
  | { type: 'ADD_GROUP_CONVERSATION', payload: Conversation };
;
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages
        }
      };

    case 'ADD_MESSAGE': {
      const { conversationId, message } = action.payload;
      const existingMessages = state.messages[conversationId] || [];

      // Kiểm tra tin nhắn đã tồn tại chưa
      const messageExists = existingMessages.some(msg =>
        msg.idMessage === message.idMessage
      );

      if (messageExists) {
        return state;
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [...existingMessages, message]
        }
      };
    }

    case 'UPDATE_MESSAGE': {
      const { conversationId, messageId, updates } = action.payload;
      const existingMessages = state.messages[conversationId] || [];

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: existingMessages.map(msg =>
            msg.idMessage === messageId ? { ...msg, ...updates } : msg
          )
        }
      };
    }
    case 'FORWARD_MESSAGE_SUCCESS': {
      const { results } = action.payload;
      const newMessages = { ...state.messages };

      results.forEach(({ conversationId, message }) => {
        if (!newMessages[conversationId]) {
          newMessages[conversationId] = [];
        }
        newMessages[conversationId] = [...newMessages[conversationId], message];
      });

      return {
        ...state,
        messages: newMessages
      };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_UNREAD_MESSAGES':
      return { ...state, unreadMessages: action.payload };

    case 'SET_USER_CONNECTED':
      return { ...state, isUserConnected: action.payload };

    case 'UPDATE_USER_STATUS': {
      const { userId, isOnline } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map(conv => {
          if (conv.otherUser?.id === userId) {
            return {
              ...conv,
              otherUser: {
                ...conv.otherUser,
                isOnline
              }
            };
          }
          return conv;
        })
      };
    }

    case 'MARK_MESSAGES_READ': {
      const { conversationId, messageIds } = action.payload;
      const existingMessages = state.messages[conversationId] || [];

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: existingMessages.map(msg =>
            messageIds.includes(msg.idMessage) ? { ...msg, isRead: true } : msg
          )
        },
        conversations: state.conversations.map(conv =>
          conv.idConversation === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      };
    }

    case 'UPDATE_CONVERSATION': {
      const { conversationId, updates } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.idConversation === conversationId ? { ...conv, ...updates } : conv
        )
      };
    }
    case 'UPDATE_CONVERSATION_LATEST_MESSAGE': {
      const { conversationId, latestMessage } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.idConversation === conversationId
            ? { ...conv, latestMessage }
            : conv
        )
      };
    }
    case 'ADD_GROUP_CONVERSATION': {
      // Check if conversation already exists
      const existingConversation = state.conversations.find(
        conv => conv.idConversation === action.payload.idConversation
      );
      
      if (existingConversation) {
        // Update existing conversation
        return {
          ...state,
          conversations: state.conversations.map(conv => 
            conv.idConversation === action.payload.idConversation 
              ? { ...conv, ...action.payload } 
              : conv
          )
        };
      } else {
        // Add new conversation
        return {
          ...state,
          conversations: [...state.conversations, action.payload]
        };
      }
    }
    default:
      return state;
  }
}; ``
export const useChat = (userId: string) => {
  console.log("useChat được gọi với userId:", userId);

  const { socket, isConnected } = useSocketContext();
  const [state, dispatch] = useReducer(chatReducer, {
    conversations: [],
    messages: {},
    loading: false,
    error: null,
    unreadMessages: [],
    isUserConnected: false
  });

  const { conversations, messages, loading, error, unreadMessages, isUserConnected } = state;

  // Kiểm tra userId hợp lệ
  const isValidUserId = userId && userId.trim().length > 0;

  // Log userId để debug 
  useEffect(() => {
    console.log("useChat hook initialized with userId:", userId);
    console.log("isValidUserId:", isValidUserId);
    console.log("socket:", !!socket);
    console.log("isConnected:", isConnected);
  }, [userId, isValidUserId, socket, isConnected]);

  // Xử lý phản hồi tải cuộc trò chuyện - tối ưu dependencies
  const handleLoadConversationsResponse = useCallback((data: {
    Items: Conversation[];
    LastEvaluatedKey: number;
  }) => {
    console.log("Nhận danh sách cuộc trò chuyện:", data);
    dispatch({ type: 'SET_CONVERSATIONS', payload: data.Items });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []); // Không cần dependencies vì dispatch luôn ổn định

  // Xử lý lỗi chung - tối ưu dependencies
  const handleError = useCallback((data: { message: string; error: string }) => {
    console.error("Lỗi socket:", data);
    dispatch({ type: 'SET_ERROR', payload: `Lỗi: ${data.message}` });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []); // Không cần dependencies vì dispatch luôn ổn định

  // Tải danh sách cuộc trò chuyện - tối ưu dependencies
  const loadConversations = useCallback(() => {
    console.log("=== loadConversations được gọi ===>");

    // Nếu đang loading, không gọi lại
    if (loading) {
      console.log("Đang loading, bỏ qua yêu cầu tải cuộc trò chuyện mới");
      return;
    }

    // Kiểm tra điều kiện kết nối
    if (!socket) {
      console.log("Không thể tải cuộc trò chuyện: Socket chưa được khởi tạo");
      return;
    }

    if (!isConnected) {
      console.log("Không thể tải cuộc trò chuyện: Socket chưa kết nối");
      return;
    }

    if (!isValidUserId) {
      console.log("Không thể tải cuộc trò chuyện: userId không hợp lệ");
      dispatch({ type: 'SET_ERROR', payload: "Không thể tải cuộc trò chuyện: Thiếu thông tin người dùng" });
      return;
    }

    // Kiểm tra người dùng đã kết nối chưa
    if (!isUserConnected) {
      console.log("Người dùng chưa kết nối, tự động kết nối trước khi tải cuộc trò chuyện");
      // Tự động thiết lập kết nối người dùng
      socket.emit("new_user_connect", { id: userId });
      // Đặt isUserConnected = true để tiếp tục
      dispatch({ type: 'SET_USER_CONNECTED', payload: true });
      // Không return để tiếp tục tải cuộc trò chuyện
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    console.log("Tải danh sách cuộc trò chuyện cho người dùng:", userId);
    socket.emit("load_conversations", {
      IDUser: userId,
      lastEvaluatedKey: 0,
    });
    // Đồng thời tải cuộc trò chuyện nhóm
    console.log("Tải danh sách cuộc trò chuyện nhóm cho người dùng:", userId);
    socket.emit("load_group_conversations", {
      IDUser: userId,
      lastEvaluatedKey: 0,
    });
    // Timeout để tránh trạng thái loading vô hạn
    const timeoutId = setTimeout(() => {
      console.log("Timeout khi tải cuộc trò chuyện");
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: "Không thể tải cuộc trò chuyện: Hết thời gian chờ. Vui lòng thử lại sau." });
    }, 10000); // 10 giây timeout

    return () => {
      clearTimeout(timeoutId);
    };
  }, [socket, isConnected, userId, isValidUserId, isUserConnected]);
  // Xử lý phản hồi tải cuộc trò chuyện nhóm
  const handleLoadGroupConversationsResponse = useCallback((data: {
    Items: Conversation[];
    LastEvaluatedKey: number;
  }) => {
    console.log("Nhận danh sách cuộc trò chuyện nhóm:", data);

    // Kết hợp cuộc trò chuyện nhóm với cuộc trò chuyện hiện có
    if (data.Items && Array.isArray(data.Items)) {
      dispatch({
        type: 'SET_CONVERSATIONS',
        payload: [...state.conversations, ...data.Items].filter((conv, index, self) =>
          // Loại bỏ các cuộc trò chuyện trùng lặp
          index === self.findIndex(c => c.idConversation === conv.idConversation)
        )
      });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
  }, [state.conversations]); // Phụ thuộc vào state.conversations để luôn có danh sách mới nhất
  const createGroupConversation = useCallback((
    groupName: string,
    groupMembers: string[],
    groupAvatar?: string
  ) => {
    if (!socket || !userId) {
      console.error("Cannot create group: Socket not connected or user not logged in");
      return;
    }
    
    console.log("Creating group conversation:", {
      groupName,
      groupMembers,
      groupAvatar
    });
    
    socket.emit("create_group_conversation", {
      IDOwner: userId,
      groupName,
      groupMembers,
      groupAvatar: groupAvatar || ""
    });
  }, [socket, userId]);
  // Gộp các useEffect đăng ký sự kiện socket
  useEffect(() => {
    if (!socket) return;

    // Đăng ký lắng nghe các sự kiện
    socket.on("load_conversations_response", handleLoadConversationsResponse);
    socket.on("load_group_conversations_response", handleLoadGroupConversationsResponse);
    socket.on("error", handleError);
    const handleGroupConversationCreated = (data: {
      success: boolean;
      conversation: Conversation;
      members: Array<{
        id: string;
        fullname: string;
        urlavatar?: string;
        phone?: string;
        status?: string;
      }>;
      message: string;
    }) => {
      console.log("Group conversation creation response:", data);
      
      if (data.success && data.conversation) {
        // Enhance the conversation object with members information
        const enhancedConversation: Conversation = {
          ...data.conversation,
          groupMembers: data.members || [],
          isGroup: true,
          // Set default values for any missing fields
          lastChange: data.conversation.lastChange || new Date().toISOString(),
          unreadCount: 0,
          // Make sure rules exist
          rules: data.conversation.rules || {
            IDOwner: userId,
            listIDCoOwner: []
          }
        };
        
        // Add the new group conversation to state
        dispatch({
          type: 'ADD_GROUP_CONVERSATION',
          payload: enhancedConversation
        });
        
        // Automatically load messages for this conversation
        loadMessages(data.conversation.idConversation);
        
        // Show success notification
        console.log("Group created successfully:", data.message);
      } else {
        // Handle error
        console.error("Failed to create group:", data.message);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `Failed to create group: ${data.message}` 
        });
      }
    };
    socket.on("create_group_conversation_response", handleGroupConversationCreated);
    // Xử lý phản hồi tải tin nhắn
    const handleLoadMessagesResponseDirect = (data: any) => {
      console.log("Received load_messages_response directly:", data);
      handleLoadMessagesResponse(data);
    };

    socket.on("load_messages_response", handleLoadMessagesResponseDirect);

    // Xử lý tin nhắn nhận được từ người khác
    const handleReceiveMessage = (data: any) => {
      console.log("Nhận tin nhắn mới (raw):", JSON.stringify(data, null, 2));

      try {
        // Xử lý cấu trúc dữ liệu
        let message: Message;
        let conversationId: string;

        // Kiểm tra cấu trúc dữ liệu
        if (!data) {
          console.error("Tin nhắn nhận được rỗng");
          return;
        }

        // Xử lý các trường hợp cấu trúc dữ liệu khác nhau
        if (data.conversationId && data.message) {
          // Trường hợp data là { conversationId, message }
          message = data.message;
          conversationId = data.conversationId;
        } else if (data.idConversation) {
          // Trường hợp data là Message trực tiếp
          message = data;
          conversationId = data.idConversation;
        } else {
          console.error("Tin nhắn nhận được không hợp lệ:", data);
          return;
        }

        console.log("Tin nhắn đã xử lý:", {
          message,
          conversationId,
          messageType: typeof message,
          messageKeys: message ? Object.keys(message) : [],
          idSender: message ? message.idSender : null
        });

        // Kiểm tra xem tin nhắn có phải của người dùng hiện tại không
        const isOwnMessage = message.idSender === userId;
        console.log("isOwnMessage:", isOwnMessage, "userId:", userId, "idSender:", message.idSender);

        // Đảm bảo tin nhắn có đầy đủ thông tin
        const enhancedMessage = {
          ...message,
          isOwn: isOwnMessage,
          dateTime: message.dateTime || new Date().toISOString()
        };

        if (isOwnMessage) {
          // Tìm và thay thế tin nhắn tạm thời
          const conversationMessages = messages[conversationId] || [];
          const tempMessageIndex = conversationMessages.findIndex((msg: Message) =>
            msg && msg.idMessage && msg.idMessage.startsWith('temp-') && msg.content === message.content
          );

          if (tempMessageIndex !== -1) {
            // Thay thế tin nhắn tạm thời
            const updatedMessages = [...conversationMessages];
            updatedMessages[tempMessageIndex] = enhancedMessage;

            dispatch({
              type: 'SET_MESSAGES',
              payload: {
                conversationId,
                messages: updatedMessages
              }
            });
          } else {
            // Thêm tin nhắn mới nếu không tìm thấy tin nhắn tạm thời
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                conversationId,
                message: enhancedMessage
              }
            });
          }
        } else {
          // Thêm tin nhắn mới từ người khác
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              conversationId,
              message: enhancedMessage
            }
          });

          // Cập nhật thông tin cuộc trò chuyện
          dispatch({
            type: 'UPDATE_CONVERSATION',
            payload: {
              conversationId,
              updates: {
                latestMessage: {
                  content: message.content,
                  dateTime: message.dateTime,
                  isRead: false,
                  idReceiver: message.idReceiver,
                  idSender: message.idSender,
                  type: message.type
                },
                lastChange: message.dateTime,
                unreadCount: ((conversations.find(c => c.idConversation === conversationId)?.unreadCount) || 0) + 1
              }
            }
          });

          // Phát âm thanh thông báo
          try {
            const audio = new Audio('/sounds/nodification.wav');
            audio.play();
          } catch (error) {
            console.error("Không thể phát âm thanh thông báo:", error);
          }
        }
      } catch (error) {
        console.error("Lỗi khi xử lý tin nhắn nhận được:", error);
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    // Xử lý phản hồi gửi tin nhắn thành công
    const handleSendMessageSuccess = (data: any) => {
      console.log("Phản hồi gửi tin nhắn thành công (raw):", data);

      // Kiểm tra cấu trúc dữ liệu phản hồi
      if (!data) {
        console.error("Phản hồi gửi tin nhắn rỗng");
        return;
      }

      // Xử lý cấu trúc phản hồi mới từ backend
      let message: Message;
      let conversationId: string;

      // Kiểm tra cấu trúc phản hồi
      if (data.conversationId && data.message) {
        // Cấu trúc mới: { conversationId, message }
        message = data.message;
        conversationId = data.conversationId;
      } else if (data.idConversation) {
        // Cấu trúc cũ: Message trực tiếp
        message = data;
        conversationId = data.idConversation;
      } else {
        console.error("Phản hồi gửi tin nhắn không hợp lệ:", data);
        return;
      }

      // Đảm bảo tin nhắn có đầy đủ thông tin
      const enhancedMessage = {
        ...message,
        isOwn: true,
        dateTime: message.dateTime || new Date().toISOString()
      };

      // Tìm tin nhắn tạm thời để thay thế
      const conversationMessages = messages[conversationId] || [];
      const tempMessageIndex = conversationMessages.findIndex(msg =>
        msg && msg.idMessage && msg.idMessage.startsWith('temp-') && msg.content === message.content
      );

      if (tempMessageIndex !== -1) {
        // Thay thế tin nhắn tạm thời
        const updatedMessages = [...conversationMessages];
        updatedMessages[tempMessageIndex] = enhancedMessage;

        dispatch({
          type: 'SET_MESSAGES',
          payload: {
            conversationId,
            messages: updatedMessages
          }
        });
      } else {
        // Thêm tin nhắn mới nếu không tìm thấy tin nhắn tạm thời
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId,
            message: enhancedMessage
          }
        });
      }
    };

    socket.on("send_message_success", handleSendMessageSuccess);

    // Xử lý sự kiện xóa tin nhắn thành công
    const handleDeleteMessageSuccess = (data: { messageId: string, updatedMessage: Message }) => {
      console.log("Tin nhắn đã được xóa:", data);

      if (data.updatedMessage && data.updatedMessage.idConversation) {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId: data.updatedMessage.idConversation,
            messageId: data.messageId,
            updates: { ...data.updatedMessage, isRemove: true }
          }
        });
      }
    };

    socket.on("delete_message_success", handleDeleteMessageSuccess);

    // Xử lý sự kiện chuyển tiếp tin nhắn thành công
    const handleForwardMessageSuccess = (data: {
      success: boolean,
      results: Array<{
        conversationId: string,
        message: Message
      }>
    }) => {
      console.log("Tin nhắn đã được chuyển tiếp:", data);

      if (data.success && data.results && data.results.length > 0) {
        data.results.forEach(result => {
          const { conversationId, message } = result;

          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              conversationId,
              message: { ...message, isOwn: message.idSender === userId }
            }
          });
        });
      }
    };

    socket.on("forward_message_success", handleForwardMessageSuccess);

    // Lắng nghe sự kiện kết nối thành công
    const handleConnectionSuccess = (data: any) => {
      console.log("Kết nối socket thành công:", data);
      dispatch({ type: 'SET_USER_CONNECTED', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Tự động tải danh sách cuộc trò chuyện sau khi kết nối thành công
      loadConversations();
    };

    socket.on("connection_success", handleConnectionSuccess);

    // Lắng nghe lỗi kết nối
    const handleConnectionError = (data: any) => {
      console.error("Lỗi kết nối socket:", data);
      dispatch({ type: 'SET_ERROR', payload: `Lỗi kết nối: ${data.message || 'Không xác định'}` });
    };

    socket.on("connection_error", handleConnectionError);

    // Lắng nghe tin nhắn chưa đọc
    const handleUnreadMessages = (data: { messages: Message[]; count: number }) => {
      console.log(`Nhận ${data.count} tin nhắn chưa đọc`);
      dispatch({ type: 'SET_UNREAD_MESSAGES', payload: data.messages });
    };

    socket.on("unread_messages", handleUnreadMessages);

    // Xử lý phản hồi trạng thái từ server
    const handleUsersStatus = (data: { statuses: Record<string, boolean> }) => {
      console.log('Nhận trạng thái người dùng:', data.statuses);

      if (!data?.statuses) {
        console.error('Dữ liệu trạng thái không hợp lệ:', data);
        return;
      }

      // Cập nhật trạng thái cho từng người dùng
      Object.entries(data.statuses).forEach(([userId, isOnline]) => {
        dispatch({
          type: 'UPDATE_USER_STATUS',
          payload: { userId, isOnline: Boolean(isOnline) }
        });
      });
    };

    socket.on('users_status', handleUsersStatus);

    return () => {
      // Hủy đăng ký tất cả sự kiện khi unmount
      socket.off("load_conversations_response", handleLoadConversationsResponse);
      socket.off("load_group_conversations_response", handleLoadGroupConversationsResponse);
      socket.off("error", handleError);
      socket.off("load_messages_response", handleLoadMessagesResponseDirect);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("send_message_success", handleSendMessageSuccess);
      socket.off("delete_message_success", handleDeleteMessageSuccess);
      socket.off("forward_message_success", handleForwardMessageSuccess);
      socket.off("connection_success", handleConnectionSuccess);
      socket.off("connection_error", handleConnectionError);
      socket.off("unread_messages", handleUnreadMessages);
      socket.off('users_status', handleUsersStatus);
      socket.off("create_group_conversation_response", handleGroupConversationCreated);
      socket.offAny();
    };
  }, [socket, userId, messages, conversations, loadConversations]);

  // Kết nối người dùng khi socket sẵn sàng
  useEffect(() => {
    // Reset trạng thái khi userId thay đổi
    dispatch({ type: 'SET_USER_CONNECTED', payload: false });

    // Kiểm tra điều kiện kết nối
    if (!socket) {
      console.log("Socket chưa sẵn sàng");
      return;
    }

    if (!isValidUserId) {
      console.log("userId không hợp lệ:", userId);
      dispatch({ type: 'SET_ERROR', payload: "Không thể kết nối: Thiếu thông tin người dùng" });
      return;
    }

    console.log("Đăng ký người dùng online:", userId, "Socket ID:", socket.id, "Socket connected:", socket.connected);

    // Thử kết nối lại nếu socket đã được khởi tạo nhưng chưa kết nối
    if (!socket.connected) {
      console.log("Socket đã được khởi tạo nhưng chưa kết nối, thử kết nối lại...");
      socket.connect();

      // Đợi socket kết nối trước khi gửi sự kiện
      socket.on('connect', () => {
        console.log("Socket đã kết nối, gửi sự kiện new_user_connect");
        socket.emit("new_user_connect", { id: userId });
      });

      return;
    }

    // Gửi sự kiện kết nối người dùng nếu socket đã kết nối
    console.log("Socket đã kết nối, gửi sự kiện new_user_connect ngay lập tức");
    socket.emit("new_user_connect", { id: userId });
  }, [socket, isConnected, userId, isValidUserId]); // Loại bỏ loadConversations từ dependencies

  // Xử lý phản hồi tải tin nhắn - tối ưu dependencies
  const handleLoadMessagesResponse = useCallback((data: any) => {
    console.log("Phản hồi tải tin nhắn (raw):", JSON.stringify(data, null, 2));

    try {
      // Kiểm tra cấu trúc dữ liệu phản hồi
      if (!data) {
        console.error("Phản hồi tải tin nhắn rỗng");
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Xử lý cấu trúc phản hồi
      let messages: Message[] = [];
      let conversationId: string = "";

      // Kiểm tra cấu trúc phản hồi
      if (data.messages && data.conversationId) {
        // Cấu trúc mới: { messages, conversationId }
        messages = data.messages;
        conversationId = data.conversationId;
      } else if (data.messages && data.idConversation) {
        // Cấu trúc cũ: { messages, idConversation }
        messages = data.messages;
        conversationId = data.idConversation;
      } else {
        console.error("Phản hồi tải tin nhắn không hợp lệ:", data);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      console.log(`Nhận ${messages.length} tin nhắn cho cuộc trò chuyện ${conversationId}`);

      if (messages.length === 0) {
        console.log(`Không có tin nhắn nào cho cuộc trò chuyện ${conversationId}`);
        dispatch({
          type: 'SET_MESSAGES',
          payload: {
            conversationId,
            messages: []
          }
        });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Sắp xếp tin nhắn theo thời gian
      const sortedMessages = [...messages].sort((a, b) => {
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      });

      // Đánh dấu tin nhắn của người dùng hiện tại
      const enhancedMessages = sortedMessages.map(msg => ({
        ...msg,
        isOwn: msg.idSender === userId
      }));

      dispatch({
        type: 'SET_MESSAGES',
        payload: {
          conversationId,
          messages: enhancedMessages
        }
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error("Lỗi khi xử lý phản hồi tải tin nhắn:", error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [userId]); // Chỉ phụ thuộc vào userId

  // Tải tin nhắn của một cuộc trò chuyện - tối ưu dependencies
  const loadMessages = useCallback(
    (idConversation: string) => {
      if (!socket) {
        console.log("Không thể tải tin nhắn: Socket chưa sẵn sàng");
        return;
      }

      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log(`Tải tin nhắn cho cuộc trò chuyện ${idConversation}, socket ID: ${socket.id}, socket connected: ${socket.connected}`);

      // Xóa tin nhắn hiện tại của cuộc trò chuyện này (nếu có)
      dispatch({
        type: 'SET_MESSAGES',
        payload: {
          conversationId: idConversation,
          messages: []
        }
      });

      // Đảm bảo socket đã kết nối trước khi gửi sự kiện
      if (!socket.connected) {
        console.log("Socket chưa kết nối, thử kết nối lại trước khi tải tin nhắn");
        socket.connect();
      }

      // Gửi yêu cầu tải tin nhắn
      socket.emit("load_messages", {
        IDConversation: idConversation,
        lastMessageId: null,
        limit: 50,
      });

      const timeoutId = setTimeout(() => {
        console.log(`Timeout khi tải tin nhắn cho cuộc trò chuyện ${idConversation}`);
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: "Không thể tải tin nhắn: Hết thời gian chờ. Vui lòng thử lại sau." });
      }, 10000);

      return () => {
        clearTimeout(timeoutId);
      };
    },
    [socket] // Chỉ phụ thuộc vào socket
  );
  // Gửi tin nhắn - tối ưu dependencies
  const sendMessage = useCallback(
    (idConversation: string, text: string, type: "text" | "image" | "video" | "document" | "file" = "text", fileUrl?: string) => {
      if (!socket) {
        console.log("Không thể gửi tin nhắn: Socket chưa sẵn sàng");
        return;
      }

      console.log(`Gửi tin nhắn đến cuộc trò chuyện ${idConversation}: ${text}, type: ${type}`);

      // Tìm thông tin người nhận từ cuộc trò chuyện
      const conversation = conversations.find(
        (conv) => conv.idConversation === idConversation
      );

      if (!conversation) {
        console.error("Không tìm thấy cuộc trò chuyện");
        return;
      }

      // Xác định người nhận
      const receiverId = conversation.idSender === userId
        ? conversation.idReceiver
        : conversation.idSender;

      // Tạo tin nhắn tạm thời để hiển thị ngay lập tức
      const tempMessage: Message = {
        idMessage: `temp-${Date.now()}`,
        idSender: userId,
        idReceiver: receiverId,
        idConversation: idConversation,
        type: type,
        content: type === "text" ? text : (fileUrl || ""),
        dateTime: new Date().toISOString(),
        isRead: false,
        isOwn: true,
        senderInfo: {
          id: userId
        }
      };

      // Cập nhật danh sách tin nhắn với tin nhắn tạm thời
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          conversationId: idConversation,
          message: tempMessage
        }
      });

      // Chuẩn bị payload dựa trên loại tin nhắn
      const payload: any = {
        IDSender: userId,
        IDReceiver: receiverId,
        IDConversation: idConversation,
        type: type
      };

      // Nếu là tin nhắn văn bản
      if (type === "text") {
        payload.textMessage = text;
      }
      // Nếu là file
      else if (fileUrl) {
        payload.fileUrl = fileUrl;
        payload.textMessage = text || "Gửi một tệp đính kèm";
      }

      // Gửi tin nhắn đến server
      socket.emit("send_message", payload);
      // After sending the message, listen for the success response
      socket.once("send_message_success", (response) => {
        // Update messages state
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: response.conversationId,
            message: response.message
          }
        });

        // Also update the conversation with the latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: response.conversationId,
            latestMessage: response.message
          }
        });
      });
    },
    [socket, conversations, userId, dispatch]
  );

  // Đánh dấu tin nhắn đã đọc - tối ưu dependencies
  const markMessagesAsRead = useCallback(
    (messageIds: string[], idConversation: string) => {
      if (!socket) {
        console.log("Không thể đánh dấu đã đọc: Socket chưa sẵn sàng");
        return;
      }

      if (!messageIds.length) {
        return;
      }

      // Tìm thông tin cuộc trò chuyện
      const conversation = conversations.find(
        (conv) => conv.idConversation === idConversation
      );

      if (!conversation) {
        console.error("Không tìm thấy cuộc trò chuyện");
        return;
      }

      console.log(`Đánh dấu ${messageIds.length} tin nhắn đã đọc trong cuộc trò chuyện ${idConversation}`);

      // Gửi yêu cầu đánh dấu đã đọc
      socket.emit("mark_messages_read", {
        conversationId: idConversation,
        receiverId: userId,
      });

      // Cập nhật trạng thái tin nhắn trong state
      dispatch({
        type: 'MARK_MESSAGES_READ',
        payload: {
          conversationId: idConversation,
          messageIds
        }
      });
    },
    [socket, conversations, userId, dispatch]
  );
  // forwardMessage function 
  const forwardMessage = useCallback((messageId: string, targetConversations: string[]) => {
    if (!socket) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    socket.emit('forward_message', {
      IDMessageDetail: messageId,
      targetConversations,
      IDSender: userId
    });

    socket.once('forward_message_success', (response) => {
      if (response.success) {
        // First dispatch the forwarded messages
        dispatch({ type: 'FORWARD_MESSAGE_SUCCESS', payload: response });
        console.log("Tin nhắn đã được chuyển tiếp thành công");

        // Then update each conversation's latest message
        response.results.forEach((result: { conversationId: string, message: Message }) => {
          const { conversationId, message } = result;
          dispatch({
            type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
            payload: {
              conversationId: conversationId,
              latestMessage: message
            }
          });
        });
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    socket.once('error', (error) => {
      console.error('Forward message error:', error);
      console.log('Không thể chuyển tiếp tin nhắn');
      dispatch({ type: 'SET_LOADING', payload: false });
    });
  }, [socket, userId]);
  // Xóa tin nhắn - tối ưu dependencies
  const deleteMessage = useCallback(
    (messageId: string, idConversation: string) => {
      if (!socket) {
        console.log("Không thể xóa tin nhắn: Chưa sẵn sàng");
        return;
      }

      console.log(`Xóa tin nhắn ${messageId} trong cuộc trò chuyện ${idConversation}`);

      // Gửi yêu cầu xóa tin nhắn
      socket.emit("delete_message", {
        idMessage: messageId,
        idSender: userId,
      });

      // Cập nhật trạng thái tin nhắn trong state ngay lập tức (optimistic update)
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId: idConversation,
          messageId,
          updates: { isRemove: true }
        }
      });
    },
    [socket, userId, dispatch]
  );
  const recallMessage = useCallback((messageId: string, conversationId: string) => {
    if (!socket || !isConnected || !isValidUserId) {
      console.log("Không thể thu hồi tin nhắn: Socket chưa kết nối hoặc userId không hợp lệ");
      return;
    }

    console.log(`Đang thu hồi tin nhắn ${messageId} trong cuộc trò chuyện ${conversationId}`);

    // Gửi yêu cầu thu hồi tin nhắn đến server
    socket.emit("recall_message", {
      idMessage: messageId,
      idConversation: conversationId,
    });

    // Cập nhật UI ngay lập tức (optimistic update)
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: {
        conversationId,
        messageId,
        updates: {
          isRecall: true,
          content: "Tin nhắn đã được thu hồi"
        }
      }
    });

  }, [socket, isConnected, isValidUserId, userId]);
  // Thêm xử lý sự kiện recall_message_success và message_recalled
  useEffect(() => {
    if (!socket) return;

    // Xử lý phản hồi thu hồi tin nhắn thành công
    const handleRecallMessageSuccess = (data: any) => {
      console.log("Nhận phản hồi thu hồi tin nhắn:", data);

      if (data.success) {
        // Cập nhật tin nhắn trong state đã được thực hiện trong optimistic update
        console.log(`Tin nhắn ${data.messageId} đã được thu hồi thành công`);
      } else {
        console.error("Lỗi khi thu hồi tin nhắn:", data.error);
        // Khôi phục trạng thái tin nhắn nếu thu hồi thất bại
        // Cần biết conversationId để khôi phục
        // Có thể lưu trữ một bản đồ messageId -> conversationId để sử dụng ở đây
      }
    };

    socket.on("recall_message_success", handleRecallMessageSuccess);

    // Xử lý thông báo tin nhắn bị thu hồi từ người khác
    const handleMessageRecalled = (data: any) => {
      console.log("Nhận thông báo tin nhắn bị thu hồi:", data);

      if (data.updatedMessage && data.updatedMessage.idConversation) {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId: data.updatedMessage.idConversation,
            messageId: data.messageId,
            updates: {
              isRecall: true,
              content: "Tin nhắn đã được thu hồi"
            }
          }
        });
      }
    };

    socket.on("message_recalled", handleMessageRecalled);

    return () => {
      socket.off("recall_message_success", handleRecallMessageSuccess);
      socket.off("message_recalled", handleMessageRecalled);
    };
  }, [socket]);
  // Tối ưu hóa userIds bằng useMemo
  const userIds = useMemo(() =>
    conversations
      .map(conv => conv.otherUser?.id)
      .filter((id): id is string => Boolean(id)),
    [conversations]
  );

  // Tối ưu hóa việc kiểm tra trạng thái người dùng
  useEffect(() => {
    if (!socket || userIds.length === 0) return;

    console.log('Danh sách userIds để kiểm tra trạng thái:', userIds);

    // Tạo phiên bản throttled của hàm kiểm tra trạng thái
    const throttledCheckStatus = throttle(() => {
      console.log('Gửi yêu cầu kiểm tra trạng thái cho users:', userIds);
      socket.emit('check_users_status', { userIds });
    }, 3000);

    // Xử lý phản hồi trạng thái từ server
    const handleUsersStatus = (data: { statuses: Record<string, boolean> }) => {
      console.log('Nhận trạng thái người dùng:', data.statuses);

      if (!data?.statuses) {
        console.error('Dữ liệu trạng thái không hợp lệ:', data);
        return;
      }

      // Cập nhật trạng thái cho từng người dùng
      Object.entries(data.statuses).forEach(([userId, isOnline]) => {
        dispatch({
          type: 'UPDATE_USER_STATUS',
          payload: { userId, isOnline: Boolean(isOnline) }
        });
      });
    };

    // Đăng ký lắng nghe sự kiện
    socket.on('users_status', handleUsersStatus);

    // Kiểm tra trạng thái lần đầu khi mount
    throttledCheckStatus();

    // Thiết lập interval để kiểm tra định kỳ (60 giây)
    const intervalId = setInterval(throttledCheckStatus, 60000);

    return () => {
      socket.off('users_status', handleUsersStatus);
      clearInterval(intervalId);
      throttledCheckStatus.cancel();
    };
  }, [socket, userIds, dispatch]);
  // Trả về các giá trị và hàm
  return {
    conversations,
    messages,
    loading,
    error,
    unreadMessages,
    loadConversations,
    loadMessages,
    sendMessage,
    recallMessage,
    markMessagesAsRead,
    deleteMessage,
    forwardMessage,
    createGroupConversation
  };
};
