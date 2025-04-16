"use client";

import { useState } from "react";
import ContactSidebar from "./components/contact-sidebar";
import FriendRequests from "./components/friend-requests";

import { Users, UsersRound, UserPlus } from "lucide-react";
import ContactList from "./contact-list";

export default function ContactsView() {
  const [searchQuery, setSearchQuery] = useState("");
  type SectionKey = keyof typeof sectionConfig;
  const [activeSection, setActiveSection] = useState<SectionKey>("friends");

  // Định nghĩa cấu hình cho từng section
  const sectionConfig = {
    friends: {
      icon: Users,
      title: "Danh sách bạn bè",
    },
    groups: {
      icon: UsersRound,
      title: "Danh sách nhóm và cộng đồng",
    },
    requests: {
      icon: UserPlus,
      title: "Lời mời kết bạn",
    },
    "group-invites": {
      icon: UsersRound,
      title: "Lời mời vào nhóm và cộng đồng",
    },
  };

  const ActiveIcon = sectionConfig[activeSection]?.icon || Users;

  return (
    <div className="flex h-full">
      <ContactSidebar
        activeSection={activeSection}
        setActiveSection={(section: string) =>
          setActiveSection(section as SectionKey)
        }
      />

      <div className="flex-1">
        {/* Header với icon và title */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-5 h-5" />
            <h1 className="text-base font-medium">
              {sectionConfig[activeSection]?.title}
            </h1>
          </div>
          {/* Search bar giống như bên chat */}
          <div className="mt-4">
            {/* <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Tìm kiếm"
                className="w-full px-4 py-2 bg-gray-200 rounded-full text-sm focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-3 flex items-center gap-2">
                <button className="p-1 hover:bg-gray-300 rounded-full">
                  <Users className="w-5 h-5 text-gray-500" />
                </button>
                <button className="p-1 hover:bg-gray-300 rounded-full">
                  <UsersRound className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div> */}
          </div>
        </div>

        {/* Phần content giữ nguyên */}
        {activeSection === "requests" ? (
          <FriendRequests />
        ) : activeSection === "friends" ? (
          <div className="flex-1">
            <div className="p-4 bg-gray-50">
              <div className="bg-white rounded-lg shadow-sm">
                <ContactList
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            Chức năng đang được phát triển
          </div>
        )}
      </div>
    </div>
  );
}
