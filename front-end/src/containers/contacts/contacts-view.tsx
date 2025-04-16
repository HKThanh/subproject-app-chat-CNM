"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import ContactList from "./contact-list";
import SearchBar from "@/containers/chat-list/search-bar";

export default function ContactsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("friends");

  const handleSelectConversation = (id: string) => {
    console.log("Selected conversation:", id);
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar - Contact categories */}
      <div className="w-[240px] border-r border-gray-200 bg-white">
        <div className="p-4">
          <SearchBar onSelectConversation={handleSelectConversation} />
        </div>
        <div className="space-y-1">
          <button
            className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
              activeSection === "friends"
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setActiveSection("friends")}
          >
            <Users className="w-5 h-5" />
            <span>Danh sách bạn bè</span>
          </button>
          <button
            className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
              activeSection === "groups"
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setActiveSection("groups")}
          >
            <Users className="w-5 h-5" />
            <span>Danh sách nhóm và cộng đồng</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {/* Dynamic header based on active section */}
        <div className="p-4 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h1 className="text-base font-medium">
              {activeSection === "friends"
                ? "Danh sách bạn bè"
                : "Danh sách nhóm và cộng đồng"}
            </h1>
          </div>
        </div>

        <div className="p-4 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm">
            {/* Contact list header */}
            <div className="p-4 border-b">
              <h2 className="font-medium">Bạn bè (379)</h2>
            </div>

            {/* Search and filters */}
            <div className="p-4 flex items-center gap-4">
              {/* Search input */}
              <div className="flex-1">
                <div className="relative flex items-center">
                  <svg
                    className="w-4 h-4 text-gray-400 absolute -left-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm bạn"
                    className="w-full px-4 py-2 border rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m-4 4v8m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                  <select className="border-none bg-transparent pr-8 py-2 text-sm focus:ring-0">
                    <option>Tên (A-Z)</option>
                    <option>Tên (Z-A)</option>
                  </select>
                </div>

                {/* Filter dropdown */}
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <select className="border-none bg-transparent pr-8 py-2 text-sm focus:ring-0">
                    <option>Tất cả</option>
                    <option>Trực tuyến</option>
                    <option>Ngoại tuyến</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact list */}
            {activeSection === "friends" && (
              <ContactList searchQuery={searchQuery} />
            )}
            {activeSection === "groups" && (
              <div className="p-4 text-center text-gray-500">
                Chức năng đang được phát triển
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
