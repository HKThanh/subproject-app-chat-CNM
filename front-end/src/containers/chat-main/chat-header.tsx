"use client";

import { Phone, Video, Search, Info } from "lucide-react";
import Avatar from "@/assets/images/user-avatar.png";
import Image from "next/image";

interface ChatHeaderProps {
  onToggleInfo: () => void;
  showChatInfo: boolean;
}

export default function ChatHeader({
  onToggleInfo,
  showChatInfo,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
      <div className="flex items-center">
        <Image src={Avatar} alt="avatar" width={20} height={20} />
        <div className="ml-3">
          <h2 className="text-base font-medium text-gray-200">Tấn Lộc</h2>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-gray-600"></div>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button className="p-2 rounded-full hover:bg-gray-800">
          <Phone className="w-5 h-5 text-gray-300" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-800">
          <Video className="w-5 h-5 text-gray-300" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-800">
          <Search className="w-5 h-5 text-gray-300" />
        </button>
        <button
          className={`p-2 rounded-full ${
            showChatInfo ? "bg-gray-700" : "hover:bg-gray-800"
          }`}
          onClick={onToggleInfo}
        >
          <Info className="w-5 h-5 text-gray-300" />
        </button>
      </div>
    </div>
  );
}
