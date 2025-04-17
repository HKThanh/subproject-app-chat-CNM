"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { getAuthToken } from "@/utils/auth-utils";
import UserAddIcon from "@/assets/common/icon-user-add";
import { useSocketContext } from "@/socket/SocketContext";

interface SearchBarProps {
  onSelectConversation: (id: string) => void;
}

interface SearchResult {
  id: string;
  fullname: string;
  email: string;
  urlavatar: string;
}

export default function SearchBar({ onSelectConversation }: SearchBarProps) {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocketContext();

  const END_POINT_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";

  const handleSearch = async (value: string) => {
    setSearchText(value);
    setLoading(true);

    try {
      const token = await getAuthToken();
      const response = await fetch(`${END_POINT_URL}/user/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: value }),
      });

      const data = await response.json();
      if (data.code === 1) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = (id: string) => {
    // Logic for adding friend (you can call an API or update state here)
    console.log(`Add friend with id: ${id}`);
  };

  const handleSelectUser = (userId: string) => {
    if (!socket) {
      console.error("Socket is not initialized");
      return;
    }

    // Lấy thông tin người dùng từ sessionStorage
    const userSession = sessionStorage.getItem("user-session");
    const currentUserId = userSession
      ? JSON.parse(userSession).state.user.id
      : null;

    if (!currentUserId) {
      console.error("User ID not found in session storage");
      return;
    }

    // Emit sự kiện tạo conversation
    socket.emit("create_conversation", {
      IDSender: currentUserId,
      IDReceiver: userId,
    });

    // Lắng nghe phản hồi từ server
    socket.once("create_conversation_response", (response) => {
      if (response.success) {
        // Gọi hàm onSelectConversation với idConversation từ backend
        onSelectConversation(response.conversation.idConversation);
        setShowResults(false);
        setSearchText("");
      } else {
        console.error("Failed to create conversation:", response.message);
      }
    });
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="w-full py-2 pl-10 pr-4 bg-gray-100 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300"
          placeholder="Tìm kiếm"
        />
      </div>

      {/* Search Results Overlay */}
      {showResults && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg mt-2 rounded-md z-50">
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Đang tìm kiếm...
              </div>
            ) : searchResults.length > 0 ? (
              <ul>
                {searchResults.map((result) => (
                  <li
                    key={result.id}
                    className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectUser(result.id)}
                  >
                    <img
                      src={result.urlavatar || "https://via.placeholder.com/40"}
                      alt={result.fullname}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="font-medium">{result.fullname}</div>
                      <div className="text-sm text-gray-500">
                        {result.email}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent the li click event
                        handleAddFriend(result.id);
                      }}
                      className="ml-auto text-blue-500 text-sm hover:text-blue-700"
                    >
                      <UserAddIcon width={20} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchText ? (
              <div className="p-4 text-center text-gray-500">
                Không tìm thấy kết quả
              </div>
            ) : null}
          </div>

          {/* Close button at bottom */}
          <div className="p-2 border-t">
            <button
              className="w-full py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              onClick={() => {
                setShowResults(false);
                setSearchText("");
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Backdrop for closing results */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
