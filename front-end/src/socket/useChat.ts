"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocketContext } from "./SocketContext";

export interface Message {
  idMessage: string;
  idSender: string;
  idReceiver?: string;
  idConversation: string;
  type: "text" | "file" | "forward";
  content: string;
  dateTime: string;
  isRead: boolean;
  isRemove?: boolean;
  isRecall?: boolean;
  isOwn?: boolean; // Thêm trường để đánh dấu tin nhắn của người dùng hiện tại
}

export interface Conversation {
  idConversation: string;
  idSender: string;
  idReceiver: string;
  lastMessage: string;
  lastChange: string;
  unreadCount?: number;
  userInfo?: {
    fullname?: string;
    avatar?: string;
    phone?: string;
  };
}

export const useChat = (userId: string) => {
  console.log("useChat được gọi với userId:", userId);

  const { socket, isConnected } = useSocketContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);
  const [isUserConnected, setIsUserConnected] = useState<boolean>(false);

  // Kiểm tra userId hợp lệ
  const isValidUserId = userId && userId.trim().length > 0;

  // Log userId để debug
  useEffect(() => {
    console.log("useChat hook initialized with userId:", userId);
    console.log("isValidUserId:", isValidUserId);
    console.log("socket:", !!socket);
    console.log("isConnected:", isConnected);
  }, [userId, isValidUserId, socket, isConnected]);

  // Kết nối người dùng khi socket sẵn sàng
  useEffect(() => {
    // Reset trạng thái khi userId thay đổi
    setIsUserConnected(false);

    // Kiểm tra điều kiện kết nối
    if (!socket || !isConnected) {
      console.log("Socket chưa sẵn sàng hoặc chưa kết nối");
      return;
    }

    if (!isValidUserId) {
      console.log("userId không hợp lệ:", userId);
      setError("Không thể kết nối: Thiếu thông tin người dùng");
      return;
    }

    console.log("Đăng ký người dùng online:", userId);
    socket.emit("new_user_connect", { id: userId });

    // Lắng nghe sự kiện kết nối thành công
    const handleConnectionSuccess = (data: any) => {
      console.log("Kết nối socket thành công:", data);
      setIsUserConnected(true);
      setError(null); // Xóa lỗi nếu có
    };

    // Lắng nghe lỗi kết nối
    const handleError = (data: any) => {
      console.error("Lỗi socket:", data);
      setError(`Lỗi kết nối: ${data.message || 'Không xác định'}`);
    };

    // Lắng nghe tin nhắn chưa đọc
    const handleUnreadMessages = (data: { messages: Message[]; count: number }) => {
      console.log(`Nhận ${data.count} tin nhắn chưa đọc`);
      setUnreadMessages(data.messages);
    };

    socket.on("connection_success", handleConnectionSuccess);
    socket.on("error", handleError);
    socket.on("unread_messages", handleUnreadMessages);

    return () => {
      socket.off("connection_success", handleConnectionSuccess);
      socket.off("error", handleError);
      socket.off("unread_messages", handleUnreadMessages);
    };
  }, [socket, isConnected, userId, isValidUserId]);

  // Xử lý phản hồi tải cuộc trò chuyện
  const handleLoadConversationsResponse = useCallback((data: {
    Items: Conversation[];
    LastEvaluatedKey: number;
  }) => {
    console.log("Nhận danh sách cuộc trò chuyện:", data.Items.length);
    setConversations(data.Items);
    setLoading(false);
  }, []);

  // Xử lý lỗi chung
  const handleError = useCallback((data: { message: string; error: string }) => {
    console.error("Lỗi socket:", data);
    setError(`Lỗi: ${data.message}`);
    setLoading(false);
  }, []);

  // Đăng ký các sự kiện socket
  useEffect(() => {
    if (!socket) return;

    // Đăng ký lắng nghe các sự kiện
    socket.on("load_conversations_response", handleLoadConversationsResponse);
    socket.on("error", handleError);

    return () => {
      // Hủy đăng ký khi unmount
      socket.off("load_conversations_response", handleLoadConversationsResponse);
      socket.off("error", handleError);
    };
  }, [socket, handleLoadConversationsResponse, handleError]);

  // Tải danh sách cuộc trò chuyện
  const loadConversations = useCallback(() => {
    console.log("=== loadConversations được gọi ===>");
    console.log("Các trạng thái:", {
      socket: !!socket,
      isConnected,
      isValidUserId,
      isUserConnected,
      userId
    });

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
      setError("Không thể tải cuộc trò chuyện: Thiếu thông tin người dùng");
      return;
    }

    // Kiểm tra người dùng đã kết nối chưa
    if (!isUserConnected) {
      console.log("Người dùng chưa kết nối, tự động kết nối trước khi tải cuộc trò chuyện");
      // Tự động thiết lập kết nối người dùng
      socket.emit("new_user_connect", { id: userId });
      // Đặt isUserConnected = true để tiếp tục
      setIsUserConnected(true);
      // Không return để tiếp tục tải cuộc trò chuyện
    }

    setLoading(true);
    setError(null);

    console.log("Tải danh sách cuộc trò chuyện cho người dùng:", userId);
    socket.emit("load_conversations", {
      IDUser: userId,
      lastEvaluatedKey: 0,
    });

    // Timeout để tránh trạng thái loading vô hạn
    const timeoutId = setTimeout(() => {
      console.log("Timeout khi tải cuộc trò chuyện");
      setLoading(false);
      setError("Không thể tải cuộc trò chuyện: Hết thời gian chờ. Vui lòng thử lại sau.");
    }, 10000); // 10 giây timeout

    return () => {
      clearTimeout(timeoutId);
    };
  }, [socket, isConnected, userId, isValidUserId, isUserConnected]);

  // Xử lý phản hồi tải tin nhắn
  const handleLoadMessagesResponse = useCallback((data: {
    messages: Message[];
    hasMore: boolean;
    conversationId: string;
  }) => {
    console.log(`Nhận ${data.messages.length} tin nhắn cho cuộc trò chuyện ${data.conversationId}`);

    // Đánh dấu tin nhắn của người dùng hiện tại
    const enhancedMessages = data.messages.map(msg => {
      console.log("Processing message:", msg.content, "idSender:", msg.idSender, "userId:", userId, "isOwn:", msg.idSender === userId);
      return {
        ...msg,
        isOwn: msg.idSender === userId // Đánh dấu tin nhắn của người dùng hiện tại
      };
    });

    setMessages((prev) => ({
      ...prev,
      [data.conversationId]: enhancedMessages,
    }));

    setLoading(false);
  }, [userId]);

  // Đăng ký sự kiện tải tin nhắn
  useEffect(() => {
    if (!socket) return;

    socket.on("load_messages_response", handleLoadMessagesResponse);

    return () => {
      socket.off("load_messages_response", handleLoadMessagesResponse);
    };
  }, [socket, handleLoadMessagesResponse]);

  // Tải tin nhắn của một cuộc trò chuyện
  const loadMessages = useCallback(
    (conversationId: string) => {
      if (!socket || !isConnected || !isUserConnected || !isValidUserId) {
        console.log("Không thể tải tin nhắn: Chưa sẵn sàng");
        return;
      }

      setLoading(true);
      setError(null);

      console.log(`Tải tin nhắn cho cuộc trò chuyện ${conversationId}`);
      socket.emit("load_messages", {
        IDConversation: conversationId,
        lastEvaluatedKey: null,
        limit: 50,
      });

      const timeoutId = setTimeout(() => {
        console.log(`Timeout khi tải tin nhắn cho cuộc trò chuyện ${conversationId}`);
        setLoading(false);
        setError("Không thể tải tin nhắn: Hết thời gian chờ. Vui lòng thử lại sau.");
      }, 10000); // 10 giây timeout

      return () => {
        clearTimeout(timeoutId);
      };
    },
    [socket, isConnected, isUserConnected, isValidUserId]
  );

  // Gửi tin nhắn
  const sendMessage = useCallback(
    (conversationId: string, text: string) => {
      if (!socket || !isConnected || !isUserConnected || !isValidUserId) {
        console.log("Không thể gửi tin nhắn: Chưa sẵn sàng");
        return;
      }

      console.log(`Gửi tin nhắn đến cuộc trò chuyện ${conversationId}: ${text}`);

      // Tìm thông tin người nhận từ cuộc trò chuyện
      const conversation = conversations.find(
        (conv) => conv.idConversation === conversationId
      );

      if (!conversation) {
        console.error("Không tìm thấy cuộc trò chuyện");
        return;
      }

      // Xác định người nhận (nếu người gửi là userId thì người nhận là idReceiver, ngược lại là idSender)
      const receiverId = conversation.idSender === userId
        ? conversation.idReceiver
        : conversation.idSender;

      // Tạo tin nhắn tạm thời để hiển thị ngay lập tức
      const tempMessage: Message = {
        idMessage: `temp-${Date.now()}`,
        idSender: userId,
        idReceiver: receiverId,
        idConversation: conversationId,
        type: "text",
        content: text,
        dateTime: new Date().toISOString(),
        isRead: false,
        isOwn: true, // Đánh dấu tin nhắn do người dùng hiện tại gửi
      };

      console.log("Created temp message with isOwn:", tempMessage.isOwn);

      // Cập nhật danh sách tin nhắn với tin nhắn tạm thời
      setMessages((prev) => {
        const conversationMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: [...conversationMessages, tempMessage],
        };
      });

      // Gửi tin nhắn đến server
      socket.emit("send_message", {
        IDSender: userId,
        IDReceiver: receiverId,
        IDConversation: conversationId,
        textMessage: text,
      });
    },
    [socket, isConnected, isUserConnected, isValidUserId, conversations, userId]
  );

  // Đánh dấu tin nhắn đã đọc
  const markMessagesAsRead = useCallback(
    (messageIds: string[], conversationId: string) => {
      if (!socket || !isConnected || !isUserConnected || !isValidUserId) {
        console.log("Không thể đánh dấu đã đọc: Chưa sẵn sàng");
        return;
      }

      if (!messageIds.length) {
        return;
      }

      console.log(`Đánh dấu ${messageIds.length} tin nhắn đã đọc`);
      socket.emit("mark_messages_read", {
        messageIds,
        conversationId,
      });

      // Cập nhật trạng thái tin nhắn trong state
      setMessages((prev) => {
        const conversationMessages = prev[conversationId] || [];
        const updatedMessages = conversationMessages.map((msg) => {
          if (messageIds.includes(msg.idMessage)) {
            return { ...msg, isRead: true };
          }
          return msg;
        });

        return {
          ...prev,
          [conversationId]: updatedMessages,
        };
      });
    },
    [socket, isConnected, isUserConnected, isValidUserId]
  );

  // Xóa tin nhắn
  const deleteMessage = useCallback(
    (messageId: string, conversationId: string) => {
      if (!socket || !isConnected || !isUserConnected || !isValidUserId) {
        console.log("Không thể xóa tin nhắn: Chưa sẵn sàng");
        return;
      }

      console.log(`Xóa tin nhắn ${messageId}`);
      socket.emit("delete_message", {
        idMessage: messageId,
        idSender: userId,
      });

      // Lắng nghe phản hồi xóa tin nhắn thành công
      const handleDeleteMessageSuccess = (data: { idMessage: string }) => {
        console.log("Tin nhắn đã được xóa:", data);

        // Cập nhật danh sách tin nhắn
        setMessages((prev) => {
          const conversationMessages = prev[conversationId] || [];
          const updatedMessages = conversationMessages.map((msg) => {
            if (msg.idMessage === data.idMessage) {
              return { ...msg, isRemove: true };
            }
            return msg;
          });

          return {
            ...prev,
            [conversationId]: updatedMessages,
          };
        });
      };

      socket.on("message_deleted", handleDeleteMessageSuccess);
      socket.on("error", handleError);

      return () => {
        socket.off("message_deleted", handleDeleteMessageSuccess);
        socket.off("error", handleError);
      };
    },
    [socket, isConnected, isUserConnected, isValidUserId]
  );

  // Xử lý lỗi chung đã được định nghĩa ở trên

  // Lắng nghe tin nhắn mới và phản hồi gửi tin nhắn thành công
  useEffect(() => {
    if (!socket || !isConnected || !isUserConnected) return;

    // Xử lý tin nhắn nhận được từ người khác
    const handleReceiveMessage = (data: Message) => {
      console.log("Nhận tin nhắn mới:", data);

      // Đảm bảo tin nhắn nhận được có đầy đủ thông tin
      const enhancedMessage = {
        ...data,
        isOwn: false,  // Đánh dấu tin nhắn không phải do người dùng hiện tại gửi
        dateTime: data.dateTime || new Date().toISOString() // Đảm bảo có dateTime
      };

      // Cập nhật danh sách tin nhắn
      setMessages((prev) => {
        const conversationMessages = prev[data.idConversation] || [];
        return {
          ...prev,
          [data.idConversation]: [...conversationMessages, enhancedMessage],
        };
      });
    };

    // Xử lý phản hồi khi gửi tin nhắn thành công
    const handleSendMessageSuccess = (data: Message) => {
      console.log("Phản hồi gửi tin nhắn thành công:", data);

      // Đảm bảo tin nhắn có đầy đủ thông tin
      const enhancedMessage = {
        ...data,
        isOwn: true,  // Đánh dấu tin nhắn do người dùng hiện tại gửi
        dateTime: data.dateTime || new Date().toISOString() // Đảm bảo có dateTime
      };

      // Cập nhật danh sách tin nhắn, thay thế tin nhắn tạm thời bằng tin nhắn chính thức
      setMessages((prev) => {
        const conversationMessages = prev[data.idConversation] || [];

        // Lọc bỏ tin nhắn tạm thời có nội dung giống với tin nhắn chính thức
        const filteredMessages = conversationMessages.filter(msg =>
          !(msg.idMessage.startsWith('temp-') && msg.content === data.content)
        );

        return {
          ...prev,
          [data.idConversation]: [...filteredMessages, enhancedMessage],
        };
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("send_message_success", handleSendMessageSuccess);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("send_message_success", handleSendMessageSuccess);
    };
  }, [socket, isConnected, isUserConnected]);

  return {
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
  };
};
