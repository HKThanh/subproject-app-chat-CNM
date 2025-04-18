"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { getAuthToken } from "@/utils/auth-utils";
import { toast } from "sonner";

interface Contact {
  id: string;
  fullname: string;
  urlavatar: string;
  email?: string;
  phone?: string;
}

interface ContactGroup {
  letter: string;
  contacts: Contact[];
}

interface ContactListProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function ContactList({
  searchQuery,
  onSearchChange,
}: ContactListProps) {
  const [contacts, setContacts] = useState<ContactGroup[]>([]);
  const [totalFriends, setTotalFriends] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchFriendList = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/friend/get-friends`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await response.json();

      // Kiểm tra response format theo API docs
      if (result.code === 0 && Array.isArray(result.data)) {
        console.log("Friend list response:", result); // Debug log

        const friendList = result.data;
        // Nhóm bạn bè theo chữ cái đầu tiên
        const groupedContacts: { [key: string]: Contact[] } = {};

        friendList.forEach((friend: Contact) => {
          const firstLetter = friend.fullname.charAt(0).toUpperCase();
          if (!groupedContacts[firstLetter]) {
            groupedContacts[firstLetter] = [];
          }
          groupedContacts[firstLetter].push(friend);
        });

        // Chuyển đổi object thành mảng và sắp xếp theo alphabet
        const sortedGroups = Object.entries(groupedContacts)
          .map(([letter, contacts]) => ({
            letter,
            contacts: contacts.sort((a, b) =>
              a.fullname.localeCompare(b.fullname)
            ),
          }))
          .sort((a, b) => a.letter.localeCompare(b.letter));

        setContacts(sortedGroups);
        setTotalFriends(friendList.length);
      } else {
        console.error("Invalid response format:", result);
        toast.error("Không thể tải danh sách bạn bè");
      }
    } catch (error) {
      console.error("Error fetching friend list:", error);
      toast.error("Không thể tải danh sách bạn bè");
    }
  };

  // Thêm useEffect để lắng nghe sự kiện cập nhật danh sách bạn bè
  useEffect(() => {
    fetchFriendList();

    // Lắng nghe sự kiện friendRequestAccepted để cập nhật danh sách
    const handleFriendRequestAccepted = () => {
      fetchFriendList();
    };

    window.addEventListener(
      "friendRequestAccepted",
      handleFriendRequestAccepted
    );

    return () => {
      window.removeEventListener(
        "friendRequestAccepted",
        handleFriendRequestAccepted
      );
    };
  }, []);

  // Lọc danh sách theo searchQuery
  const filteredContacts = contacts
    .map((group) => ({
      ...group,
      contacts: group.contacts.filter((contact) =>
        contact.fullname.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((group) => group.contacts.length > 0);

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header with total friends count */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Bạn bè ({totalFriends})</h2>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-6">
        <div className="flex items-center flex-1">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Tìm kiếm"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => {
              const cursorPosition = e.target.selectionStart;
              onSearchChange(e.target.value);
              setTimeout(() => {
                e.target.setSelectionRange(cursorPosition, cursorPosition);
              }, 0);
            }}
          />

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
                <option>Phân loại</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            {searchQuery ? "Không tìm thấy bạn bè" : "Chưa có bạn bè nào"}
          </div>
        ) : (
          filteredContacts.map((section) => (
            <div key={section.letter} className="mb-6">
              <div className="text-sm font-medium mb-2">{section.letter}</div>
              <div className="space-y-1">
                {section.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between py-2 px-3 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                        {contact.urlavatar ? (
                          <img
                            src={contact.urlavatar}
                            alt={contact.fullname}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            {contact.fullname[0]}
                          </div>
                        )}
                      </div>
                      <div className="font-medium">{contact.fullname}</div>
                    </div>
                    <button className="p-2 hover:bg-gray-200 rounded-full">
                      <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
