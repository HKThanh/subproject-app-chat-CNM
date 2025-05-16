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
import ImageViewer from "@/components/chat/image-viewer";

interface ChatInfoProps {
  activeConversation: Conversation | null;
  removeMembersFromGroup: (
    conversationId: string,
    membersToRemove: string[]
  ) => void;
  changeGroupOwner: (conversationId: string, newOwnerId: string) => void;
  demoteMember?: (conversationId: string, memberToDemote: string) => void;
}

export default function ChatInfo({
  activeConversation,
  removeMembersFromGroup,
  changeGroupOwner,
  demoteMember,
}: ChatInfoProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState<File | null>(null);
  const [newGroupAvatarPreview, setNewGroupAvatarPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isDeleteGroupConfirmOpen, setIsDeleteGroupConfirmOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [friends, setFriends] = useState<
    Array<{ id: string; fullname: string; urlavatar?: string }>
  >([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    memberId: "",
    action: "" as "remove" | "promote" | "transfer" | "demote" | "",
  });
  const [isLeaveGroupConfirmOpen, setIsLeaveGroupConfirmOpen] = useState(false);
  const { socket } = useSocketContext();
  const currentUser = useUserStore((state) => state.user);

  // Determine if this is a group conversation
  const isGroup = activeConversation?.isGroup === true;

  // Get group members if this is a group
  const groupMembers = activeConversation?.regularMembers || [];

  // Check if current user is owner or co-owner
  const isOwner = activeConversation?.rules?.IDOwner === currentUser?.id;
  const isCoOwner = activeConversation?.rules?.listIDCoOwner?.includes(
    currentUser?.id || ""
  );
  const isOwnerOrCoOwner = isOwner || isCoOwner;
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Create a combined array of images and videos for the viewer
  const mediaItems = [
    ...(activeConversation?.listImage || []).map((item: any) => ({
      url: item,
      alt: "Image",
      type: "image" as const
    })),
    ...(activeConversation?.listVideo || []).map(item => ({
      url: item,
      alt: "Video",
      type: "video" as const
    }))
  ];
useEffect(() => {
    console.log("mediaItems>> ", mediaItems);
  }, [mediaItems]);
  // Function to open image viewer with specific index
  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageViewerOpen(true);
  };
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
              ...(activeConversation?.regularMembers?.map(
                (member) => member.id
              ) || []),
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
  // useEffect to handle promotion response
  // useEffect(() => {
  //   if (!socket) return;

  //   const handlePromoteResponse = (data: any) => {
  //     if (data.success) {
  //       toast.success("Thăng cấp thành viên thành công");
  //       // No need to manually update the UI as we'll receive a new_group_conversation event
  //     } else {
  //       toast.error(data.message || "Không thể thăng cấp thành viên");
  //     }
  //   };

  //   socket.on("promote_member_response", handlePromoteResponse);

  //   // Add listener for system message about promotion
  //   const handleSystemMessage = (data: any) => {
  //     if (
  //       data.message &&
  //       data.message.type === "system" &&
  //       data.conversationId === activeConversation?.idConversation
  //     ) {
  //       // The server will send updated conversation data, so we'll get it automatically
  //       toast.info(data.message.content);
  //     }
  //   };

  //   socket.on("new_message", handleSystemMessage);

  //   return () => {
  //     socket.off("promote_member_response", handlePromoteResponse);
  //     socket.off("new_message", handleSystemMessage);
  //   };
  // }, [socket, activeConversation]);
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
      action: "remove",
    });
  };
  const handleConfirmAction = () => {
    if (!activeConversation || !confirmationState.memberId) return;

    if (confirmationState.action === "remove") {
      console.log("is remove member>> ", confirmationState.memberId);

      removeMembersFromGroup(activeConversation.idConversation, [
        confirmationState.memberId,
      ]);
      setConfirmationState({ isOpen: false, memberId: "", action: "" });
      setIsMembersModalOpen(false);
      toast.success("Đang xóa thành viên khỏi nhóm...");
    } else if (confirmationState.action === "promote") {
      // section to handle promotion
      if (!socket || !currentUser) return;

      socket.emit("promote_member_to_admin", {
        IDConversation: activeConversation.idConversation,
        IDUser: currentUser.id,
        IDMemberToPromote: confirmationState.memberId,
      });

      toast.success("Đang thăng cấp thành viên lên phó nhóm...");
    } else if (confirmationState.action === "transfer") {
      if (changeGroupOwner && activeConversation) {
        changeGroupOwner(
          activeConversation.idConversation,
          confirmationState.memberId
        );
        toast.success("Đang chuyển quyền trưởng nhóm...");
      } else {
        toast.error("Không thể chuyển quyền trưởng nhóm");
      }
    } else if (confirmationState.action === "demote") {
      // Call the demoteMember function
      if (demoteMember && activeConversation) {
        demoteMember(
          activeConversation.idConversation,
          confirmationState.memberId
        );
        toast.success("Đang thu hồi quyền quản trị viên...");
      } else {
        toast.error("Không thể thu hồi quyền quản trị viên");
      }
    }
    // Close the modal
    setConfirmationState({
      isOpen: false,
      memberId: "",
      action: "",
    });
  };
  const handlePromoteToCoOwner = (memberId: string) => {
    if (!socket || !activeConversation) return;

    // Open confirmation modal
    setConfirmationState({
      isOpen: true,
      memberId,
      action: "promote",
    });
  };

  const handleTransferOwnership = (memberId: string) => {
    if (!socket || !activeConversation) return;

    // Open confirmation modal
    setConfirmationState({
      isOpen: true,
      memberId,
      action: "transfer",
    });
  };

  // Add new state for section collapse
  const [sectionsState, setSectionsState] = useState({
    members: false,
    media: false,
    files: false,
  });

  // Toggle section collapse
  const toggleSection = (section: "members" | "media" | "files") => {
    setSectionsState((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  // Add a function to handle demoting a co-owner
  const handleDemoteMember = (memberId: string) => {
    if (!activeConversation) return;

    // Open confirmation modal
    setConfirmationState({
      isOpen: true,
      memberId,
      action: "demote",
    });
  };
  // New function to handle leaving group
  const handleLeaveGroup = () => {
    if (!socket || !activeConversation) return;

    // For owner, show a message that they need to transfer ownership first
    if (isOwner) {
      toast.error(
        "Trưởng nhóm không thể rời nhóm. Vui lòng chuyển quyền trưởng nhóm trước khi rời nhóm."
      );
      return;
    }

    // Open confirmation dialog
    setIsLeaveGroupConfirmOpen(true);
  };
  // Add a function to handle the confirmed leave action
  const handleConfirmLeaveGroup = () => {
    if (!socket || !activeConversation || !currentUser) return;

    socket.emit("leave_group", {
      IDConversation: activeConversation.idConversation,
      IDUser: currentUser.id,
    });

    // Close the confirmation dialog
    setIsLeaveGroupConfirmOpen(false);

    toast.success("Đang rời khỏi nhóm...");
  };

  // New function to handle deleting group
  const handleDeleteGroup = () => {
    setIsDeleteGroupConfirmOpen(true);
  };
  const handleConfirmDeleteGroup = () => {
    if (!socket || !activeConversation) return;

    socket.emit("delete_group", {
      IDConversation: activeConversation.idConversation,
      IDUser: currentUser?.id,
    });

    // Close the confirmation dialog
    setIsDeleteGroupConfirmOpen(false);

    toast.success("Đang xóa nhóm...");
  };
  // function to handle the leave group confirmation dialog
  const handleUpdateGroupInfo = async () => {
    if (!activeConversation) return;

    setIsUploading(true);

    try {
      let groupAvatarUrl = activeConversation.groupAvatar;

      // Upload new avatar if selected
      if (newGroupAvatar) {
        const formData = new FormData();
        formData.append("avatar-group", newGroupAvatar);

        const token = await getAuthToken();

        const response = await fetch(`${apiUrl}/upload/avatar-group`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json();
          toast.error(errorData.message || "Failed to upload avatar");
          return;
        }
        const data = await response.json();
        if (data.success) {
          groupAvatarUrl = data.fileUrl;
        } else {
          throw new Error(data.message || "Failed to upload avatar");
        }
      }

      // Send update to server
      socket?.emit("update_group_info", {
        IDConversation: activeConversation.idConversation,
        IDUser: currentUser?.id,
        groupName: newGroupName || activeConversation.groupName,
        groupAvatarUrl: groupAvatarUrl,
      });

      // Close modal and reset state
      setIsEditGroupModalOpen(false);
      setNewGroupName("");
      setNewGroupAvatar(null);
      setNewGroupAvatarPreview("");

      toast.success("Đang cập nhật thông tin nhóm...");
    } catch (error) {
      console.error("Error updating group info:", error);
      toast.error("Lỗi khi cập nhật thông tin nhóm");
    } finally {
      setIsUploading(false);
    }
  };

  // function to handle avatar selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file hình ảnh");
        return;
      }

      setNewGroupAvatar(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewGroupAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  //useEffect to initialize the group name when opening the edit modal
  useEffect(() => {
    if (isEditGroupModalOpen && activeConversation) {
      setNewGroupName(activeConversation.groupName || "");
      setNewGroupAvatarPreview("");
      setNewGroupAvatar(null);
    }
  }, [isEditGroupModalOpen, activeConversation]);
  return (
    (activeConversation &&
      <div className="h-full overflow-y-auto bg-gray-50 text-gray-900 w-full max-w-full">
        {/* Header - Thêm padding responsive */}
        <div className="py-40 sm:p-4 border-b border-gray-200 text-center">
          <h2 className="text-base sm:text-lg font-medium">
            Thông tin {isGroup ? "nhóm" : "hội thoại"}
          </h2>
        </div>

        {/* Profile */}
        <div className="p-3 sm:p-4 flex flex-col items-center border-b border-gray-200">
          <div className="relative mb-2">
            {/* Điều chỉnh kích thước avatar để responsive */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center bg-gray-100">
              {isGroup ? (
                <Image
                  src={
                    activeConversation?.groupAvatar ||
                    "https://danhgiaxe.edu.vn/upload/2024/12/99-mau-avatar-nhom-dep-nhat-danh-cho-team-dong-nguoi-30.webp"
                  }
                  alt={activeConversation?.groupName || "Group"}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full rounded-full"
                />
              ) : (
                <Image
                  src={
                    activeConversation?.otherUser?.urlavatar ||
                    `https://ui-avatars.com/api/?name=${activeConversation?.otherUser?.fullname || "User"}`
                  }
                  alt={activeConversation?.otherUser?.fullname || "User"}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full rounded-full"
                />
              )}
            </div>
            {isGroup && (
              <div>
                {isOwnerOrCoOwner && (
                  <button
                    onClick={() => setIsEditGroupModalOpen(true)}
                    className="absolute bottom-0 right-0 bg-gray-200 p-1 rounded-full shadow-sm border border-white"
                  >
                    <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-center px-2 break-words">
            {isGroup
              ? activeConversation?.groupName || "Nhóm"
              : activeConversation?.otherUser?.fullname || "Người dùng"}
          </h3>
        </div>

        {/* Collapsible Sections */}
        <>
          {/* Members Section - Only for groups */}
          {isGroup && (
            <div className="border-b border-gray-200">
              <button
                className="w-full p-3 sm:p-4 flex items-center justify-between"
                onClick={() => toggleSection("members")}
              >
                <div className="flex items-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-gray-600" />
                  <span className="text-sm sm:text-base">Thành viên nhóm</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs sm:text-sm text-gray-500 mr-1 sm:mr-2">
                    {activeConversation?.groupMembers?.length} thành viên
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${sectionsState.members ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
              {sectionsState.members && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <button
                    className="w-full py-1.5 sm:py-2 text-blue-600 text-xs sm:text-sm font-medium flex items-center justify-center border border-blue-600 rounded-md mb-2"
                    onClick={() => setIsMembersModalOpen(true)}
                  >
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Xem tất cả thành viên
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Media Section - Thêm responsive */}
          <div className="border-b border-gray-200">
            <button
              className="w-full p-3 sm:p-4 flex items-center justify-between"
              onClick={() => toggleSection("media")}
            >
              <div className="flex items-center">
                <Image
                  src="/icons/image-icon.png"
                  alt="Media"
                  width={20}
                  height={20}
                  className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3"
                />
                <span className="text-sm sm:text-base">Ảnh/Video</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs sm:text-sm text-gray-500 mr-1 sm:mr-2">
                  {mediaItems.length} mục
                </span>
                <ChevronDown
                  className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${sectionsState.media ? "rotate-180" : ""}`}
                />
              </div>
            </button>
            {sectionsState.media && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {/* Display actual images and videos from conversation */}
                  {mediaItems.slice(0, 8).map((item, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-gray-200 rounded overflow-hidden cursor-pointer"
                      onClick={() => openImageViewer(index)}
                    >
                      {item.type === "video" ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={item.url.replace(/\.[^/.]+$/, ".jpg") || "/icons/video-placeholder.png"}
                            alt="Video thumbnail"
                            width={100}
                            height={100}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-white"
                              >
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Image
                          src={item.url}
                          alt="Media item"
                          width={100}
                          height={100}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                  {/* Show placeholder if no media */}
                  {mediaItems.length === 0 && (
                    <div className="col-span-4 py-4 text-center text-gray-500">
                      Chưa có ảnh hoặc video nào
                    </div>
                  )}
                </div>
                {mediaItems.length > 0 && (
                  <button
                    className="w-full py-1.5 sm:py-2 text-gray-600 text-xs sm:text-sm font-medium flex items-center justify-center bg-gray-100 rounded-md"
                    onClick={() => setIsMediaModalOpen(true)}
                  >
                    Xem tất cả
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Files Section - Thêm responsive */}
          <div className="border-b border-gray-200">
            <button
              className="w-full p-3 sm:p-4 flex items-center justify-between"
              onClick={() => toggleSection("files")}
            >
              <div className="flex items-center">
                <Link className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-gray-600" />
                <span className="text-sm sm:text-base">File</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs sm:text-sm text-gray-500 mr-1 sm:mr-2">
                  {activeConversation?.listFile?.length || 0} mục
                </span>
                <ChevronDown
                  className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${sectionsState.files ? "rotate-180" : ""}`}
                />
              </div>
            </button>
            {sectionsState.files && (
              <div className="px-4 pb-4">
                <div className="space-y-2 mb-2">
                  {/* Display actual files from conversation */}
                  {activeConversation?.listFile
                    ?.slice(0, 3)
                    .map((fileUrl, index) => {
                      // Extract filename from URL
                      const fileName =
                        fileUrl.split("/").pop() || `File ${index + 1}`;
                      // Determine file type from extension
                      const fileExt =
                        fileName.split(".").pop()?.toLowerCase() || "file";

                      return (
                        <div key={index} className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center mr-3">
                            <span className="text-xs font-bold text-blue-600">
                              {fileExt.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{fileName}</p>
                            <div className="flex items-center text-xs text-gray-500">
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600"
                              >
                                Tải xuống
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {/* Show placeholder if no files */}
                  {(!activeConversation?.listFile ||
                    activeConversation.listFile.length === 0) && (
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


        {/* Group Actions */}
        {isGroup && (
          <div className="p-3 sm:p-4 space-y-2">
            <button
              onClick={handleLeaveGroup}
              className="w-full py-1.5 sm:py-2 text-red-600 text-xs sm:text-sm font-medium flex items-center justify-center border border-red-600 rounded-md"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Rời khỏi nhóm
            </button>

            {isOwner && (
              <button
                onClick={handleDeleteGroup}
                className="w-full py-1.5 sm:py-2 text-white text-xs sm:text-sm font-medium flex items-center justify-center bg-red-600 rounded-md"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Xóa nhóm
              </button>
            )}
          </div>
        )}

        {/* Members Modal - Keep existing modal code */}
        {/* Members Modal */}
        <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
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
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Trưởng nhóm
                </h3>
                {activeConversation?.rules?.IDOwner && (
                  <div className="flex items-center p-2 rounded-md">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex items-center justify-center bg-gray-100">
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
                        className="object-cover w-full h-full rounded-full"
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
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Phó nhóm
                    </h3>
                    {activeConversation.rules.listIDCoOwner.map((coOwnerId) => {
                      // Find the co-owner information from regularMembers
                      const coOwnerInfo = activeConversation.coOwners?.find(
                        (member) => member.id === coOwnerId
                      );

                      // Skip if co-owner info not found
                      if (!coOwnerInfo) return null;

                      return (
                        <div
                          key={coOwnerId}
                          className="flex items-center p-2 rounded-md"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex items-center justify-center bg-gray-100">
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
                              className="object-cover w-full h-full rounded-full"
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
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTransferOwnership(coOwnerId)
                                  }
                                >
                                  <Crown className="w-4 h-4 mr-2" />
                                  <span>Chuyển quyền trưởng nhóm</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDemoteMember(coOwnerId)}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  Thu hồi quyền quản trị
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(coOwnerId)}
                                >
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
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Thành viên
                </h3>
                <div className="max-h-60 overflow-y-auto">
                  {groupMembers.map((member) => {
                    // Skip owner and co-owners as they're already displayed
                    if (
                      member.id === activeConversation?.rules?.IDOwner ||
                      activeConversation?.rules?.listIDCoOwner?.includes(
                        member.id
                      )
                    ) {
                      return null;
                    }

                    return (
                      <div
                        key={member.id}
                        className="flex items-center p-2 rounded-md hover:bg-gray-100"
                      >
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
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleTransferOwnership(member.id)
                                  }
                                >
                                  <Crown className="w-4 h-4 mr-2" />
                                  <span>Chuyển quyền trưởng nhóm</span>
                                </DropdownMenuItem>
                              )}
                              {isOwner && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handlePromoteToCoOwner(member.id)
                                  }
                                >
                                  <UserCog className="w-4 h-4 mr-2" />
                                  <span>Thăng cấp thành phó nhóm</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRemoveMember(member.id)}
                              >
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
                      className={`flex items-center p-2 rounded-md cursor-pointer ${selectedUsers.includes(friend.id)
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
                        className={`w-5 h-5 rounded-full border ${selectedUsers.includes(friend.id)
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
        <Dialog open={isMediaModalOpen} onOpenChange={setIsMediaModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Ảnh/Video đã chia sẻ</DialogTitle>

            <div className="mt-4">
              <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto p-1">
                {mediaItems.map((item, index) => (
                  <div
                    key={index}
                    className="aspect-square bg-gray-200 rounded overflow-hidden cursor-pointer"
                    onClick={() => openImageViewer(index)}
                  >
                    {item.type === "video" ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={item.url.replace(/\.[^/.]+$/, ".jpg") || "/icons/video-placeholder.png"}
                          alt="Video thumbnail"
                          width={120}
                          height={120}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-white"
                            >
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={item.url}
                        alt={item.alt || "Media"}
                        width={120}
                        height={120}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}

                {/* Show placeholder if no media */}
                {mediaItems.length === 0 && (
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
        <Dialog open={isFilesModalOpen} onOpenChange={setIsFilesModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>File đã chia sẻ</DialogTitle>

            <div className="mt-4">
              <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
                {activeConversation?.listFile?.map((fileUrl, index) => {
                  // Extract filename from URL
                  const fileName =
                    fileUrl.split("/").pop() || `File ${index + 1}`;
                  // Determine file type from extension
                  const fileExt =
                    fileName.split(".").pop()?.toLowerCase() || "file";

                  return (
                    <div
                      key={index}
                      className="flex items-center p-2 hover:bg-gray-100 rounded-md"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-blue-600">
                          {fileExt.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{fileName}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600"
                          >
                            Tải xuống
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Show placeholder if no files */}
                {(!activeConversation?.listFile ||
                  activeConversation.listFile.length === 0) && (
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
            if (!open)
              setConfirmationState({ isOpen: false, memberId: "", action: "" });
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogTitle>
              {confirmationState.action === "remove" && "Xóa thành viên"}
              {confirmationState.action === "promote" && "Thăng cấp thành viên"}
              {confirmationState.action === "transfer" &&
                "Chuyển quyền trưởng nhóm"}
              {confirmationState.action === "demote" &&
                "Thu hồi quyền quản trị viên"}
            </DialogTitle>

            <div className="mt-4">
              <p>
                {confirmationState.action === "remove" &&
                  "Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?"}
                {confirmationState.action === "promote" &&
                  "Bạn có chắc chắn muốn thăng cấp thành viên này lên phó nhóm?"}
                {confirmationState.action === "transfer" &&
                  "Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho thành viên này?"}
                {confirmationState.action === "demote" &&
                  "Bạn có chắc chắn muốn thu hồi quyền quản trị viên của thành viên này?"}
              </p>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setConfirmationState({
                      isOpen: false,
                      memberId: "",
                      action: "",
                    })
                  }
                >
                  Hủy
                </Button>
                <Button
                  variant={
                    confirmationState.action === "demote" ||
                      confirmationState.action === "remove"
                      ? "destructive"
                      : "default"
                  }
                  onClick={handleConfirmAction}
                >
                  Xác nhận
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Leave Group Confirmation Dialog */}
        <Dialog
          open={isLeaveGroupConfirmOpen}
          onOpenChange={setIsLeaveGroupConfirmOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Xác nhận rời nhóm</DialogTitle>

            <div className="mt-4">
              <p className="text-gray-700">
                Bạn có chắc chắn muốn rời khỏi nhóm này? Bạn sẽ không thể xem tin
                nhắn trong nhóm sau khi rời.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsLeaveGroupConfirmOpen(false)}
              >
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleConfirmLeaveGroup}>
                Rời nhóm
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add this Edit Group Modal */}
        <Dialog open={isEditGroupModalOpen} onOpenChange={setIsEditGroupModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Chỉnh sửa thông tin nhóm</DialogTitle>

            <div className="mt-4 space-y-4">
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 mb-2">
                  <Avatar className="w-24 h-24 border-2 border-gray-200">
                    <Image
                      src={
                        newGroupAvatarPreview ||
                        activeConversation?.groupAvatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          activeConversation?.groupName || "Group"
                        )}`
                      }
                      alt="Group Avatar"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </Avatar>
                  <label
                    htmlFor="group-avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                  >
                    <Pencil className="w-6 h-6 text-white" />
                  </label>
                  <input
                    id="group-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Tên nhóm
                </label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Nhập tên nhóm mới"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditGroupModalOpen(false);
                  setNewGroupName("");
                  setNewGroupAvatar(null);
                  setNewGroupAvatarPreview("");
                }}
                disabled={isUploading}
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdateGroupInfo}
                disabled={
                  isUploading ||
                  (!newGroupName && !newGroupAvatar) ||
                  (newGroupName === activeConversation?.groupName && !newGroupAvatar)
                }
              >
                {isUploading ? "Đang cập nhật..." : "Cập nhật"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Group Confirmation Dialog */}
        <Dialog
          open={isDeleteGroupConfirmOpen}
          onOpenChange={setIsDeleteGroupConfirmOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogTitle>Xác nhận xóa nhóm</DialogTitle>

            <div className="mt-4">
              <p className="text-gray-700">
                Bạn có chắc chắn muốn xóa nhóm này? Hành động này không thể hoàn tác và tất cả tin nhắn,
                tệp đính kèm và dữ liệu nhóm sẽ bị xóa vĩnh viễn.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteGroupConfirmOpen(false)}
              >
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteGroup}>
                Xóa nhóm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Image Viewer */}
        <ImageViewer
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          images={mediaItems}
          initialIndex={selectedImageIndex}
        />
      </div>

    )


  );
}
