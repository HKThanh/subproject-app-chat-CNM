"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { getAuthToken } from "@/utils/auth-utils";
import UserAddIcon from "@/assets/common/icon-user-add";
import { useSocketContext } from "@/socket/SocketContext";
import { UserIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

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

  // Thêm useEffect để lắng nghe các sự kiện socket liên quan đến friend request
  useEffect(() => {
    if (!socket) return;

    // Lắng nghe khi yêu cầu kết bạn được chấp nhận
    socket.on("friendRequestAccepted", (data) => {
      toast.success("Yêu cầu kết bạn đã được chấp nhận", {
        description: "Các bạn đã trở thành bạn bè",
      });
    });

    // Lắng nghe khi yêu cầu kết bạn bị từ chối
    socket.on("friendRequestDeclined", (data) => {
      toast.error("Yêu cầu kết bạn đã bị từ chối");
    });

    return () => {
      socket.off("friendRequestAccepted");
      socket.off("friendRequestDeclined");
    };
  }, [socket]);

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

  const handleAddFriend = async (userId: string, userData: SearchResult) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ receiverId: userId }),
        }
      );

      const data = await response.json();

      if (data.code === 1) {
        // Emit event để cập nhật UI của người nhận
        socket?.emit("send_friend_request", {
          senderId: JSON.parse(sessionStorage.getItem("user-session") || "{}")
            ?.state?.user?.id,
          receiverId: userId,
        });

        // Tạo một event tùy chỉnh để cập nhật danh sách "Lời mời đã gửi"
        const customEvent = new CustomEvent("newSentFriendRequest", {
          detail: {
            id: data.data.requestId, // ID từ response của server
            receiver: {
              id: userId,
              fullname: userData.fullname,
              urlavatar: userData.urlavatar,
            },
            createdAt: new Date().toISOString(),
          },
        });
        window.dispatchEvent(customEvent);

        toast.success("Lời mời kết bạn đã được gửi");
        setShowResults(false); // Đóng dropdown search results
      } else if (data.code === 0) {
        toast.info("Yêu cầu đã được gửi trước đó");
      } else if (data.code === 2 || data.code === 3) {
        toast.info("Hai bạn đã là bạn bè");
      } else if (data.code === -2) {
        toast.error("Không thể gửi lời mời kết bạn cho chính mình");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Không thể gửi lời mời kết bạn");
    }
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
    <div className="relative flex-1">
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 flex items-center rounded-lg px-3 py-2 ${
            searchText ? "border border-[#0866FF]" : "bg-[#F3F3F5]"
          }`}
        >
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowResults(true)}
            className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-gray-400 ml-2"
            placeholder="Tìm kiếm"
          />
          <div className="flex items-center gap-2">
            <button className="p-1">
              <UserIcon className="w-4 h-4 text-gray-500" />
            </button>
            <button className="p-1">
              <UsersIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
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
                        handleAddFriend(result.id, result);
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
