"use client";

import { Phone, Video, Search, Info } from "lucide-react";
import Image from "next/image";
import Avatar from "@/assets/images/user-avatar.png";

interface ChatHeaderProps {
  onToggleInfo: () => void;
  showChatInfo: boolean;
}

export default function ChatHeader({
  onToggleInfo,
  showChatInfo,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center">
        <Image src={Avatar} alt="avatar" width={20} height={20} />

        <div className="ml-3">
          <h2 className="text-base font-medium text-gray-900">Tấn Lộc</h2>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
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
