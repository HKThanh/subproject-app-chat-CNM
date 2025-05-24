"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import ProfileModalWrapper from "@/components/user/profile-modal-wrapper";
import { logoutUser } from "@/actions/authActions";
import { getAuthToken } from "@/utils/auth-utils";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Users,
  Cloud,
  CheckSquare,
  FolderOpen,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useUserStore from "@/stores/useUserStoree";
import { useChat } from "@/socket/useChat";

export default function NavigationSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeItem, setActiveItem] = useState("messages");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Lấy thông tin người dùng từ Zustand store
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const userId = user?.id || session?.user?.id || "";

  const { conversations } = useChat(userId);
  
  // Calculate total unread messages
  const totalUnreadMessages = conversations.reduce((total, conversation) => {
    return total + (conversation.unreadCount || 0);
  }, 0);

  // Fallback values nếu chưa có thông tin người dùng
  const userName = user?.fullname || session?.user?.fullname || "User";
  const userEmail = user?.email || session?.user?.email || "";
  const userAvatar = (user?.urlavatar?.toString() ||
    session?.user?.urlavatar?.toString() ||
    `https://ui-avatars.com/api/?name=${userName}`) as string;

  // Hàm xử lý đăng xuất
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      // Lấy token xác thực
      const token = await getAuthToken();

      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      // Gọi API đăng xuất
      const result = await logoutUser(token);

      if (result.success) {
        // Xóa dữ liệu người dùng trong Zustand
        clearUser();

        // Đăng xuất khỏi NextAuth
        await signOut({ redirect: false });

        // Thông báo thành công
        toast.success(result.message || "Đăng xuất thành công!");

        // Chuyển hướng về trang đăng nhập
        router.push("/auth/login");
      } else {
        throw new Error(result.message || "Đăng xuất thất bại");
      }
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      toast.error(
        error instanceof Error ? error.message : "Đã xảy ra lỗi khi đăng xuất"
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = (id: string) => {
    setActiveItem(id);
    if (id === "contacts") {
      console.log("Navigating to contacts");
      router.push("/contacts");
    } else if (id === "messages") {
      console.log("Navigating to chat");
      router.push("/chat");
    }
    // Add other navigation cases as needed
  };

  const navigationItems = [
    { id: "messages", icon: MessageSquare, label: "Tin nhắn", badge: totalUnreadMessages > 0 ? totalUnreadMessages : null },
    { id: "contacts", icon: Users, label: "Danh bạ" },
    // { id: "tasks", icon: CheckSquare, label: "Công việc" },
    // { id: "cloud", icon: Cloud, label: "Cloud" },
    // { id: "documents", icon: FolderOpen, label: "Tài liệu" },
  ];

  // Xử lý đóng modal profile
  const handleCloseModal = () => {
    setIsProfileModalOpen(false);
  };

  // Xử lý mở modal profile và đóng dropdown
  const handleOpenProfileModal = () => {
    // Đóng dropdown trước khi mở modal
    setIsDropdownOpen(false);
    // Sau đó mở modal
    setTimeout(() => {
      setIsProfileModalOpen(true);
    }, 100);
  };

  useEffect(() => {
    if (pathname === "/contacts") {
      setActiveItem("contacts");
    } else if (pathname === "/chat") {
      setActiveItem("messages");
    }
  }, [pathname]);

  return (
    <>
      <div className="fixed left-0 top-0 h-screen w-[70px] bg-[#2563eb] flex flex-col items-center py-4">
        {/* Avatar */}
        <div className="mb-8">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-10 w-10 border-2 border-white hover:opacity-90 transition-opacity cursor-pointer">
                <AvatarImage src={userAvatar} alt={`${userName}'s avatar`} />
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <div className="p-2">
                <p className="font-semibold">{userName}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleOpenProfileModal}>
                <User className="mr-2 h-4 w-4" />
                Trang cá nhân
              </DropdownMenuItem>
              {/* <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Cài đặt
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-4">
          <TooltipProvider>
            {navigationItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    className={`relative p-3 rounded-lg hover:bg-[#1d4ed8] transition-colors ${
                      activeItem === item.id ? "bg-[#1d4ed8]" : ""
                    }`}
                    onClick={() => handleNavigation(item.id)}
                  >
                    <item.icon className="h-6 w-6 text-white" />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModalWrapper
        isOpen={isProfileModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
