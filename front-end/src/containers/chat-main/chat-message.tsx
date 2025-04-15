"use client"

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
} from "lucide-react"
import { useState } from "react"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface ChatMessageProps {
  message: string
  timestamp: string
  isOwn?: boolean
  type?: "text" | "image" | "video" | "document" | "file"
  fileUrl?: string
  messageId?: string
  isRemove: boolean
  isRecall?: boolean
  onReply?: (messageId: string, content: string, type: string) => void
  onForward?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onRecallMessage?: (messageId: string) => void
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
  onRecallMessage,
}: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false)

  const renderContent = () => {
    if (isRemove && isOwn) {
      return <div className="italic text-gray-500">Tin nhắn đã bị xóa</div>
    } else if (isRecall) {
      return <div className="italic text-gray-500">Tin nhắn đã được thu hồi</div>
    } else {
      switch (type) {
        case "image":
          return (
            <div className="relative">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={fileUrl || "/placeholder.svg"}
                  alt={message}
                  className="rounded-md max-h-60 max-w-full object-contain"
                />
              </a>
              <div className="mt-2 flex items-center">
                <ImageIcon className="w-4 h-4 mr-1" />
                <span className="text-sm">{message}</span>
              </div>
            </div>
          )

        case "video":
          return (
            <div>
              <video src={fileUrl} controls className="rounded-md max-h-60 max-w-full" />
              <div className="mt-2 flex items-center">
                <Video className="w-4 h-4 mr-1" />
                <span className="text-sm">{message}</span>
              </div>
            </div>
          )

        case "document":
        case "file":
          let fileName = "Tài liệu"
          if (fileUrl) {
            try {
              const urlParts = fileUrl.split("/")
              const rawFileName = urlParts[urlParts.length - 1]
              const fileNameParts = rawFileName.split("?")
              fileName = decodeURIComponent(fileNameParts[0])
              if (!fileName || fileName.length > 100) {
                fileName = "Tài liệu đính kèm"
              }
            } catch (e) {
              console.error("Error parsing filename:", e)
              fileName = "Tài liệu đính kèm"
            }
          } else if (message && !message.includes("http")) {
            fileName = message
          }

          return (
            <div className="flex flex-col w-full">
              <div className={`flex items-center rounded-md p-2 bg-gray-200`}>
                <FileText className={`w-8 h-8 mr-2 text-gray-700`} />
                <div className="flex-1 overflow-hidden">
                  <p className={`text-sm font-medium truncate text-gray-800`}>{fileName}</p>
                  <p className="text-xs text-gray-600">Đã gửi một tệp đính kèm</p>
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
          )

        default:
          return <div className="whitespace-pre-wrap break-words">{message}</div>
      }
    }
  }

  const renderActionButtons = () => {
    if (!isHovered || isRecall || (isRemove && isOwn)) return null

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
                  onClick={() => onReply && onReply(messageId, message, type)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-all duration-200 flex items-center justify-center"
                >
                  <MessageSquareQuote className="w-4 h-4 text-gray-600" color="gray"/>
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
                >
                  <MessageSquareShare className="w-4 h-4 text-gray-600" color="gray"/>
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
                      onClick={() => onRecallMessage && onRecallMessage(messageId)}
                      className="p-1.5 rounded-full hover:bg-blue-50 transition-all duration-200 flex items-center justify-center"
                    >
                      <RotateCcw className="w-4 h-4 text-blue-500" color="gray"/>
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
                      <MessageSquareX className="w-4 h-4 text-red-500" color="gray"/>
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
    )
  }

  return (
    <div
      className={`mb-10 ${isOwn ? "flex justify-end" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative ${isOwn ? "pr-2" : "pl-2"}`}>
        {/* Container cho nội dung tin nhắn */}
        <div
          className={`rounded-lg p-3 ${
            type !== "text"
              ? "bg-transparent"
              : isOwn
                ? "bg-[#4285F4] text-white max-w-xs md:max-w-md lg:max-w-lg"
                : "bg-gray-100 text-gray-800 inline-block"
          }`}
          style={{
            backgroundColor: type !== "text" ? "transparent" : isOwn ? "#4285F4" : "",
            color: type !== "text" ? (isOwn ? "white" : "black") : isOwn ? "white" : "",
            maxWidth: !isOwn ? "80%" : "",
          }}
        >
          {renderContent()}

          {message && message.trim() !== "" && (
            <div className="text-xs mt-1 opacity-70 text-right">
              {timestamp !== "Invalid Date" ? timestamp : "Bây giờ"}
            </div>
          )}
        </div>

        {/* Container cho các nút hành động */}
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
  )
}
