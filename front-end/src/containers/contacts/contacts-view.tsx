"use client";

import { useState } from "react";
import ContactSidebar from "./components/contact-sidebar";
import FriendRequests from "./components/friend-requests";

import { Users, UsersRound, UserPlus, Shield } from "lucide-react";
import ContactList from "./contact-list";
import BlockedList from "./components/blocked-list";

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
    blocked: {
      icon: Shield,
      title: "Danh sách chặn",
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
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-5 h-5" />
            <h1 className="text-base font-medium">
              {sectionConfig[activeSection]?.title}
            </h1>
          </div>
          <div className="mt-4"></div>
        </div>

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
        ) : activeSection === "blocked" ? (
          <div className="flex-1">
            <div className="p-4 bg-gray-50">
              <div className="bg-white rounded-lg shadow-sm">
                <BlockedList />
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
