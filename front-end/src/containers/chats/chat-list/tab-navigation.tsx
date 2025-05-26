import { ChevronDown, MoreHorizontal, Search, X, Camera, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import SearchBar from "./search-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useSocketContext } from "@/socket/SocketContext";
import useUserStore from "@/stores/useUserStoree";
import { useChatContext } from "@/socket/ChatContext";
import { toast } from "sonner";
import { getAuthToken } from "@/utils/auth-utils";
import MessageList from "./message-list";
import { useRouter } from "next/navigation";

export default function TabNavigation({
  onSelectConversation,
  activeConversationId,
}: {
  onSelectConversation: (id: string) => void;
  activeConversationId?: string | null;
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Add searchTerm state for filtering conversations
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Add state for active tab
  const [activeTab, setActiveTab] = useState<"DIRECT" | "GROUPS">("DIRECT");

  // Get socket, current user, and chat context
  const { socket } = useSocketContext();
  const currentUser = useUserStore((state) => state.user);
  const { conversations, loading, createGroupConversation } = useChatContext(); // Add createGroupConversation

  // Use a ref for API_URL to keep it stable between renders
  const API_URL = useRef(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  ).current;

  // State for friends list
  const [friends, setFriends] = useState<
    Array<{ id: string; fullname: string; urlavatar?: string }>
  >([]);

  // Memoize the group creation response handler
  const handleGroupCreationResponse = useCallback(
    (data: any) => {
      setIsLoading(false);

      if (data.success) {
        toast.success("Tạo nhóm thành công");
        setIsModalOpen(false);
        setGroupName("");
        setSearchQuery("");
        setSelectedUsers([]);

        // Switch to GROUPS tab after successful group creation
        setActiveTab("GROUPS");

        // Select the newly created conversation
        if (data.conversation && data.conversation.idConversation) {
          onSelectConversation(data.conversation.idConversation);
        }
      } else {
        toast.error(data.message || "Không thể tạo nhóm");
      }
    },
    [onSelectConversation]
  );

  // Fetch friends when modal opens
  useEffect(() => {
    // Only fetch friends when the modal is actually open
    if (isModalOpen && currentUser) {
      const fetchFriends = async () => {
        try {
          // Get token only when needed
          const token = await getAuthToken();

          const response = await fetch(`${API_URL}/user/friend/get-friends`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (data.code === 0) {
            setFriends(data.data);
            console.log("data friends>>>> ", data.data);
          } else {
            toast.error("Không thể tải danh sách bạn bè");
          }
        } catch (err) {
          console.error(err);
          toast.error("Không thể tải danh sách bạn bè");
        }
      };

      fetchFriends();

      // Add listener for group creation response
      socket?.on(
        "create_group_conversation_response",
        handleGroupCreationResponse
      );

      return () => {
        socket?.off(
          "create_group_conversation_response",
          handleGroupCreationResponse
        );
      };
    }
  }, [isModalOpen, currentUser, socket, handleGroupCreationResponse]);

  // Load appropriate conversations when tab changes
  useEffect(() => {
    if (socket && currentUser?.id) {
      if (activeTab === "DIRECT") {
        // console.log("Switching to DIRECT tab, loading direct conversations");
        socket.emit("load_conversations", {
          IDUser: currentUser.id,
          lastEvaluatedKey: 0,
        });
      } else if (activeTab === "GROUPS") {
        // console.log("Switching to GROUPS tab, loading group conversations");
        socket.emit("load_group_conversations", {
          IDUser: currentUser.id,
          lastEvaluatedKey: 0,
        });
      }
    }
  }, [activeTab, socket, currentUser]);

  // Filter friends based on search query
  const filteredFriends = searchQuery
    ? friends.filter((friend) =>
      friend.fullname.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : friends;

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Thêm state cho avatar nhóm
  const [groupAvatar1, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Xử lý khi chọn file avatar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Kiểm tra kích thước file (giới hạn 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước ảnh không được vượt quá 5MB");
        return;
      }

      // Kiểm tra loại file
      if (!file.type.startsWith('image/')) {
        toast.error("Vui lòng chọn file hình ảnh");
        return;
      }

      setGroupAvatar(file);

      // Tạo URL xem trước
      const previewUrl = URL.createObjectURL(file);
      setGroupAvatarPreview(previewUrl);
    }
  };

  // Upload avatar lên server
  const uploadGroupAvatar = async (): Promise<string | null> => {
    if (!groupAvatar1) return null;
    try {
      const formData = new FormData();
      formData.append("avatar-group", groupAvatar1);

      const token = await getAuthToken();

      const response = await fetch(`${apiUrl}/upload/avatar-group`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();

      if (data.success && data.fileUrl) {
        return data.fileUrl;
      } else {
        toast.error("Không thể tải lên ảnh nhóm");
        return null;
      }
    } catch (error) {
      console.error("Lỗi khi tải lên ảnh nhóm:", error);
      toast.error("Lỗi khi tải lên ảnh nhóm");
      return null;
    }
  };
  // Cập nhật useEffect để xóa URL xem trước khi đóng modal
  useEffect(() => {
    if (!isModalOpen) {
      setGroupName("");
      setSearchQuery("");
      setSelectedUsers([]);

      // Xóa URL xem trước để tránh rò rỉ bộ nhớ
      if (groupAvatarPreview) {
        URL.revokeObjectURL(groupAvatarPreview);
        setGroupAvatarPreview(null);
      }
      setGroupAvatar(null);
    }
  }, [isModalOpen]);

  // Xóa URL xem trước khi component unmount
  useEffect(() => {
    return () => {
      if (groupAvatarPreview) {
        URL.revokeObjectURL(groupAvatarPreview);
      }
    };
  }, []);
  const handleCreateGroup = async () => {
    if (!createGroupConversation || !currentUser) {
      toast.error("Không thể kết nối đến máy chủ");
      return;
    }

    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setIsLoading(true);
    console.log("Creating group with members:", selectedUsers);
    
    try {
      // Upload avatar nếu có
      let groupAvatar = null;
      if (groupAvatar1) {
        groupAvatar = await uploadGroupAvatar();
        console.log("groupAvatar>>>> ", groupAvatar);
      }
      // Use the createGroupConversation function from useChat
      createGroupConversation(
        groupName.trim(),
        selectedUsers,
        groupAvatar || undefined
      );
      
      // Thêm timeout để xử lý trường hợp server không phản hồi
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          toast.error("Tạo nhóm không nhận được phản hồi, vui lòng thử lại sau");
        }
      }, 10000);
    } catch (error) {
      console.error("Lỗi khi tạo nhóm:", error);
      toast.error("Không thể tạo nhóm");
      setIsLoading(false);
    }
  }
  const router = useRouter();

  const handleUserClick = (friend: any) => {
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
      IDReceiver: friend.id,
    });

    // Lắng nghe phản hồi từ server
    socket.once("create_conversation_response", (response) => {
      toast.dismiss(); // Đóng toast loading

      if (response.success) {
        // Lưu ID cuộc trò chuyện vào localStorage
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
    <div className="flex flex-col h-full bg-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Tin nhắn</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-chat-primary text-white"
                onClick={() => setIsModalOpen(true)}
              >
                <span className="text-lg font-bold">+</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tạo nhóm</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex space-x-1 px-4 pb-3">
        <button
          className={`px-3 py-1 text-sm font-medium rounded-full ${
            activeTab === "DIRECT"
              ? "text-gray-900 bg-gray-100"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          onClick={() => setActiveTab("DIRECT")}
        >
          Chat đơn
        </button>
        {/* Fixed duplicate button */}
        <button
          className={`px-3 py-1 text-sm font-medium rounded-full ${
            activeTab === "GROUPS"
              ? "text-gray-900 bg-gray-100"
              : "text-gray-500 hover:bg-gray-100"
          }`}
          onClick={() => setActiveTab("GROUPS")}
        >
          Chat nhóm
        </button>
      </div>

      <div className="px-4 pb-3">
        <SearchBar onSelectConversation={onSelectConversation} />
      </div>

      <MessageList
        conversations={conversations || []}
        activeConversationId={activeConversationId || null}
        onSelectConversation={onSelectConversation}
        loading={loading || false}
        activeTab={activeTab}
        searchTerm={searchTerm}
      />

      {/* Create Group Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-lg font-semibold border-b pb-2">
            Tạo nhóm
          </DialogTitle>
          <div className="space-y-4 py-2">
            {/* Thêm phần upload avatar */}
            <div className="flex flex-col items-center mb-2">
              <div
                className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer relative overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {groupAvatarPreview ? (
                  <img
                    src={groupAvatarPreview}
                    alt="Ảnh nhóm"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-gray-500" />
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <span className="text-sm text-gray-500 mt-2">
                {groupAvatarPreview ? "Thay đổi ảnh nhóm" : "Thêm ảnh nhóm"}
              </span>
            </div>

            <div className="flex items-center">
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nhập tên nhóm..."
                className="flex-1"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search-friends"
                placeholder="Nhập tên bạn bè..."
                className="pl-10 py-5 rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Bạn bè</h3>

              {filteredFriends.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchQuery ? "Không tìm thấy bạn bè" : "Không có bạn bè"}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center py-2 cursor-pointer"
                      onClick={() => toggleUserSelection(friend.id)}
                    >
                      <div className="mr-3 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(friend.id)}
                          onChange={() => {}}
                          className="h-5 w-5 rounded-full border-gray-300"
                        />
                      </div>
                      <Avatar className="h-10 w-10 mr-3 rounded-full">
                        {friend.urlavatar ? (
                          <img
                            src={friend.urlavatar}
                            alt={friend.fullname}
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-300 flex items-center justify-center rounded-full">
                            <span className="text-sm font-medium">
                              {friend.fullname.charAt(0)}
                            </span>
                          </div>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{friend.fullname}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isLoading}
              className="rounded-md px-6"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={isLoading || !groupName.trim() || selectedUsers.length === 0}
              className="rounded-md bg-blue-400 hover:bg-blue-500 px-6"
            >
              {isLoading ? (
                <>
                  <span className="mr-2">Đang tạo...</span>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </>
              ) : (
                "Tạo nhóm"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
