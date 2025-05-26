"use client";

import { useEffect, useState } from "react";
import ContactSidebar from "./components/contact-sidebar";
import FriendRequests from "./components/friend-requests";

import { Users, UsersRound, UserPlus, Shield } from "lucide-react";
import ContactList from "./contact-list";
import BlockedList from "./components/blocked-list";
import useUserStore from "@/stores/useUserStoree";

export default function ContactsView() {
  const NEXT_PUBLIC_API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const [searchQuery, setSearchQuery] = useState("");
  type SectionKey = keyof typeof sectionConfig;
  const [activeSection, setActiveSection] = useState<SectionKey>("friends");
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const token = useUserStore((state) => state.accessToken);
  // Fetch friend request count
  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/get-received-friend-requests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (data.success) {
          setFriendRequestCount(data.data.length || 0);
        }
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      }
    };

    fetchFriendRequests();

    // Set up interval to refresh friend requests every minute
    const interval = setInterval(fetchFriendRequests, 60000);

    return () => clearInterval(interval);
  }, []);
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
      badge: friendRequestCount > 0 ? friendRequestCount : null,
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
    <div className="flex max-h-screen">
      <ContactSidebar
        activeSection={activeSection}
        setActiveSection={(section: string) =>
          setActiveSection(section as SectionKey)
        }
        friendRequestCount={friendRequestCount}
      />

      <div className="flex-1">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-5 h-5" />
            <h1 className="text-base font-medium">
              {sectionConfig[activeSection]?.title}
            </h1>
            {activeSection === "requests" && friendRequestCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                {friendRequestCount}
              </span>
            )}
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
