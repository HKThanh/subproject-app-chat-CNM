"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Search, UserX, Shield } from "lucide-react";
import { getAuthToken } from "@/utils/auth-utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSocketContext } from "@/socket/SocketContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { BlockedAvatar } from "@/components/ui/blocked-avatar";

interface Contact {
  id: string;
  fullname: string;
  urlavatar: string;
  email?: string;
  phone?: string;
  isBlocked?: boolean;
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
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactGroup[]>([]);
  const [totalFriends, setTotalFriends] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState<Contact[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { socket } = useSocketContext(); // Sử dụng socket hook
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<Contact | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // Thêm state cho sort order

  // Kiểm tra socket khi component mount
  useEffect(() => {
    if (socket) {
      console.log("Socket connected:", socket.connected);
    } else {
      console.log("Socket not initialized");
    }
  }, [socket]);

  // Xử lý sự kiện khi người dùng nhấn ra ngoài dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown !== null && !isProcessing) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown, isProcessing]);

  // Lắng nghe sự kiện unfriend từ socket
  useEffect(() => {
    if (!socket) {
      console.log("Socket is not connected");
      return;
    }

    console.log("Setting up socket listeners for friend updates");

    // Xử lý khi người khác xóa mình khỏi danh sách bạn bè
    const handleUnfriend = (data: { friendId: string; message: string }) => {
      console.log("Unfriend event received:", data);
      // Bỏ thông báo khi bị xóa bạn theo yêu cầu nghiệp vụ
      // toast.info(data.message);

      // Cập nhật danh sách bạn bè ngay lập tức
      setContacts((prevGroups) => {
        const newGroups = prevGroups
          .map((group) => ({
            ...group,
            contacts: group.contacts.filter(
              (contact) => contact.id !== data.friendId
            ),
          }))
          .filter((group) => group.contacts.length > 0);

        return newGroups;
      });

      // Cập nhật tổng số bạn bè
      setTotalFriends((prev) => Math.max(0, prev - 1));
    };

    // Lắng nghe tất cả các biến thể có thể có của sự kiện unfriend
    socket.on("unFriend", handleUnfriend);
    socket.on("unfriend", handleUnfriend);
    socket.on("removeFriend", handleUnfriend);
    socket.on("friendRemoved", handleUnfriend);

    // Lắng nghe sự kiện block/unblock
    const handleBlockedByUser = (data: {
      blockerId: string;
      message: string;
    }) => {
      console.log("Blocked by user event received:", data);
      // Bỏ thông báo khi bị chặn theo yêu cầu nghiệp vụ
      // toast.info(data.message);
    };

    const handleUnblockedByUser = (data: {
      blockerId: string;
      message: string;
    }) => {
      console.log("Unblocked by user event received:", data);
      // Bỏ thông báo khi được bỏ chặn theo yêu cầu nghiệp vụ
      // toast.info(data.message);
    };

    socket.on("blockedByUser", handleBlockedByUser);
    socket.on("unblockedByUser", handleUnblockedByUser);

    // Kiểm tra kết nối socket
    console.log("Socket connected:", socket.connected);

    // Đảm bảo đã join vào room cá nhân để nhận thông báo
    const userId = JSON.parse(sessionStorage.getItem("user-session") || "{}")
      ?.state?.user?.id;
    if (userId) {
      console.log("Joining user room:", userId);
      socket.emit("joinUserRoom", userId);
    }

    return () => {
      console.log("Cleaning up friend update listeners");
      socket.off("unFriend", handleUnfriend);
      socket.off("unfriend", handleUnfriend);
      socket.off("removeFriend", handleUnfriend);
      socket.off("friendRemoved", handleUnfriend);
      socket.off("blockedByUser", handleBlockedByUser);
      socket.off("unblockedByUser", handleUnblockedByUser);
    };
  }, [socket]);

  const fetchFriendList = async () => {
    try {
      const token = await getAuthToken();
      // Sử dụng API mới có hỗ trợ sort
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/friend/list?sortOrder=${sortOrder}&limit=50&offset=0`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await response.json();

      // Kiểm tra response format theo API docs mới
      if (result.success && result.data && Array.isArray(result.data.friends)) {
        console.log("Friend list response:", result); // Debug log

        const friendList = result.data.friends;
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
        // Backend đã sort rồi nên chỉ cần group theo letter
        const sortedGroups = Object.entries(groupedContacts)
          .map(([letter, contacts]) => ({
            letter,
            contacts: contacts, // Không cần sort lại vì backend đã sort
          }))
          .sort((a, b) => {
            // Sort groups theo sortOrder
            if (sortOrder === "desc") {
              return b.letter.localeCompare(a.letter);
            }
            return a.letter.localeCompare(b.letter);
          });

        setContacts(sortedGroups);
        setTotalFriends(result.data.total);
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
    fetchBlockedUsers();

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
  }, [sortOrder]); // Thêm sortOrder vào dependency để reload khi sort thay đổi

  // Xử lý thay đổi sort order
  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortOrder = event.target.value as "asc" | "desc";
    setSortOrder(newSortOrder);
  };

  // Fetch danh sách người dùng bị chặn
  const fetchBlockedUsers = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/blocked/get-blocked`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();

      if (result.success) {
        setBlockedUsers(result.data || []);
      } else {
        console.error("Failed to fetch blocked users:", result.message);
      }
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    }
  };

  // Đơn giản hóa cách xử lý dropdown và xóa bạn
  const handleRemoveFriend = async (friendId: string) => {
    console.log("Removing friend:", friendId);
    setIsProcessing(true);

    try {
      const token = await getAuthToken();
      const userId = JSON.parse(sessionStorage.getItem("user-session") || "{}")
        ?.state?.user?.id;

      // Cập nhật UI ngay lập tức (optimistic update)
      setContacts((prevGroups) => {
        const newGroups = prevGroups
          .map((group) => ({
            ...group,
            contacts: group.contacts.filter(
              (contact) => contact.id !== friendId
            ),
          }))
          .filter((group) => group.contacts.length > 0);

        return newGroups;
      });

      setTotalFriends((prev) => Math.max(0, prev - 1));

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
      console.log("Unfriend result:", result);

      if (result.code === 1) {
        toast.success("Đã xóa bạn thành công");

        // Đảm bảo socket emit sự kiện unfriend nếu server không tự động làm
        if (socket && socket.connected) {
          socket.emit("unfriend", {
            senderId: userId,
            receiverId: friendId,
            message: "Bạn đã bị xóa khỏi danh sách bạn bè",
          });
        }
      } else {
        // Nếu API thất bại, hoàn tác UI (rollback optimistic update)
        toast.error(result.message || "Không thể xóa bạn");
        fetchFriendList(); // Tải lại danh sách bạn bè
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Đã xảy ra lỗi khi xóa bạn");
      fetchFriendList(); // Tải lại danh sách bạn bè nếu có lỗi
    } finally {
      // Đảm bảo reset state
      setIsProcessing(false);
      setActiveDropdown(null);
      setConfirmDialogOpen(false);
      setFriendToRemove(null);

      // Đảm bảo không có overlay nào còn tồn tại
      setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 100);
    }
  };

  // Xử lý chặn người dùng
  const handleBlockUser = async (userId: string) => {
    setActionInProgress(true);

    try {
      const token = await getAuthToken();

      // Tìm thông tin người dùng sẽ bị chặn
      const userToBlock = contacts
        .flatMap((group) => group.contacts)
        .find((contact) => contact.id === userId);

      if (!userToBlock) {
        toast.error("Không tìm thấy thông tin người dùng");
        return;
      }

      // Gọi API chặn người dùng với body {userId}
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/blocked/block`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: userId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Đã chặn người dùng này");

        // KHÔNG xóa khỏi danh sách bạn bè - chỉ thêm vào danh sách bị chặn
        // Logic merge sẽ tự động đánh dấu isBlocked = true

        // Thêm vào danh sách người dùng bị chặn
        setBlockedUsers((prev) => [
          ...prev,
          { ...userToBlock, isBlocked: true },
        ]);

        // Emit event để cập nhật conversation status
        window.dispatchEvent(
          new CustomEvent("userBlocked", {
            detail: { userId: userId, isBlocked: true },
          })
        );
      } else {
        toast.error(result.message || "Không thể chặn người dùng");
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Đã xảy ra lỗi khi chặn người dùng");
    } finally {
      setActiveDropdown(null);
      setActionInProgress(false);
    }
  };

  // Xử lý bỏ chặn người dùng
  const handleUnblockUser = async (userId: string) => {
    setActionInProgress(true);

    try {
      const token = await getAuthToken();

      // Tìm thông tin người dùng sẽ bỏ chặn
      const userToUnblock = blockedUsers.find((user) => user.id === userId);

      if (!userToUnblock) {
        toast.error("Không tìm thấy thông tin người dùng");
        return;
      }

      // Gọi API bỏ chặn người dùng
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/blocked/unblock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: userId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Đã bỏ chặn người dùng này");

        // Xóa khỏi danh sách người dùng bị chặn
        setBlockedUsers((prev) => prev.filter((user) => user.id !== userId));

        // Emit event để cập nhật conversation status
        window.dispatchEvent(
          new CustomEvent("userBlocked", {
            detail: { userId: userId, isBlocked: false },
          })
        );
      } else {
        toast.error(result.message || "Không thể bỏ chặn người dùng");
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Đã xảy ra lỗi khi bỏ chặn người dùng");
    } finally {
      setActiveDropdown(null);
      setActionInProgress(false);
    }
  };

  // Tạo Set các ID người dùng bị chặn để tra cứu nhanh
  const blockedUserIds = new Set(blockedUsers.map((user) => user.id));

  // Tạo Map để merge thông tin từ cả hai danh sách
  const allContactsMap = new Map();

  // Thêm tất cả bạn bè vào map
  contacts.forEach((group) => {
    group.contacts.forEach((contact) => {
      if (contact.fullname.toLowerCase().includes(searchQuery.toLowerCase())) {
        allContactsMap.set(contact.id, {
          ...contact,
          isBlocked: blockedUserIds.has(contact.id), // Đánh dấu nếu bị chặn
        });
      }
    });
  });

  // Thêm những người dùng bị chặn mà không có trong danh sách bạn bè
  blockedUsers.forEach((user) => {
    if (user.fullname.toLowerCase().includes(searchQuery.toLowerCase())) {
      if (!allContactsMap.has(user.id)) {
        // Chỉ thêm nếu chưa có trong map (không phải bạn bè)
        allContactsMap.set(user.id, {
          ...user,
          isBlocked: true,
        });
      }
    }
  });

  // Chuyển đổi map thành groups
  const allContactGroups = Array.from(allContactsMap.values())
    .reduce((groups: ContactGroup[], contact) => {
      const firstLetter = contact.fullname.charAt(0).toUpperCase();
      const existingGroup = groups.find(
        (group) => group.letter === firstLetter
      );

      if (existingGroup) {
        existingGroup.contacts.push(contact);
      } else {
        groups.push({
          letter: firstLetter,
          contacts: [contact],
        });
      }

      return groups;
    }, [])
    .map((group) => ({
      ...group,
      contacts: group.contacts.sort((a, b) => {
        // Sort contacts trong group theo sortOrder
        if (sortOrder === "desc") {
          return b.fullname.localeCompare(a.fullname);
        }
        return a.fullname.localeCompare(b.fullname);
      }),
    }))
    .sort((a, b) => {
      // Sort groups theo sortOrder
      if (sortOrder === "desc") {
        return b.letter.localeCompare(a.letter);
      }
      return a.letter.localeCompare(b.letter);
    });

  // Thêm style vào component
  useEffect(() => {
    // Thêm style để đảm bảo các nút dropdown luôn có thể nhấn được
    const style = document.createElement("style");
    style.innerHTML = `
      .dropdown-trigger {
        pointer-events: auto !important;
        z-index: 50 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Thêm useEffect để xử lý việc đóng dialog
  useEffect(() => {
    // Khi confirmDialogOpen thay đổi từ true sang false (đóng dialog)
    if (!confirmDialogOpen) {
      // Chỉ reset các state khi không có hành động đang xử lý
      if (!actionInProgress) {
        setIsProcessing(false);
      }
    }
  }, [confirmDialogOpen, actionInProgress]);

  // Lắng nghe sự kiện khi có người chấp nhận lời mời kết bạn
  useEffect(() => {
    if (!socket) return;

    // Xử lý khi có người chấp nhận lời mời kết bạn
    const handleFriendRequestAccepted = (data: any) => {
      console.log("Friend request accepted event received:", data);

      try {
        // Kiểm tra dữ liệu nhận được một cách an toàn
        if (!data || typeof data !== "object") {
          console.log(
            "Empty or invalid data received, fetching friend list anyway"
          );
          fetchFriendList();
          return;
        }

        // Kiểm tra xem data có phải là object rỗng không
        if (Object.keys(data).length === 0) {
          console.log("Empty object received, fetching friend list anyway");
          fetchFriendList();
          return;
        }

        // Kiểm tra xem data.sender có tồn tại không
        if (!data.sender) {
          console.log(
            "Data without sender received, fetching friend list anyway"
          );
          fetchFriendList();
          return;
        }

        // Lấy thông tin người dùng từ dữ liệu nhận được
        const newFriend = data.sender;

        // Tạo đối tượng contact từ dữ liệu nhận được
        const newContact: Contact = {
          id: newFriend.id,
          fullname: newFriend.fullname || "Người dùng", // Sử dụng tên thật
          urlavatar: newFriend.urlavatar || "/default-avatar.png",
          email: newFriend.email,
          phone: newFriend.phone,
        };

        console.log("Adding new friend to contact list:", newContact);

        // Cập nhật danh sách bạn bè
        setContacts((prevGroups) => {
          // Xác định chữ cái đầu tiên của tên
          const firstLetter = newContact.fullname.charAt(0).toUpperCase();

          // Tìm nhóm tương ứng
          const groupIndex = prevGroups.findIndex(
            (group) => group.letter === firstLetter
          );

          // Tạo bản sao của mảng nhóm
          const newGroups = [...prevGroups];

          if (groupIndex >= 0) {
            // Kiểm tra xem liên hệ đã tồn tại chưa
            const contactExists = newGroups[groupIndex].contacts.some(
              (contact) => contact.id === newContact.id
            );

            if (!contactExists) {
              // Nếu nhóm đã tồn tại và liên hệ chưa tồn tại, thêm liên hệ mới vào nhóm đó
              const updatedContacts = [
                ...newGroups[groupIndex].contacts,
                newContact,
              ];

              // Sắp xếp lại danh sách liên hệ theo tên
              updatedContacts.sort((a, b) =>
                a.fullname.localeCompare(b.fullname)
              );

              // Cập nhật nhóm
              newGroups[groupIndex] = {
                ...newGroups[groupIndex],
                contacts: updatedContacts,
              };
            }
          } else {
            // Nếu nhóm chưa tồn tại, tạo nhóm mới
            const newGroup = {
              letter: firstLetter,
              contacts: [newContact],
            };

            // Thêm nhóm mới vào mảng và sắp xếp lại
            newGroups.push(newGroup);
            newGroups.sort((a, b) => a.letter.localeCompare(b.letter));
          }

          return newGroups;
        });

        // Cập nhật tổng số bạn bè
        setTotalFriends((prev) => prev + 1);

        // Hiển thị thông báo
        toast.success(
          `${newContact.fullname} đã chấp nhận lời mời kết bạn của bạn`
        );
      } catch (error) {
        console.log("Error processing friend request accepted data:", error);
        // Luôn tải lại danh sách bạn bè nếu có lỗi
        fetchFriendList();
      }
    };

    // Đăng ký lắng nghe sự kiện
    socket.on("friendRequestAccepted", handleFriendRequestAccepted);

    // Đảm bảo hủy đăng ký khi component unmount
    return () => {
      socket.off("friendRequestAccepted", handleFriendRequestAccepted);
    };
  }, [socket]);

  // Thêm listener cho sự kiện khi bạn chấp nhận lời mời kết bạn của người khác
  useEffect(() => {
    if (!socket) return;

    // Xử lý khi bạn chấp nhận lời mời kết bạn của người khác
    const handleYouAcceptedFriendRequest = (data: any) => {
      console.log("You accepted friend request event received:", data);

      // Nếu bạn vừa chấp nhận lời mời kết bạn, cập nhật danh sách bạn bè
      fetchFriendList();
    };

    // Đăng ký lắng nghe sự kiện
    socket.on("youAcceptedFriendRequest", handleYouAcceptedFriendRequest);

    // Đảm bảo hủy đăng ký khi component unmount
    return () => {
      socket.off("youAcceptedFriendRequest", handleYouAcceptedFriendRequest);
    };
  }, [socket]);

  // Thêm hàm xử lý khi người dùng nhấp vào một người bạn trong danh sách
  const handleContactClick = (contact: Contact, e: React.MouseEvent) => {
    // Ngăn chặn sự kiện lan truyền nếu đang nhấp vào dropdown hoặc các nút trong dropdown
    if (
      (e.target as HTMLElement).closest(".dropdown-trigger") ||
      (e.target as HTMLElement).closest(".dropdown-menu-content") ||
      activeDropdown !== null
    ) {
      return;
    }

    if (!socket) {
      console.error("Socket is not initialized");
      toast.error("Không thể kết nối đến máy chủ");
      return;
    }

    // Lấy thông tin người dùng từ sessionStorage
    const userSession = sessionStorage.getItem("user-session");
    const currentUserId = userSession
      ? JSON.parse(userSession).state.user.id
      : null;

    if (!currentUserId) {
      console.error("User ID not found in session storage");
      toast.error("Không tìm thấy thông tin người dùng");
      return;
    }

    // Hiển thị trạng thái đang tải
    const toastId = toast.loading("Đang mở cuộc trò chuyện...");

    // Emit sự kiện tạo conversation
    socket.emit("create_conversation", {
      IDSender: currentUserId,
      IDReceiver: contact.id,
    });

    // Thêm timeout để tránh đợi quá lâu
    const timeout = setTimeout(() => {
      toast.dismiss(toastId);
      toast.error("Timeout - Không thể tạo cuộc trò chuyện");
    }, 8000); // 8 giây timeout

    // Lắng nghe phản hồi từ server
    socket.once("create_conversation_response", (response) => {
      clearTimeout(timeout);
      toast.dismiss(toastId);

      if (response.success) {
        // Lưu ID cuộc trò chuyện vào localStorage
        localStorage.setItem(
          "selectedConversationId",
          response.conversation.idConversation
        );

        // Chuyển hướng đến trang chat nhanh hơn
        window.location.href = "/chat";
      } else {
        toast.error(response.message || "Không thể tạo cuộc trò chuyện");
      }
    });
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header with correct count */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          Liên hệ ({allContactGroups.flatMap((g) => g.contacts).length})
        </h2>
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
              <select
                className="border-none bg-transparent pr-8 py-2 text-sm focus:ring-0"
                value={sortOrder}
                onChange={handleSortChange}
              >
                <option value="asc">Tên (A-Z)</option>
                <option value="desc">Tên (Z-A)</option>
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
        {allContactGroups.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            {searchQuery ? "Không tìm thấy liên hệ" : "Chưa có liên hệ nào"}
          </div>
        ) : (
          allContactGroups.map((group) => (
            <div key={group.letter} className="mb-4">
              <div className="sticky top-0 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-500">
                {group.letter}
              </div>
              <div className="space-y-1">
                {group.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center justify-between px-4 py-2 hover:bg-gray-100 ${
                      contact.isBlocked ? "relative" : ""
                    }`}
                  >
                    {/* Phần thông tin người dùng */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center cursor-pointer"
                            onClick={(e) => {
                              handleContactClick(contact, e);
                            }}
                          >
                            <div className="relative mr-3">
                              <img
                                src={contact.urlavatar || "/default-avatar.png"}
                                alt={contact.fullname}
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "/default-avatar.png";
                                }}
                              />
                              {/* Status indicator: blocked icon */}
                              {contact.isBlocked && (
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-red-500 flex items-center justify-center">
                                  <span className="text-white text-[8px]">
                                    🚫
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {contact.fullname}
                              </div>
                              <div className="text-sm text-gray-500">
                                {contact.phone ||
                                  contact.email ||
                                  "Không có thông tin liên hệ"}
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        {contact.isBlocked && (
                          <TooltipContent
                            side="top"
                            className="bg-gray-800 text-white"
                          >
                            <p>Bạn đã chặn người này</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                    {/* Phần dropdown menu tách biệt */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-200 rounded-full dropdown-trigger">
                          <MoreHorizontal className="w-5 h-5 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {contact.isBlocked ? (
                          <DropdownMenuItem
                            onClick={() => handleUnblockUser(contact.id)}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            <span>Bỏ chặn</span>
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleBlockUser(contact.id)}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              <span>Chặn người này</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setConfirmDialogOpen(true);
                                setFriendToRemove(contact);
                              }}
                            >
                              <UserX className="w-4 h-4 mr-2 text-red-600" />
                              <span className="text-red-600">Xóa bạn</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <AlertDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) {
            // Khi dialog đóng, reset các state
            setFriendToRemove(null);
            setIsProcessing(false);

            // Reset pointer-events ngay lập tức
            document.body.style.pointerEvents = "auto";

            // Đảm bảo không có overlay nào còn tồn tại
            setTimeout(() => {
              document.body.style.pointerEvents = "auto";
            }, 300); // Tăng thời gian timeout
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa bạn</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {friendToRemove?.fullname} khỏi danh
              sách bạn bè không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                // Đảm bảo reset state khi nhấn Hủy
                setIsProcessing(false);
                setFriendToRemove(null);
                setConfirmDialogOpen(false);

                // Đảm bảo không có overlay nào còn tồn tại
                setTimeout(() => {
                  document.body.style.pointerEvents = "auto";
                }, 100);
              }}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (friendToRemove) {
                  handleRemoveFriend(friendToRemove.id);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Xóa bạn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
