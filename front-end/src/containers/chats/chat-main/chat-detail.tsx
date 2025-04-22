import ChatHeader from "./chat-header";
import ChatInput from "./chat-input";
import ChatMessage from "./chat-message";
import { Conversation, Message } from "@/socket/useChat";
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

interface ChatDetailProps {
  onToggleInfo: () => void;
  showChatInfo: boolean;
  activeConversation: Conversation | null;
  messages: Message[];
  onSendMessage: (text: string, type?: string, fileUrl?: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onRecallMessage?: (messageId: string) => void;
  onForwardMessage?: (messageId: string, targetConversations: string[]) => void;
  conversations: Conversation[];
  loading: boolean;
}

export default function ChatDetail({
  onToggleInfo,
  showChatInfo,
  activeConversation,
  messages: chatMessages,
  onSendMessage,
  onDeleteMessage,
  onRecallMessage,
  onForwardMessage,
  conversations,
  loading,
}: ChatDetailProps) {
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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (showForwardDialog) {
      const filteredConversations = conversations.filter(
        (conv) => conv.idConversation !== activeConversation?.idConversation
      );
      setAvailableConversations(filteredConversations);
    }
  }, [showForwardDialog, conversations, activeConversation]);

  const handleReply = (messageId: string, content: string, type: string) => {
    setReplyingTo({
      name: activeConversation?.otherUser?.fullname || "Người dùng",
      messageId,
      content,
      type,
    });
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

  const cancelReply = () => {
    setReplyingTo(null);
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
  // Update the header section of the ChatDetail component to show group information
  // Find the section that renders the conversation header and update it:

  // Inside the ChatDetail component's return statement, update the header section:
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
                  `https://ui-avatars.com/api/?name=${
                    activeConversation?.otherUser?.fullname || "User"
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
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Phone className="w-5 h-5 text-blue-600" />
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
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-8">
        {chatMessages.length > 0 ? (
          <>
            <div className="space-y-4">
              {[...chatMessages]
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
      <ChatInput
        onSendMessage={onSendMessage}
        replyingTo={replyingTo}
        onCancelReply={cancelReply}
      />

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
