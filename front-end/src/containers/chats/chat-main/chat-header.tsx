"use client";

import { Phone, Video, Search, Info } from "lucide-react";
import Image from "next/image";
import { Conversation } from "@/socket/useChat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatHeaderProps {
  onToggleInfo: () => void;
  showChatInfo: boolean;
  conversation: Conversation;
}

export default function ChatHeader({
  onToggleInfo,
  showChatInfo,
  conversation
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 p-4 ">
      <div className="flex items-center">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={
              conversation.isGroup
                ? conversation.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.groupName || "Group")}`
                : conversation.otherUser?.urlavatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.otherUser?.fullname || "User")}`
            }
            alt={conversation.isGroup ? conversation.groupName || "Group" : conversation.otherUser?.fullname || "User"}
          />
          <AvatarFallback>
            {conversation.isGroup
              ? conversation.groupName?.charAt(0) || "G"
              : conversation.otherUser?.fullname?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h2 className="text-base font-medium text-gray-900">
            {conversation.isGroup
              ? conversation.groupName || "Nhóm chat"
              : conversation.otherUser?.fullname || "Người dùng"}
          </h2>
          <div className="flex items-center">
            {conversation.isGroup ? (
              <span className="text-xs text-gray-500">
                {conversation.groupMembers?.length || 0} thành viên
              </span>
            ) : conversation.otherUser?.isOnline ? (
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                <span className="text-xs text-gray-500">Trực tuyến</span>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-gray-500 mr-1"></div>
                <span className="text-xs text-gray-500">Không trực tuyến</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button className="p-2 rounded-full hover:bg-gray-200">
          <Phone className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <Video className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <Search className="w-5 h-5 text-gray-700" />
        </button>
        <button
          className={`p-2 rounded-full ${showChatInfo ? "bg-gray-200" : "hover:bg-gray-200"
            }`}
          onClick={onToggleInfo}
        >
          <Info className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
