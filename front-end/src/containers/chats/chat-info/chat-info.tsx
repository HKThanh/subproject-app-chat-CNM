import {
  Bell,
  Pin,
  Users,
  Clock,
  Link,
  ChevronDown,
  Clock3,
  Eye,
  AlertTriangle,
  Trash2,
  Pencil,
  UserPlus,
  LogOut,
  Settings,
  X,
  Search,
} from "lucide-react";
import Image from "next/image";
import { Conversation } from "@/socket/useChat";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAuthToken } from "@/utils/auth-utils";
import { useSocketContext } from "@/socket/SocketContext";
import useUserStore from "@/stores/useUserStoree";

interface ChatInfoProps {
  activeConversation: Conversation | null;
}

export default function ChatInfo({ activeConversation }: ChatInfoProps) {
  const [showMembers, setShowMembers] = useState(true);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [friends, setFriends] = useState<
    Array<{ id: string; fullname: string; urlavatar?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const { socket } = useSocketContext();
  const currentUser = useUserStore((state) => state.user);

  // Determine if this is a group conversation
  const isGroup = activeConversation?.isGroup === true;

  // Get group members if this is a group
  const groupMembers = activeConversation?.regularMembers || [];

  // Check if current user is owner or co-owner
  const isOwnerOrCoOwner =
    activeConversation?.rules?.IDOwner === currentUser?.id ||
    activeConversation?.rules?.listIDCoOwner?.includes(currentUser?.id || "");

  // Fetch friends when modal opens
  useEffect(() => {
    if (isAddMemberModalOpen && currentUser) {
      const fetchFriends = async () => {
        try {
          const token = await getAuthToken();

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/user/friend/get-friends`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await response.json();

          if (data.code === 0) {
            // Filter out friends who are already in the group
            const existingMemberIds = groupMembers.map((member) => member.id);
            const filteredFriends = data.data.filter(
              (friend: any) => !existingMemberIds.includes(friend.id)
            );

            setFriends(filteredFriends);
          } else {
            toast.error("Không thể tải danh sách bạn bè");
          }
        } catch (err) {
          console.error(err);
          toast.error("Không thể tải danh sách bạn bè");
        }
      };

      fetchFriends();
    }
  }, [isAddMemberModalOpen, currentUser, groupMembers]);

  // Handle add member response from server
  useEffect(() => {
    if (!socket) return;

    const handleNewGroupConversation = (data: any) => {
      // Check if this is a response to our add member action
      console.log("check new group conversation", data);
      
      if (
        isLoading &&
        data.success &&
        data.conversation?.idConversation === activeConversation?.idConversation
      ) {
        setIsLoading(false);
        setIsAddMemberModalOpen(false);
        setSearchQuery("");
        setSelectedUsers([]);
        toast.success("Thêm thành viên thành công");
      }
    };

    socket.on("message_from_server", handleNewGroupConversation);

    return () => {
      socket.off("message_from_server", handleNewGroupConversation);
    };
  }, [socket, isLoading, activeConversation]);
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isLoading) {
      timeoutId = setTimeout(() => {
        setIsLoading(false);
        toast.error(
          "Thêm thành viên không nhận được phản hồi, vui lòng thử lại sau"
        );
      }, 10000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);
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

  const handleAddMembers = () => {
    if (!socket || !currentUser || !activeConversation) {
      toast.error("Không thể kết nối đến máy chủ");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setIsLoading(true);

    socket.emit("add_member_to_group", {
      IDConversation: activeConversation.idConversation,
      IDUser: currentUser.id,
      newGroupMembers: selectedUsers,
    });

    // Add a timeout to handle cases where the server doesn't respond
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        toast.error(
          "Thêm thành viên không nhận được phản hồi, vui lòng thử lại sau"
        );
      }
    }, 10000);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 text-center">
        <h2 className="text-lg font-medium">
          Thông tin {isGroup ? "nhóm" : "hội thoại"}
        </h2>
      </div>

      {/* Profile */}
      <div className="p-4 flex flex-col items-center border-b border-gray-200">
        <div className="relative mb-2">
          <div className="w-20 h-20 rounded-full overflow-hidden">
            {isGroup ? (
              <Image
                src={
                  activeConversation?.groupAvatar ||
                  "https://danhgiaxe.edu.vn/upload/2024/12/99-mau-avatar-nhom-dep-nhat-danh-cho-team-dong-nguoi-30.webp"
                }
                alt={activeConversation?.groupName || "Group"}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <Image
                src={
                  activeConversation?.otherUser?.urlavatar ||
                  `https://ui-avatars.com/api/?name=${
                    activeConversation?.otherUser?.fullname || "User"
                  }`
                }
                alt={activeConversation?.otherUser?.fullname || "User"}
                width={80}
                height={80}
                className="object-cover"
              />
            )}
          </div>
          <button className="absolute bottom-0 right-0 bg-gray-200 p-1 rounded-full">
            <Pencil className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <h3 className="text-lg font-medium mb-4">
          {isGroup
            ? activeConversation?.groupName || "Nhóm"
            : activeConversation?.otherUser?.fullname || "Người dùng"}
        </h3>

        {/* Action buttons */}
        <div className="flex justify-between w-full">
          <div className="flex flex-col items-center">
            <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
              <Bell className="w-5 h-5 text-blue-900" />
            </button>
            <span className="text-xs text-center">Tắt thông báo</span>
          </div>
          <div className="flex flex-col items-center">
            <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
              <Pin className="w-5 h-5 text-blue-900" />
            </button>
            <span className="text-xs text-center">Ghim hội thoại</span>
          </div>
          {isGroup ? (
            <div className="flex flex-col items-center">
              <button
                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1"
                onClick={() =>
                  isOwnerOrCoOwner && setIsAddMemberModalOpen(true)
                }
                disabled={!isOwnerOrCoOwner}
                title={
                  !isOwnerOrCoOwner
                    ? "Chỉ chủ nhóm hoặc phó nhóm mới có quyền thêm thành viên"
                    : ""
                }
              >
                <UserPlus
                  className={`w-5 h-5 ${
                    isOwnerOrCoOwner ? "text-blue-900" : "text-gray-400"
                  }`}
                />
              </button>
              <span
                className={`text-xs text-center ${
                  !isOwnerOrCoOwner ? "text-gray-400" : ""
                }`}
              >
                Thêm thành viên
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-blue-900" />
              </button>
              <span className="text-xs text-center">Tạo nhóm</span>
            </div>
          )}
        </div>
      </div>

      {/* Group Members (only for groups) */}
      {isGroup && (
        <div className="border-b border-gray-200">
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowMembers(!showMembers)}
          >
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-900 mr-2" />
              <span className="font-medium">
                Thành viên nhóm ({groupMembers.length})
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${
                showMembers ? "rotate-180" : ""
              }`}
            />
          </div>

          {showMembers && (
            <div className="px-4 pb-4 space-y-3">
              {/* Group Owner */}
              {activeConversation?.rules?.IDOwner && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <Image
                        src={
                          activeConversation.owner?.urlavatar ||
                          "https://ui-avatars.com/api/?name=Owner"
                        }
                        alt="Group Owner"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Chủ nhóm</p>
                      <p className="text-xs text-gray-500">
                        {activeConversation.owner.fullname}
                      </p>
                    </div>
                  </div>
                  <Settings className="w-5 h-5 text-gray-500" />
                </div>
              )}

              {/* Group Members (excluding owner) */}
              {groupMembers
                .filter(
                  (member) => member.id !== activeConversation?.rules?.IDOwner
                )
                .map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                        <Image
                          src={
                            member.urlavatar ||
                            "https://nodebucketcnm203.s3.ap-southeast-1.amazonaws.com/avtdefault.avif"
                          }
                          alt={member.fullname}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.fullname}</p>
                        <p className="text-xs text-gray-500">Thành viên</p>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Add Member Button */}
              {isOwnerOrCoOwner && (
                <button
                  className="w-full py-2 mt-2 text-blue-600 text-sm font-medium flex items-center justify-center border border-blue-600 rounded-md"
                  onClick={() => setIsAddMemberModalOpen(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Thêm thành viên
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rest of the component */}
      {/* ... */}

      {/* Add Member Modal */}
      <Dialog
        open={isAddMemberModalOpen}
        onOpenChange={setIsAddMemberModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Thêm thành viên vào nhóm</DialogTitle>

          <div className="mt-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Tìm kiếm bạn bè..."
                className="pl-8 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedUsers.map((userId) => {
                  const friend = friends.find((f) => f.id === userId);
                  return (
                    <div
                      key={userId}
                      className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1"
                    >
                      <span className="text-xs mr-1">{friend?.fullname}</span>
                      <button
                        onClick={() => toggleUserSelection(userId)}
                        className="text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto">
              {filteredFriends.length > 0 ? (
                filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center p-2 rounded-md cursor-pointer ${
                      selectedUsers.includes(friend.id)
                        ? "bg-blue-50"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => toggleUserSelection(friend.id)}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <Image
                        src={
                          friend.urlavatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            friend.fullname
                          )}`
                        }
                        alt={friend.fullname}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{friend.fullname}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border ${
                        selectedUsers.includes(friend.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedUsers.includes(friend.id) && (
                        <span className="flex items-center justify-center text-white text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  {searchQuery
                    ? "Không tìm thấy bạn bè phù hợp"
                    : "Không có bạn bè nào để thêm vào nhóm"}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddMemberModalOpen(false);
                setSearchQuery("");
                setSelectedUsers([]);
              }}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedUsers.length === 0 || isLoading}
            >
              {isLoading ? "Đang thêm..." : "Thêm thành viên"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
