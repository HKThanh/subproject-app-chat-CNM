import ChatHeader from "./chat-header";
import ChatInput from "./chat-input";
import ChatMessage from "./chat-message";
import { Conversation, Message } from "@/socket/useChat";
import { Loader2 } from "lucide-react";
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
  loading
}: ChatDetailProps) {
  // Tham chiếu đến container tin nhắn để tự động cuộn xuống
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocketContext();
  
  // State for reply functionality
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    content: string;
    type: string;
  } | null>(null);
  
  // State for forward functionality
  const [forwardingMessage, setForwardingMessage] = useState<string | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [availableConversations, setAvailableConversations] = useState<Conversation[]>([]);
  
  // State for delete confirmation
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Tự động cuộn xuống khi có tin nhắn mới
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);
  
  // handle 
  useEffect(() => {
    if (showForwardDialog) {
      // Filter out current conversation from available conversations
      const filteredConversations = conversations.filter(
        conv => conv.idConversation !== activeConversation?.idConversation
      );
      setAvailableConversations(filteredConversations);
    }
  }, [showForwardDialog, conversations, activeConversation]);

  // Handle reply to message
  const handleReply = (messageId: string, content: string, type: string) => {
    setReplyingTo({
      messageId,
      content,
      type
    });
    // Focus on input field would be handled in ChatInput component
  };
  
  // Handle forward message
  const handleForward = (messageId: string) => {
    setForwardingMessage(messageId);
    setShowForwardDialog(true);
    setSelectedConversations([]);
  };
  
  // Handle delete message
  const handleDelete = (messageId: string) => {
    setDeletingMessage(messageId);
    setShowDeleteDialog(true);
  };
  
  // Confirm forward message
  const confirmForward = () => {
    if (forwardingMessage && selectedConversations.length > 0 && onForwardMessage) {
      onForwardMessage(forwardingMessage, selectedConversations);
      setShowForwardDialog(false);
      setForwardingMessage(null);
      setSelectedConversations([]);
    }
  };
  
  // Confirm delete message
  const confirmDelete = () => {
    if (deletingMessage && onDeleteMessage) {
      onDeleteMessage(deletingMessage);
      setShowDeleteDialog(false);
      setDeletingMessage(null);
    }
  };
  
  // Toggle conversation selection for forwarding
  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversations(prev => 
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };
  
  // Cancel reply
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

  return (
    <div className="flex flex-col h-full bg-gray-200">
      <ChatHeader
        onToggleInfo={onToggleInfo}
        showChatInfo={showChatInfo}
        conversation={activeConversation}
      />
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-8">
        {chatMessages.length > 0 ? (
          <>
          <div className="space-y-6 ">
            {/* Sắp xếp tin nhắn từ cũ đến mới (theo thời gian tăng dần) */}
            {[...chatMessages]
              .sort((a, b) => {
                const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
                const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
                return dateA - dateB;
              })
              .map((msg, index) => {
                // Chỉ hiển thị tin nhắn có nội dung
                if (!msg.content || msg.content.trim() === "") {
                  return null;
                }

                // Xác định URL file nếu có
                let fileUrl;
                let displayMessage = msg.content;
                
                if (msg.type !== "text" && msg.content.includes("http")) {
                  // Tìm URL trong nội dung tin nhắn
                  const urlMatch = msg.content.match(/(https?:\/\/[^\s]+)/g);
                  fileUrl = urlMatch ? urlMatch[0] : undefined;
                  
                  // Nếu là hình ảnh hoặc file, loại bỏ URL khỏi nội dung hiển thị
                  if (fileUrl) {
                    // Thay thế URL bằng chuỗi rỗng và cắt khoảng trắng thừa
                    displayMessage = msg.content.replace(fileUrl, '').trim();
                    
                    // Nếu chỉ còn lại URL (không có nội dung khác)
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

                return (
                  <ChatMessage
                    key={msg.idMessage || index}
                    messageId={msg.idMessage}
                    message={displayMessage}
                    isRemove={msg.isRemove || false}
                    isRecall= {msg.isRecall || false} 
                    timestamp={msg.dateTime ? new Date(msg.dateTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    isOwn={Boolean(msg.isOwn)}
                    type={msg.type}
                    fileUrl={fileUrl}
                    onReply={handleReply}
                    onForward={handleForward}
                    onRecallMessage={onRecallMessage}
                    onDelete={handleDelete}
                  />
                );
              }).filter(Boolean)}
            {/* Thêm phần tử trống để cuộn xuống */}
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
      
      {/* Forward Dialog */}
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
              {availableConversations.map(conv => (
                <div key={conv.idConversation} className="flex items-center space-x-2">
                  <Checkbox 
                    id={conv.idConversation} 
                    checked={selectedConversations.includes(conv.idConversation)}
                    onCheckedChange={() => toggleConversationSelection(conv.idConversation)}
                  />
                  <Label htmlFor={conv.idConversation} className="flex items-center">
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[325px]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base">Xóa tin nhắn?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 mt-2">
            <Button              type="button"
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              className="h-8"
            >
              Hủy
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={confirmDelete}
              className="h-8"
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
