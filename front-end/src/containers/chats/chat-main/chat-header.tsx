"use client";

import { Phone, Video, Search, Info } from "lucide-react";
import Image from "next/image";
import { Conversation, useChat } from "@/socket/useChat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useUserStore from "@/stores/useUserStoree";
import { useCallContext } from "@/context/CallContext";

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
  const { user } = useUserStore();
  const { startCall } = useCallContext();

  const handleVoiceCall = () => {
    if (!conversation.isGroup && conversation.otherUser?.id) {
      startCall(conversation.otherUser.id, 'audio');
    } else {
      console.log("Cuộc gọi nhóm chưa được hỗ trợ");
    }
  };

  const handleVideoCall = () => {
    if (!conversation.isGroup && conversation.otherUser?.id) {
      startCall(conversation.otherUser.id, 'video');
    } else {
      console.log("Cuộc gọi nhóm chưa được hỗ trợ");
    }
  };
  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-gray-200 bg-gray-50">      <div className="flex items-center">
      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
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
      <div className="flex items-center space-x-1 sm:space-x-3">
      <button 
          className="p-2 rounded-full hover:bg-gray-200"
          onClick={handleVoiceCall}
          disabled={conversation.isGroup || !conversation.otherUser?.isOnline}
          title={conversation.isGroup 
            ? "Cuộc gọi nhóm chưa được hỗ trợ" 
            : !conversation.otherUser?.isOnline 
              ? "Người dùng không trực tuyến" 
              : "Gọi thoại"}
        >
          <Phone className={`w-5 h-5 ${
            (conversation.isGroup || !conversation.otherUser?.isOnline) 
              ? "text-gray-400" 
              : "text-gray-700"
          }`} />
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
