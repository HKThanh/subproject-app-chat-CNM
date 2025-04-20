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
  Crown,
  UserCog,
  UserMinus,
  MoreHorizontal,
} from "lucide-react";
import Image from "next/image";
import { Conversation, useChat } from "@/socket/useChat";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAuthToken } from "@/utils/auth-utils";
import { useSocketContext } from "@/socket/SocketContext";
import useUserStore from "@/stores/useUserStoree";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInfoProps {
  activeConversation: Conversation | null;
  removeMembersFromGroup: (conversationId: string, membersToRemove: string[]) => void;
}

export default function ChatInfo({ activeConversation,removeMembersFromGroup }: ChatInfoProps) {
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [friends, setFriends] = useState<
    Array<{ id: string; fullname: string; urlavatar?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    memberId: "",
    action: "" as "remove" | "promote" | "transfer" | ""
  });
  const { socket } = useSocketContext();
  const currentUser = useUserStore((state) => state.user);

  // Determine if this is a group conversation
  const isGroup = activeConversation?.isGroup === true;

  // Get group members if this is a group
  const groupMembers = activeConversation?.regularMembers || [];

  // Check if current user is owner or co-owner
  const isOwner = activeConversation?.rules?.IDOwner === currentUser?.id;
  const isCoOwner = activeConversation?.rules?.listIDCoOwner?.includes(currentUser?.id || "");
  const isOwnerOrCoOwner = isOwner || isCoOwner;

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
            // Get the most up-to-date member IDs from the active conversation
            // This ensures we have the latest member list after removals
            const currentMemberIds = [
              // Include owner
              activeConversation?.rules?.IDOwner,
              // Include co-owners
              ...(activeConversation?.rules?.listIDCoOwner || []),
              // Include regular members who aren't owner or co-owners
              ...(activeConversation?.regularMembers?.map(member => member.id) || [])
            ].filter(Boolean); // Remove any undefined/null values
            
            // Filter out friends who are already in the group
            const filteredFriends = data.data.filter(
              (friend: any) => !currentMemberIds.includes(friend.id)
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

  // Add timeout for loading state
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
  };

  // Member management functions
  const handleRemoveMember = (memberId: string) => {
    if (!activeConversation) return;
    
    // Confirm before removing
      setConfirmationState({
      isOpen: true,
      memberId,
      action: "remove"
    });
  };
  const handleConfirmAction = () => {
    if (!activeConversation || !confirmationState.memberId) return;
    
    if (confirmationState.action === "remove") {
      removeMembersFromGroup(activeConversation.idConversation, [confirmationState.memberId]);
      toast.success("Đang xóa thành viên khỏi nhóm...");
    } else if (confirmationState.action === "promote") {
      handlePromoteToCoOwner(confirmationState.memberId);
    } else if (confirmationState.action === "transfer") {
      handleTransferOwnership(confirmationState.memberId);
    }
    
    // Close the modal
    setConfirmationState({
      isOpen: false,
      memberId: "",
      action: ""
    });
  };
  const handlePromoteToCoOwner = (memberId: string) => {
    if (!socket || !activeConversation) return;
    
    // Open confirmation modal
    setConfirmationState({
      isOpen: true,
      memberId,
      action: "promote"
    });
  };

  const handleTransferOwnership = (memberId: string) => {
    if (!socket || !activeConversation) return;
    
    // Open confirmation modal
    setConfirmationState({
      isOpen: true,
      memberId,
      action: "transfer"
    });
  };

  // Add new state for section collapse
  const [sectionsState, setSectionsState] = useState({
    members: false,
    media: false,
    files: false
  });

  // Toggle section collapse
  const toggleSection = (section: 'members' | 'media' | 'files') => {
    setSectionsState(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // New function to handle leaving group
  const handleLeaveGroup = () => {
    if (!socket || !activeConversation) return;
    
    socket.emit("leave_group", {
      IDConversation: activeConversation.idConversation,
      IDUser: currentUser?.id
    });
    
    toast.success("Đang rời khỏi nhóm...");
  };

  // New function to handle deleting group
  const handleDeleteGroup = () => {
    if (!socket || !activeConversation) return;
    
    socket.emit("delete_group", {
      IDConversation: activeConversation.idConversation,
      IDUser: currentUser?.id
    });
    
    toast.success("Đang xóa nhóm...");
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
          {!isGroup && (
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-blue-900" />
              </button>
              <span className="text-xs text-center">Tạo nhóm</span>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Sections */}
      {isGroup && (
        <>
          {/* Members Section */}
          <div className="border-b border-gray-200">
            <button 
              className="w-full p-4 flex items-center justify-between"
              onClick={() => toggleSection('members')}
            >
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-3 text-gray-600" />
                <span>Thành viên nhóm</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">{activeConversation?.groupMembers?.length} thành viên</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${sectionsState.members ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {sectionsState.members && (
              <div className="px-4 pb-4">
                <button
                  className="w-full py-2 text-blue-600 text-sm font-medium flex items-center justify-center border border-blue-600 rounded-md mb-2"
                  onClick={() => setIsMembersModalOpen(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Xem tất cả thành viên
                </button>
              </div>
            )}
          </div>

          {/* Media Section */}
          <div className="border-b border-gray-200">
            <button 
              className="w-full p-4 flex items-center justify-between"
              onClick={() => toggleSection('media')}
            >
              <div className="flex items-center">
                <Image
                  src="/icons/image-icon.png" 
                  alt="Media"
                  width={20}
                  height={20}
                  className="mr-3"
                />
                <span>Ảnh/Video</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {(activeConversation?.listImage?.length || 0) + (activeConversation?.listVideo?.length || 0)} mục
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${sectionsState.media ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {sectionsState.media && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {/* Display actual images and videos from conversation */}
                  {[
                    ...(activeConversation?.listImage || []).slice(0, 4),
                    ...(activeConversation?.listVideo || []).slice(0, 4)
                  ].slice(0, 8).map((url, index) => (
                    <div key={index} className="aspect-square bg-gray-200 rounded overflow-hidden">
                      <Image
                        src={url}
                        alt="Media item"
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {/* Show placeholder if no media */}
                  {(activeConversation?.listImage?.length === 0 && activeConversation?.listVideo?.length === 0) && (
                    <div className="col-span-4 py-4 text-center text-gray-500">
                      Chưa có ảnh hoặc video nào
                    </div>
                  )}
                </div>
                {(activeConversation?.listImage?.length || 0) + (activeConversation?.listVideo?.length || 0) > 0 && (
                  <button
                    className="w-full py-2 text-gray-600 text-sm font-medium flex items-center justify-center bg-gray-100 rounded-md"
                    onClick={() => setIsMediaModalOpen(true)}
                  >
                    Xem tất cả
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Files Section */}
          <div className="border-b border-gray-200">
            <button 
              className="w-full p-4 flex items-center justify-between"
              onClick={() => toggleSection('files')}
            >
              <div className="flex items-center">
                <Link className="w-5 h-5 mr-3 text-gray-600" />
                <span>File</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {activeConversation?.listFile?.length || 0} mục
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${sectionsState.files ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {sectionsState.files && (
              <div className="px-4 pb-4">
                <div className="space-y-2 mb-2">
                  {/* Display actual files from conversation */}
                  {activeConversation?.listFile?.slice(0, 3).map((fileUrl, index) => {
                    // Extract filename from URL
                    const fileName = fileUrl.split('/').pop() || `File ${index + 1}`;
                    // Determine file type from extension
                    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'file';
                    
                    return (
                      <div key={index} className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center mr-3">
                          <span className="text-xs font-bold text-blue-600">{fileExt.toUpperCase()}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{fileName}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                              Tải xuống
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Show placeholder if no files */}
                  {(!activeConversation?.listFile || activeConversation.listFile.length === 0) && (
                    <div className="py-4 text-center text-gray-500">
                      Chưa có file nào
                    </div>
                  )}
                </div>
                {(activeConversation?.listFile?.length || 0) > 0 && (
                  <button
                    className="w-full py-2 text-gray-600 text-sm font-medium flex items-center justify-center bg-gray-100 rounded-md"
                    onClick={() => setIsFilesModalOpen(true)}
                  >
                    Xem tất cả
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Group Actions */}
      {isGroup && (
        <div className="p-4 space-y-2">
          <button
            onClick={handleLeaveGroup}
            className="w-full py-2 text-red-600 text-sm font-medium flex items-center justify-center border border-red-600 rounded-md"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Rời khỏi nhóm
          </button>
          
          {isOwner && (
            <button
              onClick={handleDeleteGroup}
              className="w-full py-2 text-white text-sm font-medium flex items-center justify-center bg-red-600 rounded-md"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa nhóm
            </button>
          )}
        </div>
      )}

      {/* Members Modal - Keep existing modal code */}
     {/* Members Modal */}
     <Dialog
        open={isMembersModalOpen}
        onOpenChange={setIsMembersModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center justify-between">
            <span>Thành viên nhóm</span>
            {isOwnerOrCoOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsMembersModalOpen(false);
                  setIsAddMemberModalOpen(true);
                }}
                className="ml-auto"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Thêm
              </Button>
            )}
          </DialogTitle>

          <div className="mt-4">
            {/* Owner */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Trưởng nhóm</h3>
              {activeConversation?.rules?.IDOwner && (
                <div className="flex items-center p-2 rounded-md">
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <Image
                      src={
                        activeConversation.owner?.urlavatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          activeConversation.owner?.fullname || "Owner"
                        )}`
                      }
                      alt={activeConversation.owner?.fullname || "Owner"}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium flex items-center">
                      {activeConversation.owner?.fullname || "Owner"}
                      <Crown className="w-4 h-4 text-yellow-500 ml-1" />
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Co-Owners */}
            {/* Co-Owners */}
            {activeConversation?.rules?.listIDCoOwner && 
             activeConversation.rules.listIDCoOwner.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Phó nhóm</h3>
                {activeConversation.rules.listIDCoOwner.map((coOwnerId) => {
                  // Find the co-owner information from regularMembers
                  const coOwnerInfo = activeConversation.coOwners?.find(
                    member => member.id === coOwnerId
                  );
                  
                  // Skip if co-owner info not found
                  if (!coOwnerInfo) return null;
                  
                  return (
                    <div key={coOwnerId} className="flex items-center p-2 rounded-md">
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                        <Image
                          src={
                            coOwnerInfo.urlavatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              coOwnerInfo.fullname
                            )}`
                          }
                          alt={coOwnerInfo.fullname}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium flex items-center">
                          {coOwnerInfo.fullname}
                          <UserCog className="w-4 h-4 text-blue-500 ml-1" />
                        </p>
                      </div>
                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-gray-100">
                              <MoreHorizontal className="w-5 h-5 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTransferOwnership(coOwnerId)}>
                              <Crown className="w-4 h-4 mr-2" />
                              <span>Chuyển quyền trưởng nhóm</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRemoveMember(coOwnerId)}>
                              <UserMinus className="w-4 h-4 mr-2" />
                              <span>Xóa khỏi nhóm</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Regular Members */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Thành viên</h3>
              <div className="max-h-60 overflow-y-auto">
                {groupMembers.map((member) => {
                  // Skip owner and co-owners as they're already displayed
                  if (
                    member.id === activeConversation?.rules?.IDOwner ||
                    activeConversation?.rules?.listIDCoOwner?.includes(member.id)
                  ) {
                    return null;
                  }
                  
                  return (
                    <div key={member.id} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                        <Image
                          src={
                            member.urlavatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              member.fullname
                            )}`
                          }
                          alt={member.fullname}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.fullname}</p>
                      </div>
                      {isOwnerOrCoOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-gray-100">
                              <MoreHorizontal className="w-5 h-5 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isOwner && (
                              <DropdownMenuItem onClick={() => handleTransferOwnership(member.id)}>
                                <Crown className="w-4 h-4 mr-2" />
                                <span>Chuyển quyền trưởng nhóm</span>
                              </DropdownMenuItem>
                            )}
                            {isOwner && (
                              <DropdownMenuItem onClick={() => handlePromoteToCoOwner(member.id)}>
                                <UserCog className="w-4 h-4 mr-2" />
                                <span>Thăng cấp thành phó nhóm</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleRemoveMember(member.id)}>
                              <UserMinus className="w-4 h-4 mr-2" />
                              <span>Xóa khỏi nhóm</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsMembersModalOpen(false)}
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
      {/* Media Modal */}
      <Dialog
        open={isMediaModalOpen}
        onOpenChange={setIsMediaModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Ảnh/Video đã chia sẻ</DialogTitle>

          <div className="mt-4">
            <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto p-1">
              {/* Images */}
              {activeConversation?.listImage?.map((url, index) => (
                <div key={`img-${index}`} className="aspect-square bg-gray-200 rounded overflow-hidden">
                  <Image
                    src={url}
                    alt="Image"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </div>
              ))}
              
              {/* Videos */}
              {activeConversation?.listVideo?.map((url, index) => (
                <div key={`vid-${index}`} className="aspect-square bg-gray-200 rounded overflow-hidden relative">
                  <Image
                    src={url.replace(/\.[^/.]+$/, ".jpg") || "/icons/video-placeholder.png"}
                    alt="Video thumbnail"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show placeholder if no media */}
              {(activeConversation?.listImage?.length === 0 && activeConversation?.listVideo?.length === 0) && (
                <div className="col-span-3 py-4 text-center text-gray-500">
                  Chưa có ảnh hoặc video nào
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsMediaModalOpen(false)}
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Files Modal */}
      <Dialog
        open={isFilesModalOpen}
        onOpenChange={setIsFilesModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>File đã chia sẻ</DialogTitle>

          <div className="mt-4">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
              {activeConversation?.listFile?.map((fileUrl, index) => {
                // Extract filename from URL
                const fileName = fileUrl.split('/').pop() || `File ${index + 1}`;
                // Determine file type from extension
                const fileExt = fileName.split('.').pop()?.toLowerCase() || 'file';
                
                return (
                  <div key={index} className="flex items-center p-2 hover:bg-gray-100 rounded-md">
                    <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center mr-3">
                      <span className="text-xs font-bold text-blue-600">{fileExt.toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{fileName}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                          Tải xuống
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Show placeholder if no files */}
              {(!activeConversation?.listFile || activeConversation.listFile.length === 0) && (
                <div className="py-4 text-center text-gray-500">
                  Chưa có file nào
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsFilesModalOpen(false)}
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog
        open={confirmationState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationState({
              isOpen: false,
              memberId: "",
              action: ""
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {confirmationState.action === "remove" && "Xóa thành viên"}
            {confirmationState.action === "promote" && "Thăng cấp thành viên"}
            {confirmationState.action === "transfer" && "Chuyển quyền trưởng nhóm"}
          </DialogTitle>
          
          <div className="py-4">
            {confirmationState.action === "remove" && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                <p>Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?</p>
              </div>
            )}
            {confirmationState.action === "promote" && (
              <div className="flex items-center space-x-2">
                <UserCog className="h-6 w-6 text-blue-500" />
                <p>Bạn có chắc chắn muốn thăng cấp thành viên này thành phó nhóm?</p>
              </div>
            )}
            {confirmationState.action === "transfer" && (
              <div className="flex items-center space-x-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                <p>Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho thành viên này?</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmationState({
                isOpen: false,
                memberId: "",
                action: ""
              })}
            >
              Hủy
            </Button>
            <Button
              variant={confirmationState.action === "remove" ? "destructive" : "default"}
              onClick={handleConfirmAction}
            >
              {confirmationState.action === "remove" && "Xóa"}
              {confirmationState.action === "promote" && "Thăng cấp"}
              {confirmationState.action === "transfer" && "Chuyển quyền"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
