import { MessageSquare, Phone, ImageIcon } from "lucide-react";
import Avatar from "@/assets/images/user-avatar.png";
import Image from "next/image";

const messages = [
  {
    id: 1,
    name: "nhóm 5_CNM",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "Vũ Hải Nam: còn nhiều lắm tôi push lên...",
    time: "9 phút",
    hasAttachment: true,
    attachmentType: "edit",
    unread: false,
  },
  {
    id: 2,
    name: "Spx Hoàn",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "Bạn: ",
    time: "9 phút",
    hasAttachment: true,
    attachmentType: "image",
    unread: false,
  },
  {
    id: 3,
    name: "Tấn Lộc",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "import { colors } from '@/src/constan...",
    time: "31 phút",
    unread: false,
  },
  {
    id: 4,
    name: "MCB TOEIC T9-T10-T11",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "Nguyễn Tài: hình như có bạn rớt",
    time: "2 giờ",
    isGroup: true,
    memberCount: "99+",
    badge: "5",
    unread: false,
  },
  {
    id: 5,
    name: "Trần Đặng Minh Quang",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "Hôm nay (09/04) là sinh nhật c...",
    time: "8 giờ",
    hasAttachment: true,
    attachmentType: "audio",
    unread: true,
  },
  {
    id: 6,
    name: "Hữu Ngộ",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "Hôm nay (09/04) là sinh nhật c...",
    time: "8 giờ",
    hasAttachment: true,
    attachmentType: "audio",
    unread: true,
  },
  {
    id: 7,
    name: "Đinh Nguyên Chung",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "Ch",
    time: "Hôm qua",
    unreadCount: 1,
  },
  {
    id: 8,
    name: "19h20 246 MCB GIẢI ĐỀ...",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "Ngọc Hân: 👋 Thông báo nghỉ lễ...",
    time: "3 ngày",
    isGroup: true,
    memberCount: "31",
    badge: "5+",
    unread: false,
  },
  {
    id: 9,
    name: "Cô Ba",
    avatar: "/placeholder.svg?height=40&width=40",
    message: "Cuộc gọi thoại đến",
    time: "",
    hasAttachment: true,
    attachmentType: "call",
    unreadCount: 1,
  },
];

export default function MessageList() {
  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className="flex items-center px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800"
        >
          <div className="relative">
            <Image src={Avatar} alt="avatar" width={20} height={20} />
            {message.isGroup && (
              <div className="absolute -bottom-1 -right-1 bg-gray-700 text-xs text-white rounded-full px-1 border border-gray-900">
                {message.memberCount}
              </div>
            )}
          </div>

          <div className="ml-3 flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-200 truncate">
                {message.name}
              </h3>
              <div className="flex items-center">
                <span className="text-xs text-gray-400 ml-1">
                  {message.time}
                </span>
                {message.unread && (
                  <div className="w-2 h-2 rounded-full bg-red-500 ml-2"></div>
                )}
                {message.unreadCount && (
                  <div className="w-5 h-5 rounded-full bg-red-500 ml-2 flex items-center justify-center text-xs">
                    {message.unreadCount}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-400 truncate">
              {message.hasAttachment && message.attachmentType === "edit" && (
                <MessageSquare className="w-4 h-4 mr-1 text-gray-500" />
              )}
              {message.hasAttachment && message.attachmentType === "image" && (
                <ImageIcon className="w-4 h-4 mr-1 text-gray-500" />
              )}
              {message.hasAttachment && message.attachmentType === "audio" && (
                <MessageSquare className="w-4 h-4 mr-1 text-gray-500" />
              )}
              {message.hasAttachment && message.attachmentType === "call" && (
                <Phone className="w-4 h-4 mr-1 text-gray-500" />
              )}
              <span className="truncate">{message.message}</span>
              {message.badge && (
                <span className="ml-2 px-1.5 py-0.5 bg-gray-700 text-xs rounded-full">
                  {message.badge}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
