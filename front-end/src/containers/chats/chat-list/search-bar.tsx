"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { getAuthToken } from "@/utils/auth-utils";
import UserAddIcon from "@/assets/common/icon-user-add";
import { useSocketContext } from "@/socket/SocketContext";
import { UserIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BlockedAvatar } from "@/components/ui/blocked-avatar";

interface SearchBarProps {
  onSelectConversation: (id: string) => void;
}

interface SearchResult {
  id: string;
  fullname: string;
  email: string;
  urlavatar: string;
  isFriend?: boolean; // Thêm trường để xác định trạng thái kết bạn
  isBlocked?: boolean; // Thêm trường để xác định trạng thái chặn
}

export default function SearchBar({ onSelectConversation }: SearchBarProps) {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocketContext();
  const router = useRouter();

  const END_POINT_URL = process.env.NEXT_PUBLIC_API_URL || "localhost:3000";

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
    if (!value.trim()) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

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
        // Lấy danh sách bạn bè để kiểm tra
        const friendsResponse = await fetch(
          `${END_POINT_URL}/user/friend/get-friends`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const friendsData = await friendsResponse.json();

        const friendIds =
          friendsData.code === 0
            ? friendsData.data.map((friend: any) => friend.id)
            : [];

        // Lấy danh sách người dùng bị chặn
        const blockedResponse = await fetch(
          `${END_POINT_URL}/user/blocked/get-blocked`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const blockedData = await blockedResponse.json();
        const blockedIds = blockedData.success
          ? blockedData.data.map((user: any) => user.id)
          : [];

        // Đánh dấu người dùng đã là bạn bè và bị chặn
        const resultsWithStatus = data.data.map((user: SearchResult) => ({
          ...user,
          isFriend: friendIds.includes(user.id),
          isBlocked: blockedIds.includes(user.id),
        }));

        setSearchResults(resultsWithStatus);
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

      // Kiểm tra danh sách lời mời đã nhận trước
      const receivedResponse = await fetch(
        `${END_POINT_URL}/user/get-received-friend-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const receivedData = await receivedResponse.json();

      if (receivedData.success) {
        // Kiểm tra xem người này đã gửi lời mời cho mình chưa
        const receivedRequest = receivedData.data.find(
          (req: any) => req.sender?.id === userId && req.status === "PENDING"
        );

        if (receivedRequest) {
          toast.info("Người này đã gửi lời mời kết bạn cho bạn rồi");
          return;
        }
      }

      // Kiểm tra danh sách yêu cầu đã gửi
      const sentResponse = await fetch(
        `${END_POINT_URL}/user/get-sended-friend-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const sentData = await sentResponse.json();

      if (sentData.success) {
        const existingRequest = sentData.data.find(
          (req: any) => req.receiver?.id === userId && req.status === "PENDING"
        );

        if (existingRequest) {
          toast.info("Yêu cầu đã được gửi trước đó");
          return;
        }
      }

      const response = await fetch(`${END_POINT_URL}/user/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: userId }),
      });

      const data = await response.json();

      if (data.code === 1) {
        const newRequest = {
          id: data.data.requestId,
          receiver: {
            id: userId,
            fullname: userData.fullname,
            urlavatar: userData.urlavatar,
          },
          createdAt: new Date().toISOString(),
        };

        socket?.emit("send_friend_request", {
          senderId: JSON.parse(sessionStorage.getItem("user-session") || "{}")
            ?.state?.user?.id,
          receiverId: userId,
        });

        const updateEvent = new CustomEvent("updateSentRequests", {
          detail: newRequest,
        });
        window.dispatchEvent(updateEvent);

        const sentResponse = await fetch(
          `${END_POINT_URL}/user/get-sended-friend-requests`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const sentData = await sentResponse.json();
        if (sentData.success) {
          const refreshEvent = new CustomEvent("refreshSentRequests", {
            detail: sentData.data,
          });
          window.dispatchEvent(refreshEvent);
        }

        toast.success("Đã gửi lời mời kết bạn");
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

    // Hiển thị trạng thái đang tải
    toast.loading("Đang mở cuộc trò chuyện...");

    // Emit sự kiện tạo conversation
    socket.emit("create_conversation", {
      IDSender: currentUserId,
      IDReceiver: userId,
    });

    // Lắng nghe phản hồi từ server
    socket.once("create_conversation_response", (response) => {
      toast.dismiss(); // Đóng toast loading

      if (response.success) {
        console.log(
          "Nhận được phản hồi tạo cuộc trò chuyện:",
          response.conversation
        );

        // Đóng kết quả tìm kiếm và xóa nội dung tìm kiếm
        setShowResults(false);
        setSearchText("");

        // Lưu ID cuộc trò chuyện vào localStorage để có thể truy cập sau khi chuyển trang
        localStorage.setItem(
          "selectedConversationId",
          response.conversation.idConversation
        );

        // Chuyển hướng đến trang chat
        router.push("/chat");
      } else {
        toast.error(response.message || "Không thể tạo cuộc trò chuyện");
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
                    onClick={() =>
                      result.isFriend ? handleSelectUser(result.id) : null
                    }
                  >
                    <div className="relative mr-3">
                      <img
                        src={
                          result.urlavatar || "https://via.placeholder.com/40"
                        }
                        alt={result.fullname}
                        className="w-10 h-10 rounded-full"
                      />
                      {/* Status indicator: blocked icon */}
                      {result.isBlocked && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-red-500 flex items-center justify-center">
                          <span className="text-white text-[8px]">🚫</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{result.fullname}</div>
                      <div className="text-sm text-gray-500">
                        {result.email}
                      </div>
                    </div>
                    {!result.isFriend && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFriend(result.id, result);
                        }}
                        className="ml-auto text-blue-500 text-sm hover:text-blue-700"
                      >
                        <UserAddIcon width={20} />
                      </button>
                    )}
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
