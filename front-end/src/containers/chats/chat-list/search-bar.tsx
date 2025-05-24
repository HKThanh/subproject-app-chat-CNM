"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, UserIcon, UsersIcon, X } from "lucide-react"
import { getAuthToken } from "@/utils/auth-utils"
import UserAddIcon from "@/assets/common/icon-user-add"
import { useSocketContext } from "@/socket/SocketContext"
import { toast } from "sonner"
import { Dialog } from "@/components/ui/dialog"
import ProfileModal from "@/components/user/profile-modal"
import useUserStore from "@/stores/useUserStoree"

interface SearchBarProps {
  onSelectConversation: (id: string) => void
}

interface SearchResult {
  id: string
  fullname: string
  email: string
  urlavatar: string
  bio: string
  birthday: string
  phone: string
  coverPhoto: string
  ismale: boolean
  isFriend: boolean
}

export default function SearchBar({ onSelectConversation }: SearchBarProps) {
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchMode, setSearchMode] = useState<"users" | "groups">("users")
  const { socket } = useSocketContext()
  const searchRef = useRef<HTMLDivElement>(null)
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "requested" | "friends">("none")
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null)
  const END_POINT_URL = process.env.NEXT_PUBLIC_API_URL || "localhost:3000"
  const token = useUserStore((state) => state.accessToken);
  const [actionLoading, setActionLoading] = useState<"add" | "cancel" | "remove" | "accept" | "chat" | "decline" | null>(null);
  // Lắng nghe sự kiện click bên ngoài để đóng kết quả tìm kiếm
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Lắng nghe các sự kiện socket liên quan đến friend request
  useEffect(() => {
    if (!socket) return

    // Lắng nghe khi yêu cầu kết bạn được chấp nhận
    socket.on("friendRequestAccepted", (data) => {
      toast.success("Yêu cầu kết bạn đã được chấp nhận", {
        description: "Các bạn đã trở thành bạn bè",
      })
    })

    // Lắng nghe khi yêu cầu kết bạn bị từ chối
    socket.on("friendRequestDeclined", (data) => {
      toast.error("Yêu cầu kết bạn đã bị từ chối")
    })

    return () => {
      socket.off("friendRequestAccepted")
      socket.off("friendRequestDeclined")
    }
  }, [socket])

  // Thêm debounce để tránh gọi API quá nhiều lần
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchText.trim()) {
        performSearch(searchText)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchText])

  const checkFriendStatus = async (userId: string) => {
    try {
      // 1. Kiểm tra danh sách bạn bè
      const friendsResponse = await fetch(
        `${END_POINT_URL}/user/friend/get-friends`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const friendsData = await friendsResponse.json();
      console.log("danh sách bạn bè: ", friendsData)
      if (friendsData.message === 'Lấy danh sách bạn bè thành công') {
        // Kiểm tra xem userId có trong danh sách bạn bè không
        const isFriend = friendsData.data.some((friend: any) => friend.id === userId);
        console.log("isFriend: ", isFriend)
        console.log("userId: ", userId)

        if (isFriend) {
          setFriendStatus("friends");
          setFriendRequestId(null);
          return;
        }
      }

      // 2. Kiểm tra lời mời đã gửi
      const sentResponse = await fetch(
        `${END_POINT_URL}/user/get-sended-friend-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const sentData = await sentResponse.json();
      console.log("danh sách lời mời đã gửi: ", sentData)
      if (sentData.success) {
        const pendingRequest = sentData.data.find(
          (req: any) => req.receiver?.id === userId && req.status === "PENDING"
        );

        if (pendingRequest) {
          setFriendStatus("pending");
          setFriendRequestId(pendingRequest.id);
          return;
        }
      }

      // 3. Kiểm tra lời mời đã nhận
      const receivedResponse = await fetch(
        `${END_POINT_URL}/user/get-received-friend-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const receivedData = await receivedResponse.json();
      console.log("danh sách lời mời đã nhận: ", receivedData)
      if (receivedData.success) {
        const requestedRequest = receivedData.data.find(
          (req: any) => req.sender?.id === userId && req.status === "PENDING"
        );

        if (requestedRequest) {
          setFriendStatus("requested");
          setFriendRequestId(requestedRequest.id);
          return;
        }
      }

      // Nếu không thuộc trường hợp nào ở trên
      setFriendStatus("none");
      setFriendRequestId(null);

    } catch (error) {
      console.error("Lỗi khi kiểm tra trạng thái bạn bè:", error);
      setFriendStatus("none");
      setFriendRequestId(null);
    }
  };

  const performSearch = async (value: string) => {
    if (!value.trim()) {
      setSearchResults([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${END_POINT_URL}/user/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: value }),
      })

      const data = await response.json()
      console.log("data khi tìm kiến: ", data)
      if (data.code === 1) {
        // Lấy danh sách bạn bè để kiểm tra
        const friendsResponse = await fetch(
          `${END_POINT_URL}/user/friend/get-friends`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const friendsData = await friendsResponse.json();
        const friendIds = friendsData.message === 'Lấy danh sách bạn bè thành công'
          ? friendsData.data.map((friend: any) => friend.id)
          : [];
        ;
        console.log("friendIds: ", friendIds)
        // Đánh dấu người dùng đã là bạn bè
        const resultsWithFriendStatus = data.data.map((user: SearchResult) => ({
          ...user,
          isFriend: friendIds.includes(user.id)
        }));

        setSearchResults(resultsWithFriendStatus);
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("Lỗi tìm kiếm:", error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async (userId: string, userData: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation() // Ngăn chặn sự kiện click lan tỏa
    // Nếu đang loading, không cho thực hiện thêm
    if (actionLoading) return;

    // Set trạng thái loading
    setActionLoading("add");
    try {
      const token = await getAuthToken()

      // Kiểm tra danh sách lời mời đã nhận trước
      const receivedResponse = await fetch(`${END_POINT_URL}/user/get-received-friend-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const receivedData = await receivedResponse.json()

      if (receivedData.success) {
        // Kiểm tra xem người này đã gửi lời mời cho mình chưa
        const receivedRequest = receivedData.data.find(
          (req: any) => req.sender?.id === userId && req.status === "PENDING",
        )

        if (receivedRequest) {
          toast.info("Người này đã gửi lời mời kết bạn cho bạn rồi")
          return
        }
      }

      // Kiểm tra danh sách yêu cầu đã gửi
      const sentResponse = await fetch(`${END_POINT_URL}/user/get-sended-friend-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const sentData = await sentResponse.json()

      if (sentData.success) {
        const existingRequest = sentData.data.find(
          (req: any) => req.receiver?.id === userId && req.status === "PENDING",
        )

        if (existingRequest) {
          toast.info("Yêu cầu đã được gửi trước đó")
          return
        }
      }

      // Gửi yêu cầu kết bạn
      const response = await fetch(`${END_POINT_URL}/user/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: userId }),
      })

      const data = await response.json()
      console.log("data khi gửi yêu cầu kết bạn: ", data)
      if (data.code === 1) {
        const newRequest = {
          id: data.data.requestId,
          receiver: {
            id: userId,
            fullname: userData.fullname,
            urlavatar: userData.urlavatar,
          },
          createdAt: new Date().toISOString(),
        }

        socket?.emit("send_friend_request", {
          senderId: JSON.parse(sessionStorage.getItem("user-session") || "{}")?.state?.user?.id,
          receiverId: userId,
        })

        const updateEvent = new CustomEvent("updateSentRequests", {
          detail: newRequest,
        })
        window.dispatchEvent(updateEvent)

        const sentResponse = await fetch(`${END_POINT_URL}/user/get-sended-friend-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const sentData = await sentResponse.json()
        if (sentData.success) {
          const refreshEvent = new CustomEvent("refreshSentRequests", {
            detail: sentData.data,
          })
          window.dispatchEvent(refreshEvent)
        }
        setFriendStatus("pending")
        setFriendRequestId(data.data.requestId)
        toast.success("Đã gửi lời mời kết bạn")
      } else if (data.code === 0) {
        toast.info("Yêu cầu đã được gửi trước đó")
      } else if (data.code === 2 || data.code === 3) {
        toast.info("Hai bạn đã là bạn bè")
      } else if (data.code === -2) {
        toast.error("Không thể gửi lời mời kết bạn cho chính mình")
      }
    } catch (error) {
      console.error("Lỗi khi gửi lời mời kết bạn:", error)
      toast.error("Không thể gửi lời mời kết bạn")
    } finally {
      // Reset trạng thái loading
      setActionLoading(null);
    }
  }

  const handleSelectUser = async (user: SearchResult) => {
    console.log("Thông tin người được chọn: ", user.id)
    // Lưu thông tin người dùng được chọn
    setSelectedUser(user);
    // Kiểm tra trạng thái bạn bè
    await checkFriendStatus(user.id);
    // Hiển thị profile modal
    setShowUserProfile(true);
    // Ẩn kết quả tìm kiếm
    setShowResults(false);
  };
  // Hàm thu hồi lời mời kết bạn
  const handleCancelRequest = async (requestId: string) => {
    try {
      // Nếu đang loading, không cho thực hiện thêm
      if (actionLoading) return;

      // Set trạng thái loading
      setActionLoading("cancel");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/cancel/${requestId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        // Emit socket event để thông báo cho người nhận
        socket?.emit("friendRequestCancelled", {
          requestId,
          receiverId: data.data.receiverId,
        });

        toast.success("Đã thu hồi lời mời kết bạn");
        setFriendStatus("none");
        setFriendRequestId(null);
      } else {
        toast.error(data.message || "Không thể thu hồi lời mời");
      }
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast.error("Không thể thu hồi lời mời kết bạn");
    } finally {
      // Reset trạng thái loading
      setActionLoading(null);
    }
  };
  // Hàm xử lý từ chối lời mời kết bạn
  const handleDeclineRequest = async (requestId: string) => {
    try {
      // Nếu đang loading, không cho thực hiện thêm
      if (actionLoading) return;

      // Set trạng thái loading
      setActionLoading("decline");

      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/handle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: requestId,
            type: "DECLINED",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Cập nhật trạng thái UI
        setFriendStatus("none");
        setFriendRequestId(null);

        // Thông báo thành công
        toast.success("Đã từ chối lời mời kết bạn");

        // Emit socket event để thông báo cho người gửi
        socket?.emit("friendRequestDeclined", {
          success: true,
          data: {
            requestId: requestId,
            senderId: selectedUser?.id,
            receiverId: data.data.receiverId,
          },
        });
      } else if (data.code === 0) {
        toast.error("Không tìm thấy yêu cầu kết bạn");
      } else if (data.code === -2) {
        toast.error("Loại yêu cầu không hợp lệ");
      } else {
        toast.error(data.message || "Không thể xử lý yêu cầu");
      }
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast.error("Không thể từ chối lời mời kết bạn");
    } finally {
      // Reset trạng thái loading
      setActionLoading(null);
    }
  };
  // Hàm xử lý hủy kết bạn
  const handleRemoveFriend = async (friendId: string) => {
    try {
      // Nếu đang loading, không cho thực hiện thêm
      if (actionLoading) return;

      // Set trạng thái loading
      setActionLoading("remove");
      const token = await getAuthToken();
      const userId = JSON.parse(sessionStorage.getItem("user-session") || "{}")
        ?.state?.user?.id;

      // Gửi yêu cầu xóa bạn đến server
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/friend/unfriend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ friendId }),
        }
      );

      const result = await response.json();

      if (result.code === 1) {
        toast.success("Đã xóa bạn thành công");
        setFriendStatus("none");

        // Đảm bảo socket emit sự kiện unfriend
        if (socket && socket.connected) {
          socket.emit("unfriend", {
            senderId: userId,
            receiverId: friendId,
            message: "Bạn đã bị xóa khỏi danh sách bạn bè",
          });
        }
      } else {
        toast.error(result.message || "Không thể xóa bạn");
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Đã xảy ra lỗi khi xóa bạn");
    } finally {
      // Reset trạng thái loading
      setActionLoading(null);
    }
  };
  // Thêm hàm để bắt đầu cuộc trò chuyện từ profile
  const startConversation = (userId: string) => {
    // Nếu đang loading, không cho thực hiện thêm
    if (actionLoading) return;

    // Set trạng thái loading
    setActionLoading("chat");
    if (!socket) {
      console.error("Socket chưa được khởi tạo")
      return
    }

    // Lấy thông tin người dùng từ sessionStorage
    const userSession = sessionStorage.getItem("user-session")
    const currentUserId = userSession ? JSON.parse(userSession).state.user.id : null

    if (!currentUserId) {
      console.error("Không tìm thấy ID người dùng trong session storage")
      return
    }

    // Emit sự kiện tạo conversation
    socket.emit("create_conversation", {
      IDSender: currentUserId,
      IDReceiver: userId,
    })

    // Lắng nghe phản hồi từ server
    socket.once("create_conversation_response", (response) => {
      if (response.success) {
        // Gọi hàm onSelectConversation với idConversation từ backend
        onSelectConversation(response.conversation.idConversation)
        setShowUserProfile(false)
        setSearchText("")
      } else {
        toast.info("Bạn chưa kết bạn với người này!")
      }
      setActionLoading(null);
    })
  }

  const handleClearSearch = () => {
    setSearchText("")
    setSearchResults([])
  }

  return (
    <div className="relative flex-1" ref={searchRef}>
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 flex items-center rounded-lg px-3 py-2 transition-all ${searchText ? "border border-[#0866FF]" : "bg-[#F3F3F5]"
            }`}
        >
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onFocus={() => setShowResults(true)}
            className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-gray-400 ml-2"
            placeholder="Tìm kiếm"
          />
          {searchText && (
            <button onClick={handleClearSearch} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          {/* <div className="flex items-center gap-2 ml-2">
            <button
              className={`p-1 rounded-full ${searchMode === "users" ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}
              onClick={() => setSearchMode("users")}
              title="Tìm người dùng"
            >
              <UserIcon className="w-4 h-4" />
            </button>
            <button
              className={`p-1 rounded-full ${searchMode === "groups" ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:bg-gray-100"}`}
              onClick={() => setSearchMode("groups")}
              title="Tìm nhóm"
            >
              <UsersIcon className="w-4 h-4" />
            </button>
          </div> */}
        </div>
      </div>

      {/* Kết quả tìm kiếm */}
      {showResults && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg mt-2 rounded-md z-50">
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                  Đang tìm kiếm...
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <ul>
                {searchResults.map((result) => (
                  <li
                    key={result.id}
                    className="flex items-center p-3 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleSelectUser(result)}
                  >
                    <img
                      src={result.urlavatar || "https://via.placeholder.com/40"}
                      alt={result.fullname}
                      className="w-10 h-10 rounded-full mr-3 object-cover border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.fullname}</div>
                      <div className="text-sm text-gray-500 truncate">{result.email}</div>
                    </div>
                    {/* Kiểm tra trạng thái bạn bè trước khi hiển thị nút */}
                    {!result.isFriend && (
                      <button
                        onClick={(e) => handleAddFriend(result.id, result, e)}
                        className={`ml-2 flex items-center gap-1 px-3 py-1.5 rounded-md transition-all ${actionLoading === "add"
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                          }`}
                        title="Thêm bạn"
                        disabled={actionLoading === "add"}
                      >
                        {actionLoading === "add" ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-1"></div>
                        ) : (
                          <UserAddIcon width={16} height={16} />
                        )}
                        <span className="text-xs font-medium">Thêm bạn</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : searchText ? (
              <div className="p-4 text-center text-gray-500">Không tìm thấy kết quả</div>
            ) : null}
          </div>

          {/* Nút đóng ở dưới */}
          <div className="p-2 border-t">
            <button
              className="w-full py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
              onClick={() => {
                setShowResults(false)
                setSearchText("")
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      {/* Dialog để hiển thị ProfileModal */}
      <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
        {selectedUser && (
          <ProfileModal
            userId={selectedUser.id}
            userData={{
              fullname: selectedUser.fullname,
              bio: selectedUser.bio,
              gender: selectedUser.ismale ? "Nam" : "Nữ", // Giá trị mặc định, có thể cần điều chỉnh
              birthDay: selectedUser.birthday?.split('-')[2] || "",
              birthMonth: selectedUser.birthday?.split('-')[1] || "",
              birthYear: selectedUser.birthday?.split('-')[0] || "",
              phone: selectedUser.phone?.toString() || "",
              avatarUrl: selectedUser.urlavatar,
              coverUrl: selectedUser.coverPhoto,
              email: selectedUser.email,
              id: selectedUser.id
            }}
            friendStatus={friendStatus}
            friendRequestId={friendRequestId || undefined}
            onStartChat={friendStatus === "friends" ? () => startConversation(selectedUser.id) : undefined}
            onAddFriend={(userId) => handleAddFriend(userId, selectedUser, new MouseEvent('click') as any)}
            onCancelRequest={handleCancelRequest}
            onRemoveFriend={handleRemoveFriend}
            onDeclineRequest={handleDeclineRequest}
          />
        )}
      </Dialog>
    </div>
  )
}
