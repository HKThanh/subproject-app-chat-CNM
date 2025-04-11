"use client";

import UserDataLoader from "@/components/auth/user-data-loader";
import ChatInfo from "@/containers/chat-info/chat-info";
import MessageList from "@/containers/chat-list/message-list";
import SearchBar from "@/containers/chat-list/search-bar";
import TabNavigation from "@/containers/chat-list/tab-navigation";
import ChatDetail from "@/containers/chat-main/chat-detail";
import { useState } from "react";

export default function Home() {
  const [showChatInfo, setShowChatInfo] = useState(false);

  return (
    <UserDataLoader>
      <div className="flex h-screen bg-gray-50 text-gray-900">
        <div
          className={`${showChatInfo ? "w-1/4" : "w-1/3"
            } flex flex-col border-r border-gray-200 transition-all duration-300`}
        >
          <div className="p-4">
            <SearchBar />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <TabNavigation />
            <MessageList />
          </div>
        </div>
        <div
          className={`${showChatInfo ? "w-2/4" : "w-2/3"
            } flex flex-col border-r border-gray-200 transition-all duration-300`}
        >
          <ChatDetail
            onToggleInfo={() => setShowChatInfo(!showChatInfo)}
            showChatInfo={showChatInfo}
          />
        </div>
        {showChatInfo && (
          <div className="w-1/4 flex flex-col transition-all duration-300">
            <ChatInfo />
          </div>
        )}
      </div>
    </UserDataLoader>
  );
}
