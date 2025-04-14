import {
  ThumbsUp,
  FileText,
  Download,
  Image as ImageIcon,
  Video,
  Reply,
  Forward,
  Trash2,
  MoreHorizontal,
  MessageSquareQuote,
  MessageSquareX,
  RotateCcw
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatMessageProps {
  message: string;
  timestamp: string;
  isOwn?: boolean;
  type?: "text" | "image" | "video" | "document" | "file";
  fileUrl?: string;
  messageId?: string;
  isRemove: boolean;
  isRecall?: boolean;
  onReply?: (messageId: string, content: string, type: string) => void;
  onForward?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onRecallMessage?: (messageId: string) => void; // Add this prop
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
  onReply,
  onForward,
  onDelete,
  onRecallMessage
}: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Render content based on message type
  const renderContent = () => {
    if (isRemove && isOwn) {
      return <div className="italic text-gray-500">Tin nhắn đã bị xóa</div>;
    } else if (isRecall) {
      return <div className="italic text-gray-500">Tin nhắn đã được thu hồi</div>;
    } else {
      switch (type) {
        case "image":
          return (
            <div className="relative">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={fileUrl}
                  alt={message}
                  className="rounded-md max-h-60 max-w-full object-contain"
                />
              </a>
              <div className="mt-2 flex items-center">
                <ImageIcon className="w-4 h-4 mr-1" />
                <span className="text-sm">{message}</span>
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
          // Extract filename from URL or use message as filename
          let fileName = "Tài liệu";

          // Try to extract filename from URL
          if (fileUrl) {
            try {
              // First try to get the filename from the URL path
              const urlParts = fileUrl.split("/");
              const rawFileName = urlParts[urlParts.length - 1];

              // Check if there's a query string and remove it
              const fileNameParts = rawFileName.split("?");
              fileName = decodeURIComponent(fileNameParts[0]);

              // If filename contains unusual characters, use a default name
              if (!fileName || fileName.length > 100) {
                fileName = "Tài liệu đính kèm";
              }
            } catch (e) {
              console.error("Error parsing filename:", e);
              fileName = "Tài liệu đính kèm";
            }
          } else if (message && !message.includes("http")) {
            // If no fileUrl but we have a message that's not a URL, use it as filename
            fileName = message;
          }

          return (
            <div className="flex flex-col w-full ">
              <div className={`flex items-center rounded-md p-2  bg-gray-200`}>
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
                  className={`ml-2 p-1 rounded-ful bg-blue-200 hover:bg-blue-300
                  }`}
                  download
                >
                  <Download
                    className={`w-5 h-5 text-gray-700`}
                  />
                </a>
              </div>
            </div>
          );

        default:
          return (
            <div className="whitespace-pre-wrap break-words ">{message}</div>
          );
      }
    }
  };

  // Message action buttons that appear on hover
  const renderActionButtons = () => {
    // Don't show any buttons if not hovered or message is recalled/removed
    if (!isHovered || isRecall || (isRemove && isOwn)) return null;

    return (
      <div
        className={`absolute ${
          isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"
        } top-1/2 -translate-y-1/2 flex gap-1`}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onReply && onReply(messageId, message, type)}
                className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              >
                <MessageSquareQuote className="w-4 h-4 text-gray-600" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Phản hồi</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onForward && onForward(messageId)}
                className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
              >
                <Forward className="w-4 h-4 text-gray-600" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
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
                    onClick={() => onRecallMessage && onRecallMessage(messageId)}
                    className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-blue-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Thu hồi</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDelete && onDelete(messageId)}
                    className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <MessageSquareX className="w-4 h-4 text-red-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Xóa</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={`mb-4 ${isOwn ? "flex justify-end" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`relative rounded-lg p-3 ${
          type !== "text"
            ? "bg-transparent"
            : isOwn
            ? "bg-[#4285F4] text-white max-w-xs md:max-w-md lg:max-w-lg"
            : "bg-gray-100 text-gray-800 inline-block"
        }`}
        style={{
          backgroundColor:
            type !== "text" ? "transparent" : isOwn ? "#4285F4" : "",
          color:
            type !== "text"
              ? isOwn
                ? "white"
                : "black"
              : isOwn
              ? "white"
              : "",
          maxWidth: !isOwn ? "80%" : "", // Giới hạn độ rộng tối đa cho tin nhắn của người nhận
        }}
      >
        {renderContent()}

        {/* Chỉ hiển thị timestamp khi message có giá trị */}
        {message && message.trim() !== "" && (
          <div className="text-xs mt-1 opacity-70 text-right">
            {timestamp !== "Invalid Date" ? timestamp : "Bây giờ"}
          </div>
        )}

        {/* Action buttons */}
        {renderActionButtons()}
      </div>

      {!isOwn && (
        <div className="flex items-center mt-1 ml-2">
          <button className="p-1 rounded-full hover:bg-gray-200">
            <ThumbsUp className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
