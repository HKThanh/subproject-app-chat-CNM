"use client";

import {
  ThumbsUp,
  FileText,
  Download,
  ImageIcon,
  Video,
  Forward,
  MessageSquareQuote,
  MessageSquareX,
  RotateCcw,
  MessageSquareShare,
  Smile,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import Image from "next/image";
import ImageViewer from "@/components/chat/image-viewer";
import useUserStore from "@/stores/useUserStoree";

// Add senderName and isGroup props to the interface
interface ChatMessageProps {
  message: string;
  timestamp: string;
  isOwn?: boolean;
  type?: "text" | "image" | "video" | "document" | "file";
  isReply?: boolean;
  replyInfo?: {
    name: string;
    content: string;
    type: string;
  };
  fileUrl?: string;
  messageId?: string;
  isRemove: boolean;
  isRecall?: boolean;
  isGroup?: boolean;
  senderName?: string;
  senderAvatar?: string; // Add this prop
  showSenderInfo?: boolean;
  onReply?: (messageId: string, content: string, type: string) => void;
  onForward?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onRecallMessage?: (messageId: string) => void;
  //props cho reaction
  reactions?: {
    [key: string]: {
      reaction: string;
      totalCount: number;
      userReactions: Array<{
        user: {
          id: string;
          fullname: string;
          urlavatar?: string;
        };
        count: number;
      }>;
    };
  };
  onAddReaction?: (messageId: string, reaction: string) => void;
}

export default function ChatMessage({
  message,
  timestamp,
  isOwn = false,
  type = "text",
  fileUrl,
  isRemove,
  isRecall,
  messageId = "",
  isReply = false,
  replyInfo,
  isGroup = false,
  senderName = "",
  senderAvatar = "",
  showSenderInfo = false,
  onReply,
  onForward,
  onDelete,
  onRecallMessage,
  reactions = {},
  onAddReaction,
}: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const {user} = useUserStore();
  // Danh sách các reaction có sẵn
  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  // Tổng số reaction
  const totalReactions = Object.values(reactions).reduce(
    (sum, reaction) => sum + reaction.totalCount,
    0
  );
  // Xử lý click bên ngoài reaction picker để đóng
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Thêm hàm xử lý reaction
  const handleReactionClick = (reaction: string) => {
    if (onAddReaction && messageId) {
      onAddReaction(messageId, reaction);
      setShowReactionPicker(false);
    }
  };

  // Thêm hàm render reaction picker
  const renderReactionPicker = () => {
    if (!showReactionPicker) return null;

    return (
      <div
        ref={reactionPickerRef}
        className="absolute bottom-full mb-2 bg-white rounded-full shadow-lg p-1 flex gap-1 z-20"
        style={{
          ...(isOwn ? { right: '0' } : { left: '0' }),
        }}
      >
        {availableReactions.map((reaction) => (
          <button
            key={reaction}
            onClick={() => handleReactionClick(reaction)}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <span className="text-lg">{reaction}</span>
          </button>
        ))}
      </div>
    );
  };

  // Thêm hàm render reactions hiện có
  const renderReactions = () => {
    if (totalReactions === 0) return null;

    return (
      <div
        className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        {Object.entries(reactions).map(([reaction, data]) => {
          // Check if current user has reacted with this emoji
          const hasUserReacted = data.userReactions.some(
            ur => ur.user.id === user?.id
          );

          return data.totalCount > 0 && (
            <div
              key={reaction}
              className={`flex items-center rounded-full shadow-sm px-1.5 py-0.5 border cursor-pointer 
                ${hasUserReacted 
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                  : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              onClick={() => handleReactionClick(reaction)}
              title={data.userReactions
                .map(ur => ur.user.fullname)
                .join(', ')}
            >
              <span className="text-sm mr-1">{reaction}</span>
              <span className={`text-xs ${hasUserReacted ? 'text-blue-600' : 'text-gray-600'}`}>
                {data.totalCount}
              </span>
            </div>
          );
        })}
      </div>
    );
  };
  const renderContent = () => {
    if (isRemove && isOwn) {
      return <div className="italic text-gray-500">Tin nhắn đã bị xóa</div>;
    } else if (isRecall) {
      return (
        <div className="italic text-gray-500">Tin nhắn đã được thu hồi</div>
      );
    } else {
      switch (type) {
        case "image":
          return (
            <div className="relative">
              <div
                className="cursor-pointer"
                onClick={() => setIsImageViewerOpen(true)}
              >
                <img
                  src={fileUrl || "/placeholder.svg"}
                  alt={message}
                  className="rounded-md max-h-40 sm:max-h-60 max-w-full object-contain"
                />
              </div>
              <div className="mt-2 flex items-center">
                <ImageIcon className="w-4 h-4 mr-1 text-gray-800" />
                <span className="text-sm text-gray-800">{message}</span>
              </div>
            </div>
          );

        case "video":
          return (
            <div>
              <video
                src={fileUrl}
                controls
                className="rounded-md max-h-60 max-w-full"
              />
              <div className="mt-2 flex items-center">
                <Video className="w-4 h-4 mr-1" />
                <span className="text-sm">{message}</span>
              </div>
            </div>
          );

        case "document":
        case "file":
          let fileName = "Tài liệu";
          if (fileUrl) {
            try {
              const urlParts = fileUrl.split("/");
              const rawFileName = urlParts[urlParts.length - 1];
              const fileNameParts = rawFileName.split("?");
              fileName = decodeURIComponent(fileNameParts[0]);
              if (!fileName || fileName.length > 100) {
                fileName = "Tài liệu đính kèm";
              }
            } catch (e) {
              console.error("Error parsing filename:", e);
              fileName = "Tài liệu đính kèm";
            }
          } else if (message && !message.includes("http")) {
            fileName = message;
          }

          return (
            <div className="flex flex-col w-full">
              <div className={`flex items-center rounded-md p-2 bg-gray-200`}>
                <FileText className={`w-8 h-8 mr-2 text-gray-700`} />
                <div className="flex-1 overflow-hidden">
                  <p className={`text-sm font-medium truncate text-gray-800`}>
                    {fileName}
                  </p>
                  <p className="text-xs text-gray-600">
                    Đã gửi một tệp đính kèm
                  </p>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`ml-2 p-1 rounded-ful bg-blue-200 hover:bg-blue-300`}
                  download
                >
                  <Download className={`w-5 h-5 text-gray-700`} />
                </a>
              </div>
            </div>
          );

        default:
          return (
            <div className="whitespace-pre-wrap break-words">{message}</div>
          );
      }
    }
  };

  const renderActionButtons = () => {
    if (!isHovered || isRecall || (isRemove && isOwn)) return null;

    return (
      <div
        className="absolute flex gap-2 z-10 animate-fade-in"
        style={{
          bottom: "-28px",
          ...(isOwn ? { right: "0" } : { left: "0" }),
        }}
      >
        <div className="flex p-1 bg-white rounded-full shadow-lg gap-1.5 border border-gray-100">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-all duration-200 flex items-center justify-center"
                >
                  <Smile className="w-4 h-4 text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                <p>Thả cảm xúc</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onReply && onReply(messageId, message, type)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-all duration-200 flex items-center justify-center"
                >
                  <MessageSquareQuote
                    className="w-4 h-4 text-gray-600"
                    color="gray"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                <p>Phản hồi</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onForward && onForward(messageId)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-all duration-200 flex items-center justify-center"
                  aria-label="Chuyển tiếp tin nhắn"
                >
                  <MessageSquareShare className="w-4 h-4 text-gray-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                <p>Chuyển tiếp</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isOwn && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() =>
                        onRecallMessage && onRecallMessage(messageId)
                      }
                      className="p-1.5 rounded-full hover:bg-blue-50 transition-all duration-200 flex items-center justify-center"
                    >
                      <RotateCcw
                        className="w-4 h-4 text-blue-500"
                        color="gray"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-medium">
                    <p>Thu hồi</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onDelete && onDelete(messageId)}
                      className="p-1.5 rounded-full hover:bg-red-50 transition-all duration-200 flex items-center justify-center"
                    >
                      <MessageSquareX
                        className="w-4 h-4 text-red-500"
                        color="gray"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-medium">
                    <p>Xóa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>
    );
  };
  const renderReplyPreview = () => {
    if (!isReply || !replyInfo) return null;

    return (
      <div
        className={`mb-2 p-2 rounded border-l-4 ${isOwn
          ? 'bg-[#7649d9] border-[#6a40c7] text-white/90'
          : 'bg-gray-200 border-gray-300 text-gray-700'
          }`}
      >
        <div className="text-xs font-medium">
          {replyInfo.name}
        </div>
        <div className="text-xs truncate">
          {replyInfo.type !== "text" ? (
            <span className="flex items-center">
              {replyInfo.type === "image" ? (
                <ImageIcon className="h-3 w-3 mr-1" />
              ) : replyInfo.type === "video" ? (
                <Video className="h-3 w-3 mr-1" />
              ) : (
                <FileText className="h-3 w-3 mr-1" />
              )}
              {replyInfo.type === "image" ? "Hình ảnh" :
                replyInfo.type === "video" ? "Video" : "Tệp đính kèm"}
            </span>
          ) : (
            replyInfo.content
          )}
        </div>
      </div>
    );
  };
  return (
    <>
      <div
        className={`mb-10 ${isOwn ? "flex justify-end" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`relative ${isOwn ? "pr-2" : "pl-2"}`}>
          {/* Display sender name for group chats when not own message */}
          {showSenderInfo && (
            <div className="flex items-center mb-1">
              {senderAvatar ? (
                <div className="w-6 h-6 rounded-full overflow-hidden mr-1">
                  <Image
                    src={senderAvatar}
                    alt={senderName || "User"}
                    width={24}
                    height={24}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-1">
                  <span className="text-xs text-gray-600">
                    {senderName?.charAt(0) || "U"}
                  </span>
                </div>
              )}
              <span className="text-xs font-medium text-gray-700">
                {senderName}
              </span>
            </div>
          )}
          {/* Hiển thị reaction picker */}
          {renderReactionPicker()}
          {/* Container cho nội dung tin nhắn */}
          <div
            className={`rounded-lg p-3 ${type !== "text"
              ? "bg-transparent"
              : isOwn
                ? "bg-[#8A56FF] text-white max-w-xs md:max-w-md lg:max-w-lg"
                : "bg-gray-100 text-gray-800 inline-block"
              }`}
            style={{
              backgroundColor:
                type !== "text" ? "transparent" : isOwn ? "#8A56FF" : "",
              color:
                type !== "text"
                  ? isOwn
                    ? "white"
                    : "black"
                  : isOwn
                    ? "white"
                    : "",
              maxWidth: !isOwn ? "80%" : "",
            }}
          >
            {/* Hiển thị thông tin tin nhắn reply */}
            {renderReplyPreview()}
            {renderContent()}

            {message && message.trim() !== "" && (
              <div className="text-xs mt-1 opacity-70 text-right">
                {timestamp !== "Invalid Date" ? timestamp : "Bây giờ"}
              </div>
            )}
          </div>
          {/* Hiển thị reactions */}
          {renderReactions()}
          {/* Container cho các nút hành động */}
          {renderActionButtons()}
        </div>

        {/* {!isOwn && (
        <div className="flex items-center mt-1 ml-2">
          <button className="p-1 rounded-full hover:bg-gray-200">
            <ThumbsUp className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )} */}
      </div>
      {/* Image Viewer */}
      {type === "image" && fileUrl && (
        <ImageViewer
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          images={[{ url: fileUrl, alt: message }]}
          initialIndex={0}
        />
      )}
    </>
  );
}
