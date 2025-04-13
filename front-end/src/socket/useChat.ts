"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocketContext } from "./SocketContext";

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

  // Tải danh sách cuộc trò chuyện
  const loadConversations = useCallback(() => {
    console.log("=== loadConversations được gọi ===>");
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

  // Kết nối người dùng khi socket sẵn sàng
  useEffect(() => {
    // Reset trạng thái khi userId thay đổi
    setIsUserConnected(false);

    // Kiểm tra điều kiện kết nối
    if (!socket) {
      console.log("Socket chưa sẵn sàng");
      return;
    }

    if (!isValidUserId) {
      console.log("userId không hợp lệ:", userId);
      setError("Không thể kết nối: Thiếu thông tin người dùng");
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

    // Lắng nghe sự kiện kết nối thành công
    const handleConnectionSuccess = (data: any) => {
      console.log("Kết nối socket thành công:", data);
      setIsUserConnected(true);
      setError(null); // Xóa lỗi nếu có

      // Tự động tải danh sách cuộc trò chuyện sau khi kết nối thành công
      loadConversations();
    };

    // Lắng nghe lỗi kết nối
    const handleConnectionError = (data: any) => {
      console.error("Lỗi kết nối socket:", data);
      setError(`Lỗi kết nối: ${data.message || 'Không xác định'}`);
    };

    // Lắng nghe tin nhắn chưa đọc
    const handleUnreadMessages = (data: { messages: Message[]; count: number }) => {
      console.log(`Nhận ${data.count} tin nhắn chưa đọc`);
      setUnreadMessages(data.messages);
    };

    socket.on("connection_success", handleConnectionSuccess);
    socket.on("connection_error", handleConnectionError);
    socket.on("unread_messages", handleUnreadMessages);

    return () => {
      socket.off("connection_success", handleConnectionSuccess);
      socket.off("connection_error", handleConnectionError);
      socket.off("unread_messages", handleUnreadMessages);
    };
  }, [socket, isConnected, userId, isValidUserId, loadConversations]);

  // Xử lý phản hồi tải tin nhắn
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

  // Hàm loadConversations đã được định nghĩa ở trên

  // Xử lý phản hồi tải tin nhắn
  const handleLoadMessagesResponse = useCallback((data: any) => {
    console.log("Phản hồi tải tin nhắn (raw):", JSON.stringify(data, null, 2));

    try {
      // Kiểm tra cấu trúc dữ liệu phản hồi
      if (!data) {
        console.error("Phản hồi tải tin nhắn rỗng");
        setLoading(false);
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
        setLoading(false);
        return;
      }

      console.log(`Nhận ${messages.length} tin nhắn cho cuộc trò chuyện ${conversationId}`);

      if (messages.length === 0) {
        console.log(`Không có tin nhắn nào cho cuộc trò chuyện ${conversationId}`);
        setMessages((prev) => ({
          ...prev,
          [conversationId]: [],
        }));
        setLoading(false);
        return;
      }

      // Sắp xếp tin nhắn theo thời gian
      const sortedMessages = [...messages].sort((a, b) => {
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      });

      console.log(`Đã sắp xếp ${sortedMessages.length} tin nhắn theo thời gian`);

      // Đánh dấu tin nhắn của người dùng hiện tại
      const enhancedMessages = sortedMessages.map(msg => {
        console.log("Processing message:", msg.content, "idSender:", msg.idSender, "userId:", userId, "isOwn:", msg.idSender === userId);
        return {
          ...msg,
          isOwn: msg.idSender === userId // Đánh dấu tin nhắn của người dùng hiện tại
        };
      });

      console.log(`Đã xử lý ${enhancedMessages.length} tin nhắn, cập nhật vào state`);

      // Cập nhật danh sách tin nhắn
      setMessages((prev) => {
        // Kiểm tra xem đã có tin nhắn cho cuộc trò chuyện này chưa
        const existingMessages = prev[conversationId] || [];

        if (existingMessages.length > 0) {
          console.log(`Đã có ${existingMessages.length} tin nhắn cho cuộc trò chuyện ${conversationId}, kết hợp với tin nhắn mới`);

          // Lọc các tin nhắn mới chưa có trong danh sách
          const existingIds = new Set(existingMessages.map(msg => msg.idMessage));
          const newMessages = enhancedMessages.filter(msg => !existingIds.has(msg.idMessage));

          if (newMessages.length > 0) {
            console.log(`Thêm ${newMessages.length} tin nhắn mới vào cuộc trò chuyện ${conversationId}`);
            // Kết hợp và sắp xếp lại tất cả tin nhắn
            const allMessages = [...existingMessages, ...newMessages].sort((a, b) => {
              return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
            });

            return {
              ...prev,
              [conversationId]: allMessages,
            };
          }

          return prev;
        }

        // Nếu chưa có tin nhắn, thêm tất cả tin nhắn mới
        return {
          ...prev,
          [conversationId]: enhancedMessages,
        };
      });

      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi xử lý phản hồi tải tin nhắn:", error);
      setLoading(false);
    }
  }, [userId]);

  // Đăng ký sự kiện tải tin nhắn
  useEffect(() => {
    if (!socket) return;

    console.log("Registering load_messages_response event handler");

    // Xử lý sự kiện load_messages_response trực tiếp để debug
    const handleLoadMessagesResponseDirect = (data: any) => {
      console.log("Received load_messages_response directly:", data);
      handleLoadMessagesResponse(data);
    };

    socket.on("load_messages_response", handleLoadMessagesResponseDirect);

    // Đăng ký sự kiện "catch-all" để xem tất cả các sự kiện
    socket.onAny((event, ...args) => {
      console.log(`Socket event received: ${event}`, args);
    });

    return () => {
      console.log("Unregistering load_messages_response event handler");
      socket.off("load_messages_response", handleLoadMessagesResponseDirect);
      socket.offAny();
    };
  }, [socket, handleLoadMessagesResponse]);

  // Tải tin nhắn của một cuộc trò chuyện
  const loadMessages = useCallback(
    (idConversation: string) => {
      if (!socket) {
        console.log("Không thể tải tin nhắn: Socket chưa sẵn sàng");
        return;
      }

      // Chỉ kiểm tra socket, không kiểm tra các điều kiện khác để đảm bảo luôn có thể tải tin nhắn
      setLoading(true);
      setError(null);

      console.log(`Tải tin nhắn cho cuộc trò chuyện ${idConversation}, socket ID: ${socket.id}, socket connected: ${socket.connected}`);

      // Xóa tin nhắn hiện tại của cuộc trò chuyện này (nếu có)
      setMessages((prev) => {
        const newMessages = { ...prev };
        delete newMessages[idConversation];
        return newMessages;
      });

      // Đảm bảo socket đã kết nối trước khi gửi sự kiện
      if (!socket.connected) {
        console.log("Socket chưa kết nối, thử kết nối lại trước khi tải tin nhắn");
        socket.connect();
      }

      // Gửi yêu cầu tải tin nhắn
      socket.emit("load_messages", {
        IDConversation: idConversation,
        lastMessageId: null,  // Thay lastEvaluatedKey bằng lastMessageId
        limit: 50,
      });

      console.log(`Đã gửi yêu cầu tải tin nhắn cho cuộc trò chuyện ${idConversation}`);

      const timeoutId = setTimeout(() => {
        console.log(`Timeout khi tải tin nhắn cho cuộc trò chuyện ${idConversation}`);
        setLoading(false);
        setError("Không thể tải tin nhắn: Hết thời gian chờ. Vui lòng thử lại sau.");
      }, 10000); // 10 giây timeout

      return () => {
        clearTimeout(timeoutId);
      };
    },
    [socket] // Chỉ phụ thuộc vào socket để đảm bảo luôn có thể tải tin nhắn
  );

  // Gửi tin nhắn
  const sendMessage = useCallback(
    (idConversation: string, text: string, type: "text" | "image" | "video" | "document" | "file" = "text", fileUrl?: string) => {
      if (!socket) {
        console.log("Không thể gửi tin nhắn: Socket chưa sẵn sàng");
        return;
      }

      console.log(`Gửi tin nhắn đến cuộc trò chuyện ${idConversation}: ${text}, type: ${type}, socket ID: ${socket.id}, socket connected: ${socket.connected}`);

      // Tìm thông tin người nhận từ cuộc trò chuyện
      const conversation = conversations.find(
        (conv) => conv.idConversation === idConversation
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
        idConversation: idConversation,
        type: type,
        content: type === "text" ? text : (fileUrl || ""),
        dateTime: new Date().toISOString(),
        isRead: false,
        isOwn: true, // Đánh dấu tin nhắn do người dùng hiện tại gửi
        senderInfo: {
          id: userId
        }
      };

      console.log("Created temp message with type:", tempMessage.type);

      // Cập nhật danh sách tin nhắn với tin nhắn tạm thời
      setMessages((prev) => {
        const conversationMessages = prev[idConversation] || [];
        return {
          ...prev,
          [idConversation]: [...conversationMessages, tempMessage],
        };
      });

      // Đảm bảo socket đã kết nối trước khi gửi sự kiện
      if (!socket.connected) {
        console.log("Socket chưa kết nối, thử kết nối lại trước khi gửi tin nhắn");
        socket.connect();
      }

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
      console.log("Sent message to server:", payload);
    },
    [socket, conversations, userId]
  );

  // Đánh dấu tin nhắn đã đọc
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

      console.log(`Đánh dấu ${messageIds.length} tin nhắn đã đọc trong cuộc trò chuyện ${idConversation}, socket ID: ${socket.id}, socket connected: ${socket.connected}`);

      // Đảm bảo socket đã kết nối trước khi gửi sự kiện
      if (!socket.connected) {
        console.log("Socket chưa kết nối, thử kết nối lại trước khi đánh dấu đã đọc");
        socket.connect();
      }

      // Gửi yêu cầu đánh dấu đã đọc theo API mới
      socket.emit("mark_messages_read", {
        conversationId: idConversation,
        receiverId: userId, // Người nhận là người dùng hiện tại
      });
      console.log("Sent mark_messages_read to server");

      // Cập nhật trạng thái tin nhắn trong state
      setMessages((prev) => {
        const conversationMessages = prev[idConversation] || [];
        const updatedMessages = conversationMessages.map((msg) => {
          // Chỉ đánh dấu đã đọc các tin nhắn mà người dùng hiện tại là người nhận
          if (messageIds.includes(msg.idMessage) && msg.idReceiver === userId) {
            return { ...msg, isRead: true };
          }
          return msg;
        });

        return {
          ...prev,
          [idConversation]: updatedMessages,
        };
      });

      // Cập nhật số tin nhắn chưa đọc trong danh sách cuộc trò chuyện
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.idConversation === idConversation) {
            return { ...conv, unreadCount: 0 };
          }
          return conv;
        });
      });
    },
    [socket, conversations, userId]
  );

  // Xóa tin nhắn
  const deleteMessage = useCallback(
    (messageId: string, idConversation: string) => {
      if (!socket || !isConnected || !isUserConnected || !isValidUserId) {
        console.log("Không thể xóa tin nhắn: Chưa sẵn sàng");
        return;
      }

      console.log(`Xóa tin nhắn ${messageId} trong cuộc trò chuyện ${idConversation}`);

      // Gửi yêu cầu xóa tin nhắn
      socket.emit("delete_message", {
        idMessage: messageId,
        idSender: userId, // Chỉ người gửi mới có thể xóa tin nhắn
      });

      // Cập nhật trạng thái tin nhắn trong state ngay lập tức (optimistic update)
      setMessages((prev) => {
        const conversationMessages = prev[idConversation] || [];
        const updatedMessages = conversationMessages.map((msg) => {
          if (msg.idMessage === messageId) {
            return { ...msg, isRemove: true };
          }
          return msg;
        });

        return {
          ...prev,
          [idConversation]: updatedMessages,
        };
      });
    },
    [socket, isConnected, isUserConnected, isValidUserId, userId]
  );

  // Xử lý sự kiện xóa tin nhắn thành công
  useEffect(() => {
    if (!socket) return;

    const handleDeleteMessageSuccess = (data: { messageId: string, updatedMessage: Message }) => {
      console.log("Tin nhắn đã được xóa:", data);

      // Cập nhật danh sách tin nhắn
      if (data.updatedMessage && data.updatedMessage.idConversation) {
        setMessages((prev) => {
          const conversationId = data.updatedMessage.idConversation;
          const conversationMessages = prev[conversationId] || [];
          const updatedMessages = conversationMessages.map((msg) => {
            if (msg.idMessage === data.messageId) {
              return { ...msg, ...data.updatedMessage, isRemove: true };
            }
            return msg;
          });

          return {
            ...prev,
            [conversationId]: updatedMessages,
          };
        });
      }
    };

    socket.on("delete_message_success", handleDeleteMessageSuccess);

    return () => {
      socket.off("delete_message_success", handleDeleteMessageSuccess);
    };
  }, [socket]);

  // Chuyển tiếp tin nhắn
  const forwardMessage = useCallback(
    (messageId: string, targetConversationIds: string[]) => {
      if (!socket || !isConnected || !isUserConnected || !isValidUserId) {
        console.log("Không thể chuyển tiếp tin nhắn: Chưa sẵn sàng");
        return;
      }

      console.log(`Chuyển tiếp tin nhắn ${messageId} đến ${targetConversationIds.length} cuộc trò chuyện`);

      // Gửi yêu cầu chuyển tiếp tin nhắn
      socket.emit("forward_message", {
        IDMessageDetail: messageId,
        targetConversations: targetConversationIds,
        IDSender: userId
      });
    },
    [socket, isConnected, isUserConnected, isValidUserId, userId]
  );

  // Xử lý sự kiện chuyển tiếp tin nhắn thành công
  useEffect(() => {
    if (!socket) return;

    const handleForwardMessageSuccess = (data: {
      success: boolean,
      results: Array<{
        conversationId: string,
        message: Message
      }>
    }) => {
      console.log("Tin nhắn đã được chuyển tiếp:", data);

      // Cập nhật danh sách tin nhắn cho từng cuộc trò chuyện
      if (data.success && data.results && data.results.length > 0) {
        data.results.forEach(result => {
          const { conversationId, message } = result;

          setMessages((prev) => {
            const conversationMessages = prev[conversationId] || [];
            return {
              ...prev,
              [conversationId]: [...conversationMessages, { ...message, isOwn: message.idSender === userId }],
            };
          });
        });
      }
    };

    socket.on("forward_message_success", handleForwardMessageSuccess);

    return () => {
      socket.off("forward_message_success", handleForwardMessageSuccess);
    };
  }, [socket, userId]);

  // Xử lý lỗi chung đã được định nghĩa ở trên

  // Lắng nghe các sự kiện liên quan đến tin nhắn và trạng thái người dùng
  useEffect(() => {
    console.log("Đăng ký lắng nghe các sự kiện liên quan đến tin nhắn và trạng thái người dùng");

    // Chỉ kiểm tra socket, không kiểm tra các điều kiện khác để đảm bảo sự kiện luôn được đăng ký
    if (!socket) {
      console.log("Socket chưa sẵn sàng, không đăng ký sự kiện tin nhắn");
      return;
    }

    console.log("Socket ID:", socket.id, "Socket connected:", socket.connected);

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

        // Nếu là tin nhắn của chính mình gửi từ tab khác, kiểm tra xem đã có tin nhắn tạm thời chưa
        if (isOwnMessage) {
          setMessages((prev) => {
            const conversationMessages = prev[conversationId] || [];

            // Kiểm tra xem có tin nhắn tạm thời có nội dung giống với tin nhắn chính thức không
            const tempMessageIndex = conversationMessages.findIndex(msg =>
              msg && msg.idMessage && msg.idMessage.startsWith('temp-') && msg.content === message.content
            );

            // Nếu tìm thấy tin nhắn tạm thời, thay thế nó bằng tin nhắn chính thức
            if (tempMessageIndex !== -1) {
              console.log("Tìm thấy tin nhắn tạm thời, thay thế bằng tin nhắn chính thức");
              const newMessages = [...conversationMessages];
              newMessages[tempMessageIndex] = { ...message, isOwn: true };
              return {
                ...prev,
                [conversationId]: newMessages,
              };
            }

            // Kiểm tra xem tin nhắn đã tồn tại chưa (tránh trùng lặp)
            const messageExists = conversationMessages.some(msg =>
              msg && msg.idMessage && msg.idMessage === message.idMessage
            );

            if (messageExists) {
              console.log("Tin nhắn đã tồn tại, không thêm vào");
              return prev;
            }

            // Nếu không tìm thấy tin nhắn tạm thời và tin nhắn chưa tồn tại, thêm tin nhắn mới
            console.log(`Thêm tin nhắn của chính mình vào cuộc trò chuyện ${conversationId}`);
            return {
              ...prev,
              [conversationId]: [...conversationMessages, { ...message, isOwn: true }],
            };
          });
        } else {
          // Đảm bảo tin nhắn nhận được có đầy đủ thông tin
          const enhancedMessage = {
            ...message,
            isOwn: false,  // Đánh dấu tin nhắn không phải của người dùng hiện tại
            dateTime: message.dateTime || new Date().toISOString() // Đảm bảo có dateTime
          };

          console.log("Tin nhắn đã được cải thiện:", enhancedMessage);

          // Cập nhật danh sách tin nhắn
          setMessages((prev) => {
            const conversationMessages = prev[conversationId] || [];

            // Kiểm tra xem tin nhắn đã tồn tại chưa (tránh trùng lặp)
            const messageExists = conversationMessages.some(msg =>
              msg && msg.idMessage && msg.idMessage === enhancedMessage.idMessage
            );

            if (messageExists) {
              console.log("Tin nhắn đã tồn tại, không thêm vào");
              return prev;
            }

            console.log(`Thêm tin nhắn vào cuộc trò chuyện ${conversationId}`);
            return {
              ...prev,
              [conversationId]: [...conversationMessages, enhancedMessage],
            };
          });

          // Cập nhật lastMessage trong danh sách cuộc trò chuyện
          setConversations(prev => {
            return prev.map(conv => {
              if (conv.idConversation === conversationId) {
                return {
                  ...conv,
                  lastMessage: message.content,
                  lastChange: message.dateTime,
                  unreadCount: (conv.unreadCount || 0) + 1
                };
              }
              return conv;
            });
          });

          // Phát ra âm thanh thông báo khi nhận tin nhắn mới
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

    // Đăng ký sự kiện receive_message
    console.log("Registering receive_message event handler");
    socket.on("receive_message", handleReceiveMessage);

    // Đăng ký sự kiện "catch-all" để xem tất cả các sự kiện
    socket.onAny((event, ...args) => {
      console.log(`Socket event received: ${event}`, args);
    });

    // Thử kết nối lại nếu socket đã được khởi tạo nhưng chưa kết nối
    if (socket && !socket.connected) {
      console.log("Socket đã được khởi tạo nhưng chưa kết nối, thử kết nối lại...");
      socket.connect();
    }

    // Hủy đăng ký các sự kiện khi component unmount
    return () => {
      console.log("Unregistering receive_message event handler");
      socket.off("receive_message", handleReceiveMessage);
      socket.offAny();
    };
  }, [socket, userId]); // Chỉ phụ thuộc vào socket và userId

  // Xử lý phản hồi gửi tin nhắn thành công
  useEffect(() => {
    if (!socket || !isConnected || !isUserConnected) return;

    // Xử lý phản hồi khi gửi tin nhắn thành công
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

      console.log("Phản hồi gửi tin nhắn đã xử lý:", { message, conversationId });

      // Đảm bảo tin nhắn có đầy đủ thông tin
      const enhancedMessage = {
        ...message,
        isOwn: true,  // Đánh dấu tin nhắn do người dùng hiện tại gửi
        dateTime: message.dateTime || new Date().toISOString() // Đảm bảo có dateTime
      };

      // Cập nhật danh sách tin nhắn, thay thế tin nhắn tạm thời bằng tin nhắn chính thức
      setMessages((prev) => {
        const conversationMessages = prev[conversationId] || [];

        // Tìm tin nhắn tạm thời có nội dung giống với tin nhắn chính thức
        const tempMessageIndex = conversationMessages.findIndex(msg =>
          msg && msg.idMessage && msg.idMessage.startsWith('temp-') && msg.content === message.content
        );

        // Nếu tìm thấy tin nhắn tạm thời, thay thế nó bằng tin nhắn chính thức
        if (tempMessageIndex !== -1) {
          const newMessages = [...conversationMessages];
          newMessages[tempMessageIndex] = enhancedMessage;
          return {
            ...prev,
            [conversationId]: newMessages,
          };
        }

        // Nếu không tìm thấy, thêm tin nhắn chính thức vào danh sách
        return {
          ...prev,
          [conversationId]: [...conversationMessages, enhancedMessage],
        };
      });
    };

    socket.on("send_message_success", handleSendMessageSuccess);

    return () => {
      socket.off("send_message_success", handleSendMessageSuccess);
    };
  }, [socket, isUserConnected]);

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
    forwardMessage,
  };
};
