"use client";

import { Phone, Video, Search, Info } from "lucide-react";
import Image from "next/image";
import { Conversation } from "@/socket/useChat";

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
        <Image
          src={conversation.otherUser?.urlavatar || `https://ui-avatars.com/api/?name=${conversation.otherUser?.fullname || "User"}`}
          alt={conversation.otherUser?.fullname || "User"}
          width={40}
          height={40}
          className="rounded-full"
        />

        <div className="ml-3">
          <h2 className="text-base font-medium text-gray-900">
            {conversation.otherUser?.fullname || "Người dùng"}
          </h2>
          <div className="flex items-center">
            {conversation.otherUser?.isOnline ? (
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
              <span className="text-xs text-gray-500">Trực tuyến</span>
            </div>
            ):(
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
          className={`p-2 rounded-full ${
            showChatInfo ? "bg-gray-200" : "hover:bg-gray-200"
          }`}
          onClick={onToggleInfo}
        >
          <Info className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
