// First install the package:
// npm install react-intersection-observer
import { useInView } from 'react-intersection-observer';
import ChatInput from "./chat-input";
import ChatMessage from "./chat-message";
import { Conversation, Message, useChat } from "@/socket/useChat";
import { Info, Loader2, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSocketContext } from "@/socket/SocketContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import useUserStore from '@/stores/useUserStoree';

interface ChatDetailProps {
  onToggleInfo: () => void;
  showChatInfo: boolean;
  activeConversation: Conversation | null;
  messages: Message[];
  loadingMoreMessages: boolean;
  hasMoreMessages: { [conversationId: string]: boolean };
  combinedMessages: (conversationId: string) => Message[];
  loadMoreMessages: (conversationId: string, lastMessageId: string) => void;
  onSendMessage: (text: string, type?: string, fileUrl?: string, replyingTo?: {
    name: string;
    messageId: string;
    content: string;
    type: string;
  }) => void;
  onDeleteMessage?: (messageId: string) => void;
  onRecallMessage?: (messageId: string) => void;
  onForwardMessage?: (messageId: string, targetConversations: string[]) => void;
  addReaction?: (messageId: string, reaction: string) => void;
  conversations: Conversation[];
  loading: boolean;

}

export default function ChatDetail({
  onToggleInfo,
  showChatInfo,
  activeConversation,
  messages: chatMessages,
  loadingMoreMessages,
  hasMoreMessages,
  combinedMessages,
  loadMoreMessages,
  onSendMessage,
  onDeleteMessage,
  onRecallMessage,
  onForwardMessage,
  addReaction,
  conversations,
  loading,
}: ChatDetailProps) {
  const { user } = useUserStore();
  const { startCall } = useChat(user?.id || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocketContext();

  const [replyingTo, setReplyingTo] = useState<{
    name: string;
    messageId: string;
    content: string;
    type: string;
  } | null>(null);

  const [forwardingMessage, setForwardingMessage] = useState<string | null>(
    null
  );
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<string[]>(
    []
  );
  const [availableConversations, setAvailableConversations] = useState<
    Conversation[]
  >([]);

  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
  });
  const displayMessages = combinedMessages(activeConversation?.idConversation || '');
  // State để lưu ID tin nhắn đầu tiên hiện tại
  const [firstVisibleMessageId, setFirstVisibleMessageId] = useState<string | null>(null);
  //ref để lưu vị trí scroll hiện tại
  const scrollPositionRef = useRef<number>(0);
  //ref cho container tin nhắn
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  //chỉ scroll xuống cuối khi có tin nhắn mới, không phải khi tải tin nhắn cũ
  useEffect(() => {
    // Lưu vị trí scroll hiện tại trước khi cập nhật
    if (messagesContainerRef.current) {
      scrollPositionRef.current = messagesContainerRef.current.scrollTop;
    }

    // Lấy ID tin nhắn đầu tiên khi messages thay đổi
    if (chatMessages && chatMessages.length > 0) {
      // Lấy tin nhắn cũ nhất (đầu tiên) trong danh sách
      const oldestMessage = [...chatMessages].sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      )[0];

      if (oldestMessage) {
        setFirstVisibleMessageId(oldestMessage.idMessage);
      }
    }
  }, [chatMessages]);

  // xử lý việc khôi phục vị trí scroll sau khi tải tin nhắn cũ
  useEffect(() => {
    if (loadingMoreMessages === false && messagesContainerRef.current && scrollPositionRef.current > 0) {
      // Nếu vừa tải xong tin nhắn cũ, giữ nguyên vị trí scroll
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = scrollPositionRef.current + 200; // Add offset to account for new content
        }
      }, 100); // Small delay to ensure DOM has updated
    }
  }, [loadingMoreMessages]);

  // useEffect cho trường hợp tin nhắn mới
  useEffect(() => {
    const isInitialLoad = displayMessages.length > 0 && scrollPositionRef.current === 0;

    if (isInitialLoad && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages.length]);

  // useEffect riêng cho trường hợp loadingMoreMessages thay đổi
  useEffect(() => {
    const isNewMessageFromCurrentUser = !loadingMoreMessages &&
      displayMessages.length > 0 &&
      displayMessages[displayMessages.length - 1].isOwn;

    if (isNewMessageFromCurrentUser && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [loadingMoreMessages, displayMessages.length]);
  // Khi người dùng lướt đến đầu danh sách và có firstVisibleMessageId
  useEffect(() => {
    if (inView && firstVisibleMessageId && activeConversation?.idConversation && hasMoreMessages[activeConversation.idConversation]) {
      loadMoreMessages(activeConversation.idConversation, firstVisibleMessageId);
    }
  }, [inView, firstVisibleMessageId, activeConversation]);
  useEffect(() => {
    if (showForwardDialog) {
      const filteredConversations = conversations.filter(
        (conv) => conv.idConversation !== activeConversation?.idConversation
      );
      setAvailableConversations(filteredConversations);
    }
  }, [showForwardDialog, conversations, activeConversation]);

  // Hàm xử lý khi người dùng muốn reply một tin nhắn
  const handleReply = (messageId: string, content: string, type: string) => {
    setReplyingTo({
      name: activeConversation?.isGroup
        ? displayMessages.find(msg => msg.idMessage === messageId)?.senderInfo?.fullname || "Người dùng"
        : activeConversation?.otherUser?.fullname || "Người dùng",
      messageId,
      content,
      type,
    });
  };

  // Hàm hủy reply
  const cancelReply = () => {
    setReplyingTo(null);
  };
  // Thêm component hiển thị tin nhắn reply
  const ReplyPreview = ({ replyData, onCancel }: { replyData: { name: string; messageId: string; content: string; type: string; }; onCancel: () => void; }) => {
    return (
      <div className="bg-gray-100 p-2 rounded-md mb-2 border-l-4 border-blue-500">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-600">
            Trả lời {replyData.name}
          </span>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="text-sm text-gray-600 truncate">
          {replyData.type !== "text" ? (
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4V5h12v10z" clipRule="evenodd" />
              </svg>
              {replyData.type === "image" ? "Hình ảnh" : replyData.type === "video" ? "Video" : "Tệp đính kèm"}
            </span>
          ) : (
            replyData.content
          )}
        </div>
      </div>
    );
  };
  const handleForward = (messageId: string) => {
    setForwardingMessage(messageId);
    setShowForwardDialog(true);
    setSelectedConversations([]);
  };

  const handleDelete = (messageId: string) => {
    setDeletingMessage(messageId);
    setShowDeleteDialog(true);
  };

  const confirmForward = () => {
    if (
      forwardingMessage &&
      selectedConversations.length > 0 &&
      onForwardMessage
    ) {
      onForwardMessage(forwardingMessage, selectedConversations);
      setShowForwardDialog(false);
      setForwardingMessage(null);
      setSelectedConversations([]);
    }
  };

  const confirmDelete = () => {
    if (deletingMessage && onDeleteMessage) {
      onDeleteMessage(deletingMessage);
      setShowDeleteDialog(false);
      setDeletingMessage(null);
    }
  };

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversations((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId]
    );
  };
  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="mt-2 text-sm text-gray-500">Đang tải tin nhắn...</p>
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-gray-500">Chọn một cuộc trò chuyện để bắt đầu</p>
      </div>
    );
  }
  const SystemMessage = ({
    content,
    timestamp,
  }: {
    content: string;
    timestamp: string;
  }) => {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-50 rounded-full px-4 py-1.5 flex items-center max-w-[80%] shadow-sm border border-gray-100">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mr-2 shadow-sm">
            <Info className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-medium text-gray-600">{content}</span>
          <span className="text-[10px] text-gray-400 ml-2 font-light">
            {timestamp}
          </span>
        </div>
      </div>
    );
  };
  const handleVoiceCall = () => {
    if (!activeConversation.isGroup && activeConversation.otherUser?.id) {
      console.log("Gọi thoại với người dùng:", activeConversation.otherUser.id);
      startCall(activeConversation.otherUser.id, 'audio');
    } else {
      // Hiển thị thông báo không hỗ trợ gọi nhóm nếu cần
      console.log("Cuộc gọi nhóm chưa được hỗ trợ");
      // Có thể thêm toast notification ở đây
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
            {activeConversation?.isGroup ? (
              <Image
                src={
                  activeConversation.groupAvatar ||
                  "https://danhgiaxe.edu.vn/upload/2024/12/99-mau-avatar-nhom-dep-nhat-danh-cho-team-dong-nguoi-30.webp"
                }
                alt={activeConversation.groupName || "Group"}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <Image
                src={
                  activeConversation?.otherUser?.urlavatar ||
                  `https://ui-avatars.com/api/?name=${activeConversation?.otherUser?.fullname || "User"
                  }`
                }
                alt={activeConversation?.otherUser?.fullname || "User"}
                width={40}
                height={40}
                className="object-cover"
              />
            )}
          </div>
          <div>
            <h3 className="font-medium">
              {activeConversation?.isGroup
                ? activeConversation.groupName
                : activeConversation?.otherUser?.fullname || "Người dùng"}
            </h3>
            <p className="text-xs text-gray-500">
              {activeConversation?.isGroup
                ? `${activeConversation.groupMembers?.length || 0} thành viên`
                : activeConversation?.otherUser?.isOnline
                  ? "Đang hoạt động"
                  : "Không hoạt động"}
            </p>
          </div>
        </div>
        <div className="flex items-center">
        <button 
          className="p-2 rounded-full hover:bg-gray-200"
          onClick={handleVoiceCall}
          disabled={activeConversation.isGroup || !activeConversation.otherUser?.isOnline}
          title={activeConversation.isGroup 
            ? "Cuộc gọi nhóm chưa được hỗ trợ" 
            : !activeConversation.otherUser?.isOnline 
              ? "Người dùng không trực tuyến" 
              : "Gọi thoại"}
        >
          <Phone className={`w-5 h-5 ${
            (activeConversation.isGroup || !activeConversation.otherUser?.isOnline) 
              ? "text-gray-400" 
              : "text-gray-700"
          }`} />
        </button>
          <button
            className="p-2 rounded-full hover:bg-gray-100"
            onClick={onToggleInfo}
          >
            <Info className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Rest of the component remains the same */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-8" ref={messagesContainerRef}>
        {/* Hiển thị loading indicator khi đang tải thêm tin nhắn */}
        {loadingMoreMessages && (
          <div className="flex justify-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        )}

        {/* Thêm ref cho phần tử đầu tiên để phát hiện khi nào cần tải thêm */}
        <div ref={loadMoreRef}></div>
        {displayMessages.length > 0 ? (
          <>
            <div className="space-y-4">
              {[...displayMessages]
                .sort((a, b) => {
                  const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
                  const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
                  return dateA - dateB;
                })
                .map((msg, index) => {
                  if (!msg.content || msg.content.trim() === "") {
                    return null;
                  }
                  if (msg.idSender === "system") {
                    return (
                      <SystemMessage
                        key={msg.idMessage || `system-${index}`}
                        content={msg.content}
                        timestamp={
                          msg.dateTime
                            ? new Date(msg.dateTime).toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                            : new Date().toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                        }
                      />
                    );
                  }
                  let fileUrl;
                  let displayMessage = msg.content;

                  if (msg.type !== "text" && msg.content.includes("http")) {
                    const urlMatch = msg.content.match(/(https?:\/\/[^\s]+)/g);
                    fileUrl = urlMatch ? urlMatch[0] : undefined;

                    if (fileUrl) {
                      displayMessage = msg.content.replace(fileUrl, "").trim();

                      if (!displayMessage) {
                        if (msg.type === "image") {
                          displayMessage = "Đã gửi một hình ảnh";
                        } else if (msg.type === "video") {
                          displayMessage = "Đã gửi một video";
                        } else {
                          displayMessage = "Đã gửi một tệp đính kèm";
                        }
                      }
                    }
                  }

                  // Find sender name for group chats
                  let senderName = "";
                  let senderAvatar = "";

                  if (msg.senderInfo?.fullname) {
                    // Use sender info from the message if available
                    senderName = msg.senderInfo.fullname;
                    senderAvatar = msg.senderInfo.avatar || "";
                  } else if (activeConversation?.isGroup && msg.idSender) {
                    // Try to find the sender in the group members
                    const member = activeConversation.regularMembers?.find(
                      (member) => member.id === msg.idSender
                    );

                    if (member) {
                      senderName = member.fullname || msg.idSender;
                      senderAvatar = member.urlavatar || "";
                    } else if (activeConversation.owner?.id === msg.idSender) {
                      // Check if sender is the owner
                      senderName =
                        activeConversation.owner.fullname || msg.idSender;
                      senderAvatar = activeConversation.owner.urlavatar || "";
                    } else {
                      senderName = msg.idSender;
                    }
                  } else if (!activeConversation?.isGroup && !msg.isOwn) {
                    // For direct conversations, use otherUser info for messages not from current user
                    senderName =
                      activeConversation?.otherUser?.fullname || msg.idSender;
                    senderAvatar =
                      activeConversation?.otherUser?.urlavatar || "";
                  }
                  // Xử lý thông tin tin nhắn reply
                  let replyInfo = null;
                  if (msg.isReply && msg.idMessageReply) {
                    // Tìm tin nhắn gốc từ danh sách tin nhắn hiện có
                    const originalMessage = displayMessages.find(
                      (m) => m.idMessage === msg.idMessageReply
                    );

                    if (originalMessage) {
                      // Tìm thông tin người gửi tin nhắn gốc
                      let originalSenderName = "";

                      if (originalMessage.senderInfo?.fullname) {
                        originalSenderName = originalMessage.senderInfo.fullname;
                      } else if (activeConversation?.isGroup && originalMessage.idSender) {
                        const originalMember = activeConversation.regularMembers?.find(
                          (member) => member.id === originalMessage.idSender
                        );

                        if (originalMember) {
                          originalSenderName = originalMember.fullname || originalMessage.idSender;
                        } else if (activeConversation.owner?.id === originalMessage.idSender) {
                          originalSenderName = activeConversation.owner.fullname || originalMessage.idSender;
                        } else {
                          originalSenderName = originalMessage.idSender;
                        }
                      } else if (!activeConversation?.isGroup) {
                        originalSenderName = originalMessage.idSender === msg.idSender
                          ? activeConversation?.otherUser?.fullname || "Người dùng"
                          : "Bạn";
                      }

                      // Chuẩn bị nội dung tin nhắn gốc để hiển thị
                      let originalContent = originalMessage.content || "";
                      let originalType = originalMessage.type || "text";

                      if (originalType !== "text" && originalContent.includes("http")) {
                        const urlMatch = originalContent.match(/(https?:\/\/[^\s]+)/g);
                        const fileUrl = urlMatch ? urlMatch[0] : undefined;

                        if (fileUrl) {
                          originalContent = originalContent.replace(fileUrl, "").trim();

                          if (!originalContent) {
                            if (originalType === "image") {
                              originalContent = "Hình ảnh";
                            } else if (originalType === "video") {
                              originalContent = "Video";
                            } else {
                              originalContent = "Tệp đính kèm";
                            }
                          }
                        }
                      }

                      replyInfo = {
                        name: originalSenderName,
                        content: originalContent,
                        type: originalType
                      };
                    } else {
                      // Nếu không tìm thấy tin nhắn gốc, hiển thị thông tin mặc định
                      replyInfo = {
                        name: "Người dùng",
                        content: "Tin nhắn gốc không còn tồn tại",
                        type: "text"
                      };
                    }
                  }
                  return (
                    <ChatMessage
                      key={msg.idMessage || index}
                      messageId={msg.idMessage}
                      message={displayMessage}
                      isRemove={msg.isRemove || false}
                      timestamp={
                        msg.dateTime
                          ? new Date(msg.dateTime).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : new Date().toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                      }
                      isOwn={Boolean(msg.isOwn)}
                      type={msg.type}
                      fileUrl={fileUrl}
                      isRecall={msg.isRecall || false}
                      isGroup={activeConversation?.isGroup}
                      senderName={senderName}
                      senderAvatar={senderAvatar}
                      showSenderInfo={activeConversation?.isGroup && !msg.isOwn}
                      onReply={handleReply}
                      onForward={handleForward}
                      onRecallMessage={onRecallMessage}
                      onDelete={handleDelete}
                      isReply={msg.isReply || false}
                      replyInfo={replyInfo || undefined}
                      reactions={msg.reactions || {}}
                      onAddReaction={addReaction}
                    />
                  );
                })
                .filter(Boolean)}
              <div ref={messagesEndRef} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Chưa có tin nhắn nào</p>
          </div>
        )}
      </div>
      {/* Chat Input */}
      {/* <div className="p-3 border-t border-gray-200">
      {replyingTo && (
        <ReplyPreview replyData={replyingTo} onCancel={cancelReply} />
      )} */}
      <ChatInput
        onSendMessage={onSendMessage}
        replyingTo={replyingTo}
        onCancelReply={cancelReply}
      />
      {/* </div> */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chuyển tiếp tin nhắn</DialogTitle>
            <DialogDescription>
              Chọn cuộc trò chuyện để chuyển tiếp tin nhắn này
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-72 mt-4">
            <div className="space-y-4">
              {availableConversations.map((conv) => (
                <div
                  key={conv.idConversation}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={conv.idConversation}
                    checked={selectedConversations.includes(
                      conv.idConversation
                    )}
                    onCheckedChange={() =>
                      toggleConversationSelection(conv.idConversation)
                    }
                  />
                  <Label
                    htmlFor={conv.idConversation}
                    className="flex items-center"
                  >
                    {conv.otherUser?.urlavatar && (
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                        <img
                          src={conv.otherUser.urlavatar}
                          alt={conv.otherUser.fullname || "User"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span>{conv.otherUser?.fullname || "Người dùng"}</span>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForwardDialog(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={confirmForward}
              disabled={selectedConversations.length === 0}
            >
              Chuyển tiếp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chuyển tiếp tin nhắn</DialogTitle>
            <DialogDescription>
              Chọn cuộc trò chuyện để chuyển tiếp tin nhắn này
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {availableConversations.length > 0 ? (
                availableConversations.map((conv) => (
                  <div
                    key={conv.idConversation}
                    className="flex items-center space-x-2 py-2 border-b border-gray-100"
                  >
                    <Checkbox
                      id={conv.idConversation}
                      checked={selectedConversations.includes(
                        conv.idConversation
                      )}
                      onCheckedChange={() =>
                        toggleConversationSelection(conv.idConversation)
                      }
                    />
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={
                          conv.isGroup
                            ? conv.groupAvatar ||
                            "https://danhgiaxe.edu.vn/upload/2024/12/99-mau-avatar-nhom-dep-nhat-danh-cho-team-dong-nguoi-30.webp"
                            : conv.otherUser?.urlavatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              conv.otherUser?.fullname || "User"
                            )}`
                        }
                        alt={
                          conv.isGroup
                            ? conv.groupName || "Group"
                            : conv.otherUser?.fullname || "User"
                        }
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <Label
                      htmlFor={conv.idConversation}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">
                        {conv.isGroup
                          ? conv.groupName
                          : conv.otherUser?.fullname || "Người dùng"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {conv.isGroup
                          ? `${conv.groupMembers?.length || 0} thành viên`
                          : "Chat trực tiếp"}
                      </div>
                    </Label>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Không có cuộc trò chuyện nào khác
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForwardDialog(false);
                setForwardingMessage(null);
                setSelectedConversations([]);
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={confirmForward}
              disabled={selectedConversations.length === 0}
            >
              Chuyển tiếp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
