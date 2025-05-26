"use client"

import {
  FileText,
  Download,
  ImageIcon,
  Video,
  MessageSquareQuote,
  MessageSquareX,
  RotateCcw,
  MessageSquareShare,
  Smile,
  X,
  Phone,
} from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import ImageViewer from "@/components/chat/image-viewer"
import useUserStore from "@/stores/useUserStoree"

interface ChatMessageProps {
  message: string
  timestamp: string
  isOwn?: boolean
  type?: "text" | "image" | "video" | "document" | "file" | "call"
  isReply?: boolean
  replyInfo?: {
    name: string
    content: string
    type: string
  }
  fileUrl?: string
  messageId?: string
  isRemove: boolean
  isRecall?: boolean
  isGroup?: boolean
  senderName?: string
  senderAvatar?: string
  showSenderInfo?: boolean
  onReply?: (messageId: string, content: string, type: string) => void
  onForward?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onRecallMessage?: (messageId: string) => void
  reactions?: {
    [key: string]: {
      reaction: string
      totalCount: number
      userReactions: Array<{
        user: {
          userId: string
          fullname: string
          urlavatar?: string
        }
        count: number
      }>
    }
  }
  onAddReaction?: (messageId: string, reaction: string) => void
}

interface ReactionDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  reaction: string
  reactionData: {
    reaction: string
    totalCount: number
    userReactions: Array<{
      user: {
        userId: string
        fullname: string
        urlavatar?: string
      }
      count: number
    }>
  } | null
}

// Component Dialog hiển thị chi tiết reaction
function ReactionDetailDialog({ isOpen, onClose, reaction, reactionData }: ReactionDetailDialogProps) {
  if (!reactionData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{reaction}</span>
            <div>
              <div className="text-lg font-semibold">Reactions</div>
              <div className="text-sm text-gray-500">{reactionData.userReactions.length} người đã thả cảm xúc</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-80 pr-4">
          <div className="space-y-3">
            {reactionData.userReactions.map((userReaction) => (
              <div
                key={userReaction.user.userId}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                      <Image
                        src={
                          userReaction.user.urlavatar ||
                          `https://ui-avatars.com/api/?name=${userReaction.user.fullname}`
                        }
                        alt={userReaction.user.fullname}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    {/* Badge hiển thị số lần react nếu > 1 */}
                    {userReaction.count > 1 && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                        {userReaction.count}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-medium text-gray-900">{userReaction.user.fullname}</div>
                    {/* {userReaction.count > 1 && (
                      <div className="text-xs text-gray-500">Đã react {userReaction.count} lần</div>
                    )} */}
                  </div>
                </div>

                {/* Hiển thị emoji với số lượng */}
                <div className="flex items-center gap-1">
                  <span className="text-lg">{reaction}</span>
                  {userReaction.count > 1 && (
                    <span className="text-sm text-gray-600 font-medium">×{userReaction.count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
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
  const [isHovered, setIsHovered] = useState(false)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showReactionDetail, setShowReactionDetail] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState<{
    emoji: string
    data: {
      reaction: string
      totalCount: number
      userReactions: Array<{
        user: {
          userId: string
          fullname: string
          urlavatar?: string
        }
        count: number
      }>
    }
  } | null>(null)

  const reactionPickerRef = useRef<HTMLDivElement>(null)
  const messageRef = useRef<HTMLDivElement>(null)
  const { user } = useUserStore()

  const availableReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"]

  const totalReactions = Object.values(reactions).reduce((sum, reaction) => sum + reaction.totalCount, 0)

  // Xử lý click bên ngoài reaction picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Thêm hàm xử lý reaction
  const handleReactionClick = (reaction: string) => {
    if (onAddReaction && messageId) {
      onAddReaction(messageId, reaction)
      setShowReactionPicker(false)
    }
  }

  // Hàm xử lý khi click vào reaction đã được thả
  const handleReactionDetailClick = (emoji: string, reactionData: any) => {
    setSelectedReaction({ emoji, data: reactionData })
    setShowReactionDetail(true)
  }

  // Hàm render reaction picker với animations
  const renderReactionPicker = () => {
    if (!showReactionPicker) return null

    return (
      <>
        {/* Backdrop overlay */}
        <div
          className="fixed inset-0 z-40"
          style={{
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => setShowReactionPicker(false)}
        />

        {/* Reaction picker container */}
        <div
          ref={reactionPickerRef}
          className="absolute bg-white rounded-2xl shadow-xl border border-gray-200 p-2 flex gap-1 z-50"
          style={{
            // Đối với tin nhắn của mình (bên phải) thì hiển thị bên trái
            // Đối với tin nhắn nhận được (bên trái) thì hiển thị bên trên để tránh tràn màn hình
            ...(isOwn
              ? { right: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" }
              : { left: "0", bottom: "calc(100% + 10px)" }),
            animation: isOwn
              ? "slideInFromRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "slideInFromBottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {availableReactions.map((reaction, index) => (
            <button
              key={reaction}
              onClick={() => handleReactionClick(reaction)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 relative overflow-hidden"
              style={{
                animation: `popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.animation = "none"
                e.currentTarget.style.transform = "scale(1.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)"
              }}
            >
              <span
                className="text-xl block transition-transform duration-200"
                style={{
                  animation: `wiggle 0.6s ease-in-out ${index * 0.1 + 0.3}s both`,
                }}
              >
                {reaction}
              </span>

              {/* Ripple effect on click */}
              <div className="absolute inset-0 rounded-xl opacity-0 bg-blue-200 pointer-events-none transition-opacity duration-200" />
            </button>
          ))}

          {/* Arrow pointer */}
          <div
            className="absolute w-3 h-3 bg-white border transform rotate-45"
            style={{
              ...(isOwn
                ? {
                    left: "100%",
                    top: "50%",
                    marginLeft: "-6px",
                    marginTop: "-6px",
                    borderRight: "1px solid #e5e7eb",
                    borderBottom: "1px solid #e5e7eb",
                    borderLeft: "none",
                    borderTop: "none",
                  }
                : {
                    top: "100%",
                    left: "20px",
                    marginTop: "-6px",
                    borderLeft: "1px solid #e5e7eb",
                    borderTop: "1px solid #e5e7eb",
                    borderRight: "none",
                    borderBottom: "none",
                  }),
              animation: "arrowFadeIn 0.3s ease-out 0.2s both",
            }}
          />
        </div>

        {/* CSS animations */}
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideInFromRight {
            from {
              opacity: 0;
              transform: translateY(-50%) translateX(20px) scale(0.8);
            }
            to {
              opacity: 1;
              transform: translateY(-50%) translateX(0) scale(1);
            }
          }
          
          @keyframes slideInFromBottom {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.8);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          
          @keyframes popIn {
            from {
              opacity: 0;
              transform: scale(0.3) rotate(-10deg);
            }
            50% {
              transform: scale(1.1) rotate(5deg);
            }
            to {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }
          
          @keyframes wiggle {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-5deg) scale(1.05); }
            75% { transform: rotate(5deg) scale(1.05); }
          }
          
          @keyframes arrowFadeIn {
            from {
              opacity: 0;
              transform: rotate(45deg) scale(0.5);
            }
            to {
              opacity: 1;
              transform: rotate(45deg) scale(1);
            }
          }
        `}</style>
      </>
    )
  }

  // Sửa đổi hàm render reactions với animation và click handler
  const renderReactions = () => {
    if (totalReactions === 0) return null

    return (
      <div
        className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
        style={{
          // Thêm animation fade in
          animation: "fadeInUp 0.3s ease-out",
        }}
      >
        {Object.entries(reactions).map(([reaction, data], index) => {
          // Check if current user has reacted with this emoji
          const hasUserReacted = data.userReactions.some((ur) => ur.user.userId === user?.id)
          
          // Tìm số lượng reaction của user hiện tại
          const currentUserReactionCount = hasUserReacted 
            ? data.userReactions.find(ur => ur.user.userId === user?.id)?.count || 0
            : 0

          return (
            data.totalCount > 0 && (
              <div
                key={reaction}
                className={`flex items-center rounded-full shadow-sm px-1.5 py-0.5 border cursor-pointer transition-all duration-300 hover:scale-105 ${
                  hasUserReacted
                    ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                    : "bg-white border-gray-100 hover:bg-gray-50"
                }`}
                onClick={() => handleReactionDetailClick(reaction, data)}
                title={`${data.totalCount} lượt thả cảm xúc này. Click để xem chi tiết.`}
                style={{
                  // Thêm animation stagger cho từng reaction
                  animation: `slideInScale 0.4s ease-out ${index * 0.1}s both`,
                  transformOrigin: isOwn ? "right center" : "left center",
                }}
              >
                <span
                  className="text-sm mr-1 transition-transform duration-200 hover:scale-110"
                  style={{
                    animation: `bounce 0.6s ease-out ${index * 0.1 + 0.2}s both`,
                  }}
                >
                  {reaction}
                </span>
                <span
                  className={`text-xs transition-colors duration-200 ${
                    hasUserReacted ? "text-blue-600 font-semibold" : "text-gray-600"
                  }`}
                >
                  {data.totalCount}
                </span>
                
                {/* Hiển thị số lượng reaction của user hiện tại nếu > 1 */}
                {currentUserReactionCount > 1 && (
                  <span className="text-xs ml-0.5 bg-blue-100 text-blue-700 px-1 rounded-full font-medium">
                    {currentUserReactionCount}
                  </span>
                )}
              </div>
            )
          )
        })}

        {/* Thêm CSS animations inline */}
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideInScale {
            from {
              opacity: 0;
              transform: scale(0.8) translateY(5px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-3px);
            }
            60% {
              transform: translateY(-1px);
            }
          }
        `}</style>
      </div>
    )
  }

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
              <div className="cursor-pointer" onClick={() => setIsImageViewerOpen(true)}>
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
          let fileExtension = ""
          if (fileUrl) {
            try {
              const urlParts = fileUrl.split("/")
              const rawFileName = urlParts[urlParts.length - 1]
              const fileNameParts = rawFileName.split("?")
              fileName = decodeURIComponent(fileNameParts[0])

              // Lấy phần mở rộng của tệp
              const extensionMatch = fileName.match(/\.([^.]+)$/)
              fileExtension = extensionMatch ? extensionMatch[1].toLowerCase() : ""

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

          // Xác định loại tệp để hiển thị preview phù hợp
          const isPDF = fileExtension === "pdf"
          const isTextFile = ["txt", "md", "json", "csv", "html", "css", "js", "ts", "jsx", "tsx"].includes(
            fileExtension,
          )
          const isAudio = ["mp3", "wav", "ogg", "m4a"].includes(fileExtension)

          return (
            <div className="flex flex-col w-full">
              {/* Preview cho các loại tệp khác nhau */}
              {isPDF && fileUrl && (
                <div className="mb-2 border rounded-md overflow-hidden">
                  <iframe src={`${fileUrl}#view=FitH`} className="w-full h-60" title={fileName} />
                </div>
              )}

              {isAudio && fileUrl && (
                <div className="mb-2">
                  <audio controls className="w-full">
                    <source src={fileUrl} type={`audio/${fileExtension}`} />
                    Trình duyệt của bạn không hỗ trợ phát âm thanh.
                  </audio>
                </div>
              )}

              {/* Thông tin tệp */}
              <div className={`flex items-center rounded-md p-2 ${isPDF || isAudio ? "bg-gray-100" : "bg-gray-200"}`}>
                <FileText className={`w-8 h-8 mr-2 text-gray-700`} />
                <div className="flex-1 overflow-hidden">
                  <p className={`text-sm font-medium truncate text-gray-800`}>{fileName}</p>
                  <p className="text-xs text-gray-600">
                    {fileExtension ? `${fileExtension.toUpperCase()} - ` : ""}
                    Đã gửi một tệp đính kèm
                  </p>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`ml-2 p-1 rounded-full bg-blue-200 hover:bg-blue-300`}
                  download
                >
                  <Download className={`w-5 h-5 text-gray-700`} />
                </a>
              </div>
            </div>
          )
          case "call":
        // Determine call type icon and color
        const isVideoCall = message.includes("video");
        const isAccepted = message.includes("chấp nhận") || message.includes("Thời gian:");
        const isMissed = message.includes("không trả lời") || message.includes("bị từ chối");
        
        return (
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isAccepted ? 'bg-green-100' : isMissed ? 'bg-red-100' : 'bg-blue-100'}`}>
              {isVideoCall ? (
                <Video className={`w-5 h-5 ${isAccepted ? 'text-green-600' : isMissed ? 'text-red-600' : 'text-blue-600'}`} />
              ) : (
                <Phone className={`w-5 h-5 ${isAccepted ? 'text-green-600' : isMissed ? 'text-red-600' : 'text-blue-600'}`} />
              )}
            </div>
            <div>
              <div className="font-medium">{isVideoCall ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}</div>
              <div className={`text-sm ${isMissed ? 'text-red-500' : 'text-gray-500'}`}>{message}</div>
            </div>
          </div>
        );
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
                  <MessageSquareQuote className="w-4 h-4 text-gray-600" color="gray" />
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
                      onClick={() => onRecallMessage && onRecallMessage(messageId)}
                      className="p-1.5 rounded-full hover:bg-blue-50 transition-all duration-200 flex items-center justify-center"
                    >
                      <RotateCcw className="w-4 h-4 text-blue-500" color="gray" />
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
                      <MessageSquareX className="w-4 h-4 text-red-500" color="gray" />
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
  const renderReplyPreview = () => {
    if (!isReply || !replyInfo) return null

    return (
      <div
        className={`mb-2 p-2 rounded border-l-4 ${
          isOwn ? "bg-[#7649d9] border-[#6a40c7] text-white/90" : "bg-gray-200 border-gray-300 text-gray-700"
        }`}
      >
        <div className="text-xs font-medium">{replyInfo.name}</div>
        <div className="text-xs truncate">
          {replyInfo.type !== "text" ? (
            <span className="flex items-center">
              {replyInfo.type === "image" ? (
              <ImageIcon className="h-3 w-3 mr-1" />
            ) : replyInfo.type === "video" ? (
              <Video className="h-3 w-3 mr-1" />
            ) : replyInfo.type === "call" ? (
              replyInfo.content.includes("video") ? (
                <Video className="h-3 w-3 mr-1" />
              ) : (
                <Phone className="h-3 w-3 mr-1" />
              )
            ) : (
              <FileText className="h-3 w-3 mr-1" />
            )}
              {replyInfo.type === "image" ? "Hình ảnh" : replyInfo.type === "video" ? "Video" : "Tệp đính kèm"}
            </span>
          ) : (
            replyInfo.content
          )}
        </div>
      </div>
    )
  }
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
                    src={senderAvatar || "/placeholder.svg"}
                    alt={senderName || "User"}
                    width={24}
                    height={24}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-1">
                  <span className="text-xs text-gray-600">{senderName?.charAt(0) || "U"}</span>
                </div>
              )}
              <span className="text-xs font-medium text-gray-700">{senderName}</span>
            </div>
          )}
          {/* Hiển thị reaction picker */}
          {renderReactionPicker()}
          {/* Container cho nội dung tin nhắn */}
          <div
            className={`rounded-lg p-3 ${
              type !== "text"
                ? "bg-transparent"
                : isOwn
                  ? "bg-[#8A56FF] text-white max-w-xs md:max-w-md lg:max-w-lg"
                  : "bg-gray-100 text-gray-800 inline-block"
            }`}
            style={{
              backgroundColor: type !== "text" ? "transparent" : isOwn ? "#8A56FF" : "",
              color: type !== "text" ? (isOwn ? "white" : "black") : isOwn ? "white" : "",
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

      {/* Reaction Detail Dialog */}
      <ReactionDetailDialog
        isOpen={showReactionDetail}
        onClose={() => {
          setShowReactionDetail(false)
          setSelectedReaction(null)
        }}
        reaction={selectedReaction?.emoji || ""}
        reactionData={selectedReaction?.data || null}
      />
    </>
  )
}
